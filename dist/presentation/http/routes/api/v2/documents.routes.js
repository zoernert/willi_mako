"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../../../../../middleware/auth");
const errorHandler_1 = require("../../../../../middleware/errorHandler");
const documentService_1 = require("../../../../../services/documentService");
const workspaceService_1 = require("../../../../../services/workspaceService");
const router = (0, express_1.Router)();
const documentService = new documentService_1.DocumentService();
const workspaceService = new workspaceService_1.WorkspaceService();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/user-documents/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        const name = path_1.default.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown'
    ];
    const allowedExtensions = ['.pdf', '.docx', '.txt', '.md'];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new errorHandler_1.AppError('Unsupported file type. Allowed: PDF, DOCX, TXT, MD', 400));
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '50', 10) * 1024 * 1024 // Default 50MB
    }
});
/**
 * POST /api/v2/documents/upload
 * Upload a single document
 */
router.post('/upload', auth_1.authenticateToken, upload.single('file'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    if (!req.file) {
        throw new errorHandler_1.AppError('No file uploaded', 400);
    }
    const { title, description, tags, is_ai_context_enabled } = req.body;
    // Parse tags if provided as string
    let parsedTags = [];
    if (tags) {
        try {
            parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        }
        catch (_b) {
            parsedTags = typeof tags === 'string' ? [tags] : [];
        }
    }
    const document = await documentService.createDocument(userId, {
        file: req.file,
        title: title || req.file.originalname,
        description,
        tags: parsedTags,
        is_ai_context_enabled: is_ai_context_enabled === 'true' || is_ai_context_enabled === true,
    });
    // Asynchronously process and index the document
    documentService.processAndIndexDocument(document.id, userId).catch(err => {
        console.error('Background document processing failed:', err);
    });
    res.status(201).json({
        success: true,
        data: {
            document,
            message: 'Document uploaded successfully. Processing has started.'
        }
    });
}));
/**
 * POST /api/v2/documents/upload-multiple
 * Upload multiple documents
 */
router.post('/upload-multiple', auth_1.authenticateToken, upload.array('files', 10), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const files = req.files;
    if (!files || files.length === 0) {
        throw new errorHandler_1.AppError('No files uploaded', 400);
    }
    const { is_ai_context_enabled } = req.body;
    const documents = await Promise.all(files.map(file => documentService.createDocument(userId, {
        file,
        title: file.originalname,
        is_ai_context_enabled: is_ai_context_enabled === 'true' || is_ai_context_enabled === true,
    })));
    // Asynchronously process and index each document
    documents.forEach((doc) => {
        documentService.processAndIndexDocument(doc.id, userId).catch(err => {
            console.error(`Background processing failed for document ${doc.id}:`, err);
        });
    });
    res.status(201).json({
        success: true,
        data: {
            documents,
            message: `${documents.length} document${documents.length > 1 ? 's' : ''} uploaded successfully. Processing has started.`
        }
    });
}));
/**
 * GET /api/v2/documents
 * Get all documents for the user
 */
router.get('/', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const { page = '1', limit = '12', search, processed } = req.query;
    const documents = await documentService.getUserDocuments(userId, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        search: search,
        processed: processed ? processed === 'true' : undefined,
    });
    res.json({
        success: true,
        data: documents
    });
}));
/**
 * GET /api/v2/documents/:id
 * Get a single document by ID
 */
router.get('/:id', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const document = await documentService.getDocumentById(req.params.id, userId);
    if (!document) {
        throw new errorHandler_1.AppError('Document not found', 404);
    }
    res.json({
        success: true,
        data: document
    });
}));
/**
 * PUT /api/v2/documents/:id
 * Update document metadata
 */
router.put('/:id', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const document = await documentService.updateDocument(req.params.id, userId, req.body);
    res.json({
        success: true,
        data: document
    });
}));
/**
 * DELETE /api/v2/documents/:id
 * Delete a document
 */
router.delete('/:id', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    await documentService.deleteDocument(req.params.id, userId);
    res.status(204).send();
}));
/**
 * GET /api/v2/documents/:id/download
 * Download a document
 */
router.get('/:id/download', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const document = await documentService.getDocumentById(req.params.id, userId);
    if (!document || !document.file_path) {
        throw new errorHandler_1.AppError('Document not found', 404);
    }
    res.download(path_1.default.resolve(document.file_path), document.original_name);
}));
/**
 * POST /api/v2/documents/:id/reprocess
 * Reprocess a document
 */
router.post('/:id/reprocess', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    await documentService.processAndIndexDocument(req.params.id, userId);
    res.json({
        success: true,
        data: {
            message: 'Document reprocessing started.'
        }
    });
}));
/**
 * POST /api/v2/documents/:id/ai-context
 * Toggle AI context for a document
 */
router.post('/:id/ai-context', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new errorHandler_1.AppError('User not authenticated', 401);
    }
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
        throw new errorHandler_1.AppError('enabled must be a boolean', 400);
    }
    const document = await documentService.updateDocument(req.params.id, userId, {
        is_ai_context_enabled: enabled
    });
    res.json({
        success: true,
        data: document
    });
}));
exports.default = router;
//# sourceMappingURL=documents.routes.js.map