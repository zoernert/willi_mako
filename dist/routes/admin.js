"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const database_1 = __importDefault(require("../config/database"));
const qdrant_1 = __importDefault(require("../services/qdrant"));
const gemini_1 = __importDefault(require("../services/gemini"));
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadPath)) {
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});
router.use(auth_1.requireAdmin);
router.get('/users', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const users = await database_1.default.query('SELECT id, email, full_name, company, role, created_at FROM users ORDER BY created_at DESC');
    res.json({
        success: true,
        data: users.rows
    });
}));
router.get('/users/:userId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const user = await database_1.default.query('SELECT id, email, full_name, company, role, created_at FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    const stats = await database_1.default.query('SELECT COUNT(DISTINCT c.id) as total_chats, COUNT(m.id) as total_messages FROM chats c LEFT JOIN messages m ON c.id = m.chat_id WHERE c.user_id = $1', [userId]);
    res.json({
        success: true,
        data: {
            user: user.rows[0],
            stats: stats.rows[0]
        }
    });
}));
router.put('/users/:userId/role', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
        throw new errorHandler_1.AppError('Invalid role', 400);
    }
    const result = await database_1.default.query('UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, full_name, role', [role, userId]);
    if (result.rows.length === 0) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    res.json({
        success: true,
        data: result.rows[0]
    });
}));
router.get('/documents', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const documents = await database_1.default.query('SELECT d.*, u.full_name as uploaded_by_name FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id ORDER BY d.created_at DESC');
    res.json({
        success: true,
        data: documents.rows
    });
}));
router.post('/documents', upload.single('file'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { title, description } = req.body;
    const file = req.file;
    if (!file) {
        throw new errorHandler_1.AppError('File is required', 400);
    }
    if (!title) {
        throw new errorHandler_1.AppError('Title is required', 400);
    }
    try {
        const pdfBuffer = fs_1.default.readFileSync(file.path);
        const pdfData = await (0, pdf_parse_1.default)(pdfBuffer);
        const text = pdfData.text;
        const document = await database_1.default.query('INSERT INTO documents (title, description, file_path, file_size, mime_type, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, description, file_size, created_at', [title, description, file.path, file.size, file.mimetype, req.user.id]);
        await processDocumentForVectorStorage(document.rows[0].id, text, title);
        res.status(201).json({
            success: true,
            data: document.rows[0]
        });
    }
    catch (error) {
        if (fs_1.default.existsSync(file.path)) {
            fs_1.default.unlinkSync(file.path);
        }
        console.error('Error processing document:', error);
        throw new errorHandler_1.AppError('Failed to process document', 500);
    }
}));
async function processDocumentForVectorStorage(documentId, text, title) {
    try {
        const chunks = splitTextIntoChunks(text, 1000);
        const points = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = await gemini_1.default.generateEmbedding(chunk);
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
        await qdrant_1.default.insertPoints(points);
        console.log(`Processed ${points.length} chunks for document ${documentId}`);
    }
    catch (error) {
        console.error('Error processing document for vector storage:', error);
        throw error;
    }
}
function splitTextIntoChunks(text, maxChunkSize) {
    const chunks = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let currentChunk = '';
    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize) {
            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
        }
        else {
            currentChunk += sentence + '.';
        }
    }
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}
router.put('/documents/:documentId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { documentId } = req.params;
    const { title, description, isActive } = req.body;
    const result = await database_1.default.query('UPDATE documents SET title = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, title, description, is_active', [title, description, isActive, documentId]);
    if (result.rows.length === 0) {
        throw new errorHandler_1.AppError('Document not found', 404);
    }
    res.json({
        success: true,
        data: result.rows[0]
    });
}));
router.delete('/documents/:documentId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { documentId } = req.params;
    const document = await database_1.default.query('SELECT file_path FROM documents WHERE id = $1', [documentId]);
    if (document.rows.length === 0) {
        throw new errorHandler_1.AppError('Document not found', 404);
    }
    await database_1.default.query('DELETE FROM documents WHERE id = $1', [documentId]);
    const filePath = document.rows[0].file_path;
    if (fs_1.default.existsSync(filePath)) {
        fs_1.default.unlinkSync(filePath);
    }
    try {
        const vectorIds = await findDocumentVectorIds(documentId);
        if (vectorIds.length > 0) {
            await qdrant_1.default.deletePoints(vectorIds);
        }
    }
    catch (error) {
        console.error('Error deleting vectors:', error);
    }
    res.json({
        success: true,
        message: 'Document deleted successfully'
    });
}));
async function findDocumentVectorIds(documentId) {
    const ids = [];
    let chunkIndex = 0;
    while (chunkIndex < 1000) {
        const id = `${documentId}-chunk-${chunkIndex}`;
        ids.push(id);
        chunkIndex++;
        if (chunkIndex > 100)
            break;
    }
    return ids;
}
router.get('/stats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const totalUsers = await database_1.default.query('SELECT COUNT(*) as count FROM users');
    const totalDocuments = await database_1.default.query('SELECT COUNT(*) as count FROM documents');
    const totalChats = await database_1.default.query('SELECT COUNT(*) as count FROM chats');
    const totalMessages = await database_1.default.query('SELECT COUNT(*) as count FROM messages');
    const recentUsers = await database_1.default.query('SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL \'30 days\'');
    const recentChats = await database_1.default.query('SELECT COUNT(*) as count FROM chats WHERE created_at > NOW() - INTERVAL \'30 days\'');
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
router.get('/chats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const chats = await database_1.default.query(`SELECT c.id, c.title, c.created_at, c.updated_at, u.full_name as user_name, u.email as user_email,
     COUNT(m.id) as message_count
     FROM chats c
     JOIN users u ON c.user_id = u.id
     LEFT JOIN messages m ON c.id = m.chat_id
     GROUP BY c.id, c.title, c.created_at, c.updated_at, u.full_name, u.email
     ORDER BY c.updated_at DESC
     LIMIT 50`);
    res.json({
        success: true,
        data: chats.rows
    });
}));
router.post('/markdown/preview', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { content } = req.body;
    if (!content) {
        throw new errorHandler_1.AppError('Content is required', 400);
    }
    res.json({
        success: true,
        data: {
            html: content
        }
    });
}));
router.get('/activity', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const activities = await database_1.default.query(`SELECT 
      'user_registered' as type,
      'Neuer Benutzer registriert: ' || full_name as description,
      created_at as timestamp
    FROM users
    WHERE created_at > NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT 
      'chat_created' as type,
      'Neuer Chat erstellt: ' || title as description,
      created_at as timestamp
    FROM chats
    WHERE created_at > NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT 
      'document_uploaded' as type,
      'Dokument hochgeladen: ' || title as description,
      created_at as timestamp
    FROM documents
    WHERE created_at > NOW() - INTERVAL '7 days'
    ORDER BY timestamp DESC
    LIMIT 20`);
    res.json({
        success: true,
        data: activities.rows
    });
}));
router.get('/stats/detailed', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const usersByRole = await database_1.default.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    const popularFAQs = await database_1.default.query('SELECT title, view_count FROM faqs WHERE is_active = true ORDER BY view_count DESC LIMIT 10');
    const chatsByMonth = await database_1.default.query(`SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as count
    FROM chats
    WHERE created_at > NOW() - INTERVAL '6 months'
    GROUP BY month
    ORDER BY month`);
    const messagesByDay = await database_1.default.query(`SELECT 
      DATE_TRUNC('day', created_at) as day,
      COUNT(*) as count
    FROM messages
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY day
    ORDER BY day`);
    res.json({
        success: true,
        data: {
            usersByRole: usersByRole.rows,
            popularFAQs: popularFAQs.rows,
            chatsByMonth: chatsByMonth.rows,
            messagesByDay: messagesByDay.rows
        }
    });
}));
router.delete('/users/:userId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    if (userId === req.user.id) {
        throw new errorHandler_1.AppError('Cannot delete your own account', 400);
    }
    const user = await database_1.default.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    await database_1.default.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({
        success: true,
        message: 'User deleted successfully'
    });
}));
router.get('/settings', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        success: true,
        data: {
            systemName: process.env.SYSTEM_NAME || 'Willi Mako',
            systemDescription: process.env.SYSTEM_DESCRIPTION || 'Intelligentes FAQ-System mit KI-Unterstützung',
            maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '50'),
            enableRegistration: process.env.ENABLE_REGISTRATION !== 'false',
            enableGuestAccess: process.env.ENABLE_GUEST_ACCESS === 'true',
            geminiApiKey: process.env.GEMINI_API_KEY ? '***' : '',
            qdrantUrl: process.env.QDRANT_URL || '',
            qdrantApiKey: process.env.QDRANT_API_KEY ? '***' : '',
            smtpHost: process.env.SMTP_HOST || '',
            smtpPort: parseInt(process.env.SMTP_PORT || '587'),
            smtpUser: process.env.SMTP_USER || '',
            smtpPassword: process.env.SMTP_PASSWORD ? '***' : '',
            enableEmailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true'
        }
    });
}));
router.put('/settings', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const settings = req.body;
    res.json({
        success: true,
        message: 'Settings updated successfully'
    });
}));
router.post('/settings/test-qdrant', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        await qdrant_1.default.testConnection();
        res.json({
            success: true,
            message: 'Qdrant connection successful'
        });
    }
    catch (error) {
        throw new errorHandler_1.AppError('Qdrant connection failed', 500);
    }
}));
router.post('/settings/test-smtp', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        success: true,
        message: 'SMTP connection test not implemented'
    });
}));
exports.default = router;
//# sourceMappingURL=admin.js.map