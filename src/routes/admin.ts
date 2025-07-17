import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import pool from '../config/database';
import QdrantService from '../services/qdrant';
import GeminiService from '../services/gemini';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Admin middleware for all routes
router.use(requireAdmin);

// Get all users
router.get('/users', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const users = await pool.query(
    'SELECT id, email, full_name, company, role, created_at FROM users ORDER BY created_at DESC'
  );
  
  res.json({
    success: true,
    data: users.rows
  });
}));

// Get user details
router.get('/users/:userId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  
  const user = await pool.query(
    'SELECT id, email, full_name, company, role, created_at FROM users WHERE id = $1',
    [userId]
  );
  
  if (user.rows.length === 0) {
    throw new AppError('User not found', 404);
  }
  
  // Get user stats
  const stats = await pool.query(
    'SELECT COUNT(DISTINCT c.id) as total_chats, COUNT(m.id) as total_messages FROM chats c LEFT JOIN messages m ON c.id = m.chat_id WHERE c.user_id = $1',
    [userId]
  );
  
  res.json({
    success: true,
    data: {
      user: user.rows[0],
      stats: stats.rows[0]
    }
  });
}));

// Update user role
router.put('/users/:userId/role', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;
  
  if (!['user', 'admin'].includes(role)) {
    throw new AppError('Invalid role', 400);
  }
  
  const result = await pool.query(
    'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, full_name, role',
    [role, userId]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }
  
  res.json({
    success: true,
    data: result.rows[0]
  });
}));

// Get all documents
router.get('/documents', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const documents = await pool.query(
    'SELECT d.*, u.full_name as uploaded_by_name FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id ORDER BY d.created_at DESC'
  );
  
  res.json({
    success: true,
    data: documents.rows
  });
}));

// Upload document
router.post('/documents', upload.single('file'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { title, description } = req.body;
  const file = req.file;
  
  if (!file) {
    throw new AppError('File is required', 400);
  }
  
  if (!title) {
    throw new AppError('Title is required', 400);
  }
  
  try {
    // Parse PDF content
    const pdfBuffer = fs.readFileSync(file.path);
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;
    
    // Create document in database
    const document = await pool.query(
      'INSERT INTO documents (title, description, file_path, file_size, mime_type, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, description, file_size, created_at',
      [title, description, file.path, file.size, file.mimetype, req.user!.id]
    );
    
    // Process text for vector storage
    await processDocumentForVectorStorage(document.rows[0].id, text, title);
    
    res.status(201).json({
      success: true,
      data: document.rows[0]
    });
  } catch (error) {
    // Clean up file if processing fails
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    console.error('Error processing document:', error);
    throw new AppError('Failed to process document', 500);
  }
}));

// Process document for vector storage
async function processDocumentForVectorStorage(documentId: string, text: string, title: string) {
  try {
    // Split text into chunks
    const chunks = splitTextIntoChunks(text, 1000);
    
    const points = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await GeminiService.generateEmbedding(chunk);
      
      points.push({
        id: `${documentId}-chunk-${i}`,
        vector: embedding,
        payload: {
          text: chunk,
          source: title,
          documentId: documentId,
          chunkIndex: i,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Insert into Qdrant
    await QdrantService.insertPoints(points);
    
    console.log(`Processed ${points.length} chunks for document ${documentId}`);
  } catch (error) {
    console.error('Error processing document for vector storage:', error);
    throw error;
  }
}

// Split text into chunks
function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '.';
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Update document
router.put('/documents/:documentId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { documentId } = req.params;
  const { title, description, isActive } = req.body;
  
  const result = await pool.query(
    'UPDATE documents SET title = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, title, description, is_active',
    [title, description, isActive, documentId]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Document not found', 404);
  }
  
  res.json({
    success: true,
    data: result.rows[0]
  });
}));

// Delete document
router.delete('/documents/:documentId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { documentId } = req.params;
  
  // Get document info
  const document = await pool.query(
    'SELECT file_path FROM documents WHERE id = $1',
    [documentId]
  );
  
  if (document.rows.length === 0) {
    throw new AppError('Document not found', 404);
  }
  
  // Delete from database
  await pool.query('DELETE FROM documents WHERE id = $1', [documentId]);
  
  // Delete file from filesystem
  const filePath = document.rows[0].file_path;
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  
  // Delete from vector database
  try {
    // Find and delete all chunks for this document
    const vectorIds = await findDocumentVectorIds(documentId);
    if (vectorIds.length > 0) {
      await QdrantService.deletePoints(vectorIds);
    }
  } catch (error) {
    console.error('Error deleting vectors:', error);
    // Continue even if vector deletion fails
  }
  
  res.json({
    success: true,
    message: 'Document deleted successfully'
  });
}));

// Find vector IDs for a document
async function findDocumentVectorIds(documentId: string): Promise<string[]> {
  // This is a simplified approach - in production you'd need a more sophisticated way to track vector IDs
  const ids = [];
  let chunkIndex = 0;
  
  // Try to find chunks (this is a basic approach)
  while (chunkIndex < 1000) { // Reasonable upper limit
    const id = `${documentId}-chunk-${chunkIndex}`;
    ids.push(id);
    chunkIndex++;
    
    // Break if we've tried many chunks
    if (chunkIndex > 100) break;
  }
  
  return ids;
}

// Get system stats
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users');
  const totalDocuments = await pool.query('SELECT COUNT(*) as count FROM documents');
  const totalChats = await pool.query('SELECT COUNT(*) as count FROM chats');
  const totalMessages = await pool.query('SELECT COUNT(*) as count FROM messages');
  
  const recentUsers = await pool.query(
    'SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL \'30 days\''
  );
  
  const recentChats = await pool.query(
    'SELECT COUNT(*) as count FROM chats WHERE created_at > NOW() - INTERVAL \'30 days\''
  );
  
  res.json({
    success: true,
    data: {
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalDocuments: parseInt(totalDocuments.rows[0].count),
      totalChats: parseInt(totalChats.rows[0].count),
      totalMessages: parseInt(totalMessages.rows[0].count),
      recentUsers: parseInt(recentUsers.rows[0].count),
      recentChats: parseInt(recentChats.rows[0].count)
    }
  });
}));

// Get chat overview
router.get('/chats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const chats = await pool.query(
    `SELECT c.id, c.title, c.created_at, c.updated_at, u.full_name as user_name, u.email as user_email,
     COUNT(m.id) as message_count
     FROM chats c
     JOIN users u ON c.user_id = u.id
     LEFT JOIN messages m ON c.id = m.chat_id
     GROUP BY c.id, c.title, c.created_at, c.updated_at, u.full_name, u.email
     ORDER BY c.updated_at DESC
     LIMIT 50`
  );
  
  res.json({
    success: true,
    data: chats.rows
  });
}));

// Markdown editor endpoint for admin
router.post('/markdown/preview', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { content } = req.body;
  
  if (!content) {
    throw new AppError('Content is required', 400);
  }
  
  // In a real implementation, you'd use a markdown parser like 'marked'
  // For now, we'll just return the content as-is
  res.json({
    success: true,
    data: {
      html: content // This would be parsed markdown in production
    }
  });
}));

export default router;
