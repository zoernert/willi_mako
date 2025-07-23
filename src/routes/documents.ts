import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { WorkspaceService } from '../services/workspaceService';
import { DocumentProcessorService } from '../services/documentProcessor';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const workspaceService = new WorkspaceService();
const documentProcessor = new DocumentProcessorService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    const userDir = path.join(uploadDir, 'user-documents');
    
    // Create directories if they don't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter to allow only specific file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];
  
  const allowedExtensions = ['.pdf', '.txt', '.md', '.docx', '.doc'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Allowed types: PDF, TXT, MD, DOCX, DOC'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '50') * 1024 * 1024 // 50MB default
  }
});

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * GET /api/documents
 * Get all documents for the authenticated user with pagination
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const search = req.query.search as string;
    const processed = req.query.processed as string;

    // Calculate offset from page
    const offset = (page - 1) * limit;

    // Get documents with filters
    const documents = await workspaceService.getUserDocuments(userId, {
      limit,
      offset,
      is_processed: processed !== undefined ? processed === 'true' : undefined
    });

    // For now, return a simple structure - we can optimize the count later
    const totalPages = Math.ceil((documents?.length || 0) / limit) || 1;

    return res.json({
      documents: documents || [],
      total: documents?.length || 0,
      page,
      totalPages
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ 
      documents: [],
      total: 0,
      page: 1,
      totalPages: 1
    });
  }
});

/**
 * POST /api/documents/upload
 * Upload and process a document
 */
router.post('/upload', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, description, tags, is_ai_context_enabled } = req.body;

    // Parse tags if provided
    let parsedTags: string[] = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (error) {
        parsedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : [];
      }
    }

    // Check storage limit
    const hasSpace = await workspaceService.checkStorageLimit(userId, req.file.size);
    if (!hasSpace) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(413).json({ error: 'Storage limit exceeded' });
    }

    // Create document record
    const documentData = {
      title: title || req.file.originalname,
      description: description || '',
      file_path: req.file.path,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      original_name: req.file.originalname,
      tags: parsedTags,
      is_ai_context_enabled: is_ai_context_enabled === 'true' || is_ai_context_enabled === true
    };

    const document = await workspaceService.createDocument(userId, documentData);

    // Start processing in background
    documentProcessor.processUserDocument(document.id, userId)
      .catch(error => {
        console.error('Error processing document:', error);
      });

    res.status(201).json({
      ...document,
      processing_started: true,
      message: 'Document uploaded successfully, processing started'
    });
    return;
  } catch (error) {
      console.error('Error uploading document:', error);
      
      // Clean up uploaded file if error occurs
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage === 'Storage limit exceeded') {
        return res.status(413).json({ error: 'Storage limit exceeded' });
      }
      
      return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/documents/upload-multiple
 * Upload multiple documents
 */
router.post('/upload-multiple', upload.array('files', 10), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { is_ai_context_enabled } = req.body;
    const results = [];
    const errors = [];

    // Process each file
    for (const file of files) {
      try {
        // Check storage limit for each file
        const hasSpace = await workspaceService.checkStorageLimit(userId, file.size);
        if (!hasSpace) {
          fs.unlinkSync(file.path);
          errors.push({ file: file.originalname, error: 'Storage limit exceeded' });
          continue;
        }

        // Create document record
        const documentData = {
          title: file.originalname,
          description: '',
          file_path: file.path,
          file_size: file.size,
          mime_type: file.mimetype,
          original_name: file.originalname,
          tags: [],
          is_ai_context_enabled: is_ai_context_enabled === 'true' || is_ai_context_enabled === true
        };

        const document = await workspaceService.createDocument(userId, documentData);
        results.push(document);

        // Start processing in background
        documentProcessor.processUserDocument(document.id, userId)
          .catch(error => {
            console.error('Error processing document:', error);
          });

      } catch (error) {
        console.error('Error processing file:', file.originalname, error);
        
        // Clean up file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ file: file.originalname, error: errorMessage });
      }
    }

    return res.status(201).json({
      uploaded: results,
      errors: errors,
      message: `${results.length} documents uploaded successfully, ${errors.length} errors`
    });

  } catch (error) {
    console.error('Error uploading multiple documents:', error);
    
    // Clean up any uploaded files
    const files = req.files as Express.Multer.File[];
    if (files) {
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/documents/:id/download
 * Download document file
 */
router.get('/:id/download', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const documentId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get document
    const document = await workspaceService.getDocumentById(documentId, userId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if file exists
    if (!document.file_path || !fs.existsSync(document.file_path)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Send file
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    return res.sendFile(path.resolve(document.file_path));

  } catch (error) {
    console.error('Error downloading document:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/documents/:id/preview
 * Stream document content for preview (for DocumentPreview component)
 */
router.get('/:id/preview', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const documentId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get document info
    const document = await workspaceService.getUserDocument(userId, documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Validate required fields
    if (!document.file_path || !document.mime_type) {
      return res.status(500).json({ error: 'Document metadata incomplete' });
    }

    const filePath = path.resolve(document.file_path);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Set appropriate headers based on file type
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${document.original_name}"`);
    
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming file' });
      }
    });

    return stream.pipe(res);

  } catch (error) {
    console.error('Error streaming document:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    return;
  }
});

/**
 * Error handler for multer
 */
router.use((error: any, req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({ error: 'Too many files' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field' });
    }
  }
  
  if (error.message.includes('Unsupported file type')) {
    return res.status(400).json({ error: error.message });
  }
  
  return next(error);
});

export default router;
