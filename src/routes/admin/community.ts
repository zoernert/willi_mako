// Community Admin API Routes
// CR-COMMUNITY-HUB-001 - Meilenstein 2
// Autor: AI Assistant
// Datum: 2025-08-09

import express, { Request } from 'express';
import { Pool } from 'pg';
import { CommunityService } from '../../services/CommunityService';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth';
import { requireCommunityFeature } from '../../utils/featureFlags';
import pool from '../../config/database';
import geminiService from '../../services/gemini';

const router = express.Router();

// Initialize service (will be set by factory function)
let communityService: CommunityService;

/**
 * Initialize community admin routes with database pool
 */
export const initializeCommunityAdminRoutes = (db: Pool): express.Router => {
  communityService = new CommunityService(db);
  return router;
};

// Apply community feature flag check and admin authentication
router.use(requireCommunityFeature);
router.use(authenticateToken);

// Admin role check middleware
const requireAdmin = (req: AuthenticatedRequest, res: any, next: any) => {
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
router.post('/create-faq-from-thread', async (req: AuthenticatedRequest, res) => {
  try {
    const adminUserId = req.user!.id;
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
    const faqResult = await pool.query(`
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
  } catch (error) {
    console.error('Error creating FAQ from thread:', error);
    
    if (error.message.includes('not found') || error.message.includes('must be in final')) {
      res.status(422).json({
        success: false,
        message: error.message
      });
    } else {
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
router.delete('/threads/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const adminUserId = req.user!.id;
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
  } catch (error) {
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
    const recentActivity: any[] = [];

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
  } catch (error) {
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    const filters: any = {};
    
    if (req.query.status) {
      filters.status = req.query.status as string;
    }
    
    if (req.query.search) {
      filters.search = req.query.search as string;
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
  } catch (error) {
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
router.put('/threads/:id/force-status', async (req: AuthenticatedRequest, res) => {
  try {
    const adminUserId = req.user!.id;
    const threadId = req.params.id;
    const { status } = req.body;

    // Admin can force any status transition
    const thread = await communityService.updateStatus(threadId, status, adminUserId, true);

    res.json({
      success: true,
      data: { status: thread.status },
      message: `Status forcefully changed to ${status}`
    });
  } catch (error) {
    console.error('Error forcing status change:', error);
    
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    } else if (error.message.includes('Invalid')) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
});

export default router;
