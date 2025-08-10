"use strict";
// Community Admin API Routes
// CR-COMMUNITY-HUB-001 - Meilenstein 2
// Autor: AI Assistant
// Datum: 2025-08-09
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeCommunityAdminRoutes = void 0;
const express_1 = __importDefault(require("express"));
const CommunityService_1 = require("../../services/CommunityService");
const auth_1 = require("../../middleware/auth");
const featureFlags_1 = require("../../utils/featureFlags");
const database_1 = __importDefault(require("../../config/database"));
const router = express_1.default.Router();
// Initialize service (will be set by factory function)
let communityService;
/**
 * Initialize community admin routes with database pool
 */
const initializeCommunityAdminRoutes = (db) => {
    communityService = new CommunityService_1.CommunityService(db);
    return router;
};
exports.initializeCommunityAdminRoutes = initializeCommunityAdminRoutes;
// Apply community feature flag check and admin authentication
router.use(featureFlags_1.requireCommunityFeature);
router.use(auth_1.authenticateToken);
// Admin role check middleware
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};
router.use(requireAdmin);
/**
 * POST /api/admin/community/create-faq-from-thread
 * Create FAQ from finalized community thread
 */
router.post('/create-faq-from-thread', async (req, res) => {
    try {
        const adminUserId = req.user.id;
        const { threadId, customTitle, customTags } = req.body;
        if (!threadId) {
            return res.status(400).json({
                success: false,
                message: 'threadId is required'
            });
        }
        // Get prepared FAQ data from community service
        const faqData = await communityService.createFaqFromThread(threadId, adminUserId);
        // Override with custom data if provided
        if (customTitle) {
            faqData.title = customTitle;
        }
        if (customTags && Array.isArray(customTags)) {
            faqData.tags = customTags;
        }
        // Create the FAQ in the database using the same pattern as faq.ts
        const faqResult = await database_1.default.query(`
      INSERT INTO faqs (
        title, description, context, answer, additional_info, tags,
        created_by, created_at, updated_at, is_active, is_public,
        source_thread_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), true, true, $8)
      RETURNING *
    `, [
            faqData.title,
            faqData.description,
            faqData.context,
            faqData.answer,
            faqData.additionalInfo || '',
            JSON.stringify(faqData.tags),
            adminUserId,
            threadId
        ]);
        const createdFaq = faqResult.rows[0];
        // TODO: Add FAQ to vector store for semantic search
        // const qdrantService = new QdrantService();
        // await qdrantService.addFaqToCollection(createdFaq);
        // Update thread status to final since it's now converted to FAQ
        await communityService.updateStatus(threadId, 'final', adminUserId, true);
        res.status(201).json({
            success: true,
            data: {
                faq: createdFaq,
                message: 'FAQ created successfully from community thread'
            }
        });
    }
    catch (error) {
        console.error('Error creating FAQ from thread:', error);
        if (error.message.includes('not found') || error.message.includes('must be in final')) {
            res.status(422).json({
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
 * DELETE /api/admin/community/threads/:id
 * Delete a community thread (admin only)
 */
router.delete('/threads/:id', async (req, res) => {
    try {
        const threadId = req.params.id;
        const adminUserId = req.user.id;
        // First check if thread exists
        const thread = await communityService.getThread(threadId);
        if (!thread) {
            return res.status(404).json({
                success: false,
                message: 'Thread not found'
            });
        }
        // Delete the thread (this will cascade delete comments, initiatives, etc.)
        await communityService.deleteThread(threadId, adminUserId);
        // TODO: Remove from Qdrant vector store
        // const qdrantService = new QdrantService();
        // await qdrantService.deleteThreadVectors(threadId);
        res.json({
            success: true,
            message: 'Thread successfully deleted'
        });
    }
    catch (error) {
        console.error('Error deleting thread:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
/**
 * GET /api/admin/community/stats
 * Get community statistics for admin dashboard
 */
router.get('/stats', async (req, res) => {
    try {
        // Get basic stats from the service
        const discussingThreads = await communityService.listThreads(1, 1000, { status: 'discussing' });
        const reviewThreads = await communityService.listThreads(1, 1000, { status: 'review' });
        const finalThreads = await communityService.listThreads(1, 1000, { status: 'final' });
        // Get initiatives count
        const initiatives = await communityService.listInitiatives(1, 1000);
        // TODO: Get FAQ count from FAQs with source='community' or source_thread_id IS NOT NULL
        // For now, we'll use a placeholder value
        const totalFAQsFromCommunity = 0;
        // Recent activity placeholder - in a real implementation, you'd query an activity log
        const recentActivity = [];
        const stats = {
            totalThreads: discussingThreads.total + reviewThreads.total + finalThreads.total,
            discussingThreads: discussingThreads.total,
            reviewThreads: reviewThreads.total,
            finalThreads: finalThreads.total,
            totalInitiatives: initiatives.total,
            totalFAQsFromCommunity,
            recentActivity
        };
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error getting community stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
/**
 * GET /api/admin/community/threads
 * Get all threads for admin management (with extended info)
 */
router.get('/threads', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const filters = {};
        if (req.query.status) {
            filters.status = req.query.status;
        }
        if (req.query.search) {
            filters.search = req.query.search;
        }
        const result = await communityService.listThreads(page, limit, filters);
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
        console.error('Error listing threads for admin:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
/**
 * PUT /api/admin/community/threads/:id/force-status
 * Force status change (admin override)
 */
router.put('/threads/:id/force-status', async (req, res) => {
    try {
        const adminUserId = req.user.id;
        const threadId = req.params.id;
        const { status } = req.body;
        // Admin can force any status transition
        const thread = await communityService.updateStatus(threadId, status, adminUserId, true);
        res.json({
            success: true,
            data: { status: thread.status },
            message: `Status forcefully changed to ${status}`
        });
    }
    catch (error) {
        console.error('Error forcing status change:', error);
        if (error.message.includes('not found')) {
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
 * GET /api/admin/community/initiatives
 * Get all community initiatives for admin management
 */
router.get('/initiatives', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const result = await communityService.listInitiatives(page, limit);
        res.json({
            success: true,
            data: result.initiatives,
            meta: {
                total: result.total,
                page,
                limit,
                totalPages: Math.ceil(result.total / limit)
            }
        });
    }
    catch (error) {
        console.error('Error getting initiatives:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=community.js.map