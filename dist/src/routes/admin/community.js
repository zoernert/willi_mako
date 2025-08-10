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
        const { threadId } = req.body;
        if (!threadId) {
            return res.status(400).json({
                success: false,
                message: 'threadId is required'
            });
        }
        // Get prepared FAQ data from community service
        const faqData = await communityService.createFaqFromThread(threadId, adminUserId);
        // Here we would call the existing FAQ service to actually create the FAQ
        // For now, we'll simulate it by preparing the data structure
        // TODO: Integrate with existing FAQ service
        // const createdFaq = await faqService.createFaq(faqData);
        // For now, return the prepared data
        res.status(201).json({
            success: true,
            data: {
                message: 'FAQ creation prepared successfully',
                preparedData: faqData,
                // In real implementation: createdFaq
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
        const adminUserId = req.user.id;
        const threadId = req.params.id;
        const deleted = await communityService.deleteThread(threadId, adminUserId);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Thread not found'
            });
        }
        res.json({
            success: true,
            message: 'Thread deleted successfully'
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
        const stats = {
            threads: {
                total: discussingThreads.total + reviewThreads.total + finalThreads.total,
                discussing: discussingThreads.total,
                review: reviewThreads.total,
                final: finalThreads.total
            },
            // These could be expanded with more detailed analytics
            metrics: {
                avgTimeToFinal: null, // Would require more complex queries
                conversionRate: finalThreads.total > 0 ?
                    (finalThreads.total / (discussingThreads.total + reviewThreads.total + finalThreads.total)) * 100 : 0
            }
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
exports.default = router;
//# sourceMappingURL=community.js.map