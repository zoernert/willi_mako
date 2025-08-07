"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const documentService_1 = require("../services/documentService");
const workspaceService_1 = require("../services/workspaceService");
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
const documentService = new documentService_1.DocumentService();
const workspaceService = new workspaceService_1.WorkspaceService();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    dest: 'uploads/user-documents/',
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});
router.use(auth_1.authenticateToken);
/**
 * POST /api/workspace/documents/upload
 * Upload a single document
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const { title, description, tags, is_ai_context_enabled } = req.body;
        const document = await documentService.createDocument(userId, {
            file: req.file,
            title: title || req.file.originalname,
            description,
            tags: tags ? JSON.parse(tags) : [],
            is_ai_context_enabled: is_ai_context_enabled === 'true',
        });
        // Asynchronously process and index the document
        documentService.processAndIndexDocument(document.id, userId);
        res.status(201).json({
            message: 'Document uploaded successfully. Processing has started.',
            document,
        });
    }
    catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /api/workspace/documents/upload-multiple
 * Upload multiple documents
 */
router.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        const { is_ai_context_enabled } = req.body;
        const documents = await Promise.all(files.map(file => documentService.createDocument(userId, {
            file,
            title: file.originalname,
            is_ai_context_enabled: is_ai_context_enabled === 'true',
        })));
        // Asynchronously process and index each document
        documents.forEach((doc) => documentService.processAndIndexDocument(doc.id, userId));
        res.status(201).json({
            message: `${documents.length} documents uploaded successfully. Processing has started.`,
            documents,
        });
    }
    catch (error) {
        console.error('Error uploading multiple documents:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/workspace/documents
 * Get all documents for the user
 */
router.get('/', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { page = 1, limit = 12, search, processed } = req.query;
        const documents = await documentService.getUserDocuments(userId, {
            page: Number(page),
            limit: Number(limit),
            search: search,
            processed: processed ? processed === 'true' : undefined,
        });
        res.json(documents);
    }
    catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/workspace/documents/:id
 * Get a single document by ID
 */
router.get('/:id', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const document = await documentService.getDocumentById(req.params.id, userId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.json(document);
    }
    catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * PUT /api/workspace/documents/:id
 * Update document metadata
 */
router.put('/:id', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const document = await documentService.updateDocument(req.params.id, userId, req.body);
        res.json(document);
    }
    catch (error) {
        console.error('Error updating document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * DELETE /api/workspace/documents/:id
 * Delete a document
 */
router.delete('/:id', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        await documentService.deleteDocument(req.params.id, userId);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/workspace/documents/:id/download
 * Download a document
 */
router.get('/:id/download', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const document = await documentService.getDocumentById(req.params.id, userId);
        if (!document || !document.file_path) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.download(path_1.default.resolve(document.file_path), document.original_name);
    }
    catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/workspace/documents/:id/preview
 * Get a preview of a document
 */
router.get('/:id/preview', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const document = await documentService.getDocumentById(req.params.id, userId);
        if (!document || !document.file_path) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.sendFile(path_1.default.resolve(document.file_path));
    }
    catch (error) {
        console.error('Error previewing document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /api/workspace/documents/:id/reprocess
 * Reprocess a document
 */
router.post('/:id/reprocess', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        await documentService.processAndIndexDocument(req.params.id, userId);
        res.json({ message: 'Document reprocessing started.' });
    }
    catch (error) {
        console.error('Error reprocessing document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /api/workspace/documents/:id/ai-context
 * Toggle AI context for a document
 */
router.post('/:id/ai-context', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { enabled } = req.body;
        const document = await documentService.updateDocument(req.params.id, userId, { is_ai_context_enabled: enabled });
        res.json(document);
    }
    catch (error) {
        console.error('Error toggling AI context:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=documents.js.map