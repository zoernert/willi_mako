"use strict";
// Community API Routes
// CR-COMMUNITY-HUB-001 - Meilenstein 1 & 2
// Autor: AI Assistant
// Datum: 2025-08-09
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeCommunityRoutes = void 0;
const express_1 = __importDefault(require("express"));
const CommunityService_1 = require("../services/CommunityService");
const auth_1 = require("../middleware/auth");
const featureFlags_1 = require("../utils/featureFlags");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = express_1.default.Router();
// Rate limiting configurations
const threadCreationLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 threads per hour
    message: { success: false, message: 'Too many threads created. Try again later.' },
    keyGenerator: (req) => { var _a; return (((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || req.ip); }
});
const documentUpdateLimit = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // 30 patch operations per 5 minutes
    message: { success: false, message: 'Too many document updates. Try again later.' },
    keyGenerator: (req) => { var _a; return (((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || req.ip); }
});
const commentLimit = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 comments per 5 minutes
    message: { success: false, message: 'Too many comments. Try again later.' },
    keyGenerator: (req) => { var _a; return (((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || req.ip); }
});
// Initialize service (will be set by factory function)
let communityService;
/**
 * Initialize community routes with database pool
 */
const initializeCommunityRoutes = (db) => {
    communityService = new CommunityService_1.CommunityService(db);
    return router;
};
exports.initializeCommunityRoutes = initializeCommunityRoutes;
// Apply community feature flag check to all routes
router.use(featureFlags_1.requireCommunityFeature);
/**
 * GET /api/community/threads
 * List community threads with filtering and pagination
 */
router.get('/threads', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Check read permissions
        if (!(0, featureFlags_1.canReadCommunity)(!!userId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const filters = {};
        if (req.query.status) {
            filters.status = req.query.status;
        }
        if (req.query.tags) {
            filters.tags = req.query.tags.split(',').map(t => t.trim());
        }
        if (req.query.search) {
            filters.search = req.query.search;
        }
        const result = await communityService.listThreads(page, limit, filters, userId);
        res.json({
            success: true,
            data: result.threads,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: Math.ceil(result.total / result.limit)
            }
        });
    }
    catch (error) {
        console.error('Error listing threads:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
/**
 * POST /api/community/threads
 * Create a new community thread
 */
router.post('/threads', auth_1.authenticateToken, threadCreationLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, initialContent, tags } = req.body;
        const thread = await communityService.createThread({ title, initialContent, tags }, userId);
        res.status(201).json({
            success: true,
            data: thread
        });
    }
    catch (error) {
        console.error('Error creating thread:', error);
        if (error.message.includes('validation') || error.message.includes('required')) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
});
/**
 * GET /api/community/threads/:id
 * Get a specific thread with full document
 */
router.get('/threads/:id', async (req, res) => {
    var _a;
    try {
        const threadId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const thread = await communityService.getThread(threadId, userId);
        if (!thread) {
            return res.status(404).json({
                success: false,
                message: 'Thread not found'
            });
        }
        res.json({
            success: true,
            data: thread
        });
    }
    catch (error) {
        console.error('Error getting thread:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
/**
 * PATCH /api/community/threads/:id/document
 * Update thread document using JSON patch operations
 */
router.patch('/threads/:id/document', auth_1.authenticateToken, documentUpdateLimit, async (req, res) => {
    try {
        const threadId = req.params.id;
        const userId = req.user.id;
        const { operations, version } = req.body;
        const result = await communityService.updateDocument(threadId, { operations, version }, userId);
        res.json({
            success: true,
            data: result.thread,
            changed: result.changed
        });
    }
    catch (error) {
        console.error('Error updating document:', error);
        if (error.message.includes('Version conflict')) {
            res.status(409).json({
                success: false,
                message: error.message,
                code: 'VERSION_CONFLICT'
            });
        }
        else if (error.message.includes('Access denied') || error.message.includes('not found')) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
        else if (error.message.includes('validation') || error.message.includes('Invalid')) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
});
/**
 * PUT /api/community/threads/:id/status
 * Update thread status
 */
router.put('/threads/:id/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const threadId = req.params.id;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';
        const { status } = req.body;
        const thread = await communityService.updateStatus(threadId, status, userId, isAdmin);
        res.json({
            success: true,
            data: { status: thread.status }
        });
    }
    catch (error) {
        console.error('Error updating status:', error);
        if (error.message.includes('Access denied') || error.message.includes('not found')) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
        else if (error.message.includes('Invalid')) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
});
/**
 * POST /api/community/threads/:id/comments
 * Create a comment on a thread section
 */
router.post('/threads/:id/comments', auth_1.authenticateToken, commentLimit, async (req, res) => {
    try {
        const threadId = req.params.id;
        const userId = req.user.id;
        const { blockId, content } = req.body;
        const comment = await communityService.createComment(threadId, blockId, content, userId);
        res.status(201).json({
            success: true,
            data: comment
        });
    }
    catch (error) {
        console.error('Error creating comment:', error);
        if (error.message.includes('Access denied') || error.message.includes('not found')) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
        else if (error.message.includes('validation') || error.message.includes('required')) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
});
/**
 * GET /api/community/threads/:id/comments
 * Get comments for a thread
 */
router.get('/threads/:id/comments', async (req, res) => {
    var _a;
    try {
        const threadId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const comments = await communityService.getCommentsForThread(threadId, userId);
        res.json({
            success: true,
            data: comments
        });
    }
    catch (error) {
        console.error('Error getting comments:', error);
        if (error.message.includes('Access denied') || error.message.includes('not found')) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
});
/**
 * GET /api/community/search
 * Search threads by semantic similarity
 */
router.get('/search', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Check read permissions
        if (!(0, featureFlags_1.canReadCommunity)(!!userId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        const query = req.query.q;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        if (!query || query.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Query must be at least 3 characters'
            });
        }
        const results = await communityService.searchThreads(query, limit);
        res.json({
            success: true,
            data: results
        });
    }
    catch (error) {
        console.error('Error searching threads:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=community.js.map