// Community API Routes
// CR-COMMUNITY-HUB-001 - Meilenstein 1 & 2
// Autor: AI Assistant
// Datum: 2025-08-09

import express from 'express';
import { Pool } from 'pg';
import { CommunityService } from '../services/CommunityService';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { requireCommunityFeature, canReadCommunity } from '../utils/featureFlags';
import { validateUpdateDocumentRequest } from '../utils/communityValidation';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting configurations
const threadCreationLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 threads per hour
  message: { success: false, message: 'Too many threads created. Try again later.' },
  keyGenerator: (req: AuthenticatedRequest) => (req.user?.id || req.ip) as string
});

const documentUpdateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // 30 patch operations per 5 minutes
  message: { success: false, message: 'Too many document updates. Try again later.' },
  keyGenerator: (req: AuthenticatedRequest) => (req.user?.id || req.ip) as string
});

const commentLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 comments per 5 minutes
  message: { success: false, message: 'Too many comments. Try again later.' },
  keyGenerator: (req: AuthenticatedRequest) => (req.user?.id || req.ip) as string
});

// Initialize service (will be set by factory function)
let communityService: CommunityService;

/**
 * Initialize community routes with database pool
 */
export const initializeCommunityRoutes = (db: Pool): express.Router => {
  communityService = new CommunityService(db);
  return router;
};

// Apply community feature flag check to all routes
router.use(requireCommunityFeature);

/**
 * GET /api/community/threads
 * List community threads with filtering and pagination
 */
router.get('/threads', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    
    // Check read permissions
    if (!canReadCommunity(!!userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    
    const filters: any = {};
    
    if (req.query.status) {
      filters.status = req.query.status as string;
    }
    
    if (req.query.tags) {
      filters.tags = (req.query.tags as string).split(',').map(t => t.trim());
    }
    
    if (req.query.search) {
      filters.search = req.query.search as string;
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
  } catch (error) {
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
router.post('/threads', authenticateToken, threadCreationLimit, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { title, initialContent, tags } = req.body;

    const thread = await communityService.createThread(
      { title, initialContent, tags },
      userId
    );

    res.status(201).json({
      success: true,
      data: thread
    });
  } catch (error) {
    console.error('Error creating thread:', error);
    
    if (error.message.includes('validation') || error.message.includes('required')) {
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

/**
 * GET /api/community/threads/:id
 * Get a specific thread with full document
 */
router.get('/threads/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const threadId = req.params.id;
    const userId = req.user?.id;

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
  } catch (error) {
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
router.patch('/threads/:id/document', authenticateToken, documentUpdateLimit, async (req: AuthenticatedRequest, res) => {
  try {
    const threadId = req.params.id;
    const userId = req.user!.id;
    
    // Validate and normalize the request data
    const operations = validateUpdateDocumentRequest(req.body);
    
    // Get version from headers or body (if it was an object format)
    const version = (!Array.isArray(req.body) && req.body.version) || req.headers['if-version'] as string;

    const result = await communityService.updateDocument(
      threadId,
      { operations, version },
      userId
    );

    res.json({
      success: true,
      data: result.thread,
      changed: result.changed
    });
  } catch (error) {
    console.error('Error updating document:', error);
    
    if (error.message.includes('Version conflict')) {
      res.status(409).json({
        success: false,
        message: error.message,
        code: 'VERSION_CONFLICT'
      });
    } else if (error.message.includes('Access denied') || error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    } else if (error.message.includes('validation') || error.message.includes('Invalid')) {
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

/**
 * PUT /api/community/threads/:id/status
 * Update thread status
 */
router.put('/threads/:id/status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const threadId = req.params.id;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';
    const { status } = req.body;

    const thread = await communityService.updateStatus(threadId, status, userId, isAdmin);

    res.json({
      success: true,
      data: { status: thread.status }
    });
  } catch (error) {
    console.error('Error updating status:', error);
    
    if (error.message.includes('Access denied') || error.message.includes('not found')) {
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

/**
 * POST /api/community/threads/:id/comments
 * Create a comment on a thread section
 */
router.post('/threads/:id/comments', authenticateToken, commentLimit, async (req: AuthenticatedRequest, res) => {
  try {
    const threadId = req.params.id;
    const userId = req.user!.id;
    const { blockId, content } = req.body;

    const comment = await communityService.createComment(threadId, blockId, content, userId);

    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    
    if (error.message.includes('Access denied') || error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    } else if (error.message.includes('validation') || error.message.includes('required')) {
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

/**
 * GET /api/community/threads/:id/comments
 * Get comments for a thread
 */
router.get('/threads/:id/comments', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const threadId = req.params.id;
    const userId = req.user?.id;

    const comments = await communityService.getCommentsForThread(threadId, userId);

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    
    if (error.message.includes('Access denied') || error.message.includes('not found')) {
      res.status(404).json({
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
 * GET /api/community/search
 * Search threads by semantic similarity
 */
router.get('/search', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    
    // Check read permissions
    if (!canReadCommunity(!!userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const query = req.query.q as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

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
  } catch (error) {
    console.error('Error searching threads:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// =====================================
// COMMUNITY INITIATIVES (Meilenstein 3)
// =====================================

/**
 * POST /api/community/threads/:threadId/initiatives
 * Create a new initiative from a finalized thread
 */
router.post('/threads/:threadId/initiatives', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const threadId = req.params.threadId;
    const userId = req.user!.id;
    const { title, targetAudience, customPrompt } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    const initiative = await communityService.createInitiative(
      threadId,
      { title, targetAudience, customPrompt },
      userId
    );

    res.status(201).json({
      success: true,
      data: initiative
    });
  } catch (error) {
    console.error('Error creating initiative:', error);
    
    if (error.message.includes('not found') || error.message.includes('finalized') || 
        error.message.includes('final solution') || error.message.includes('already exists')) {
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

/**
 * GET /api/community/threads/:threadId/initiatives
 * Get initiative for a specific thread
 */
router.get('/threads/:threadId/initiatives', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const threadId = req.params.threadId;
    const initiative = await communityService.getInitiativeByThread(threadId);

    if (!initiative) {
      return res.status(404).json({
        success: false,
        message: 'No initiative found for this thread'
      });
    }

    res.json({
      success: true,
      data: initiative
    });
  } catch (error) {
    console.error('Error getting initiative by thread:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/community/initiatives
 * List all initiatives with filtering and pagination
 */
router.get('/initiatives', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    
    // Check read permissions
    if (!canReadCommunity(!!userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    
    const filters: any = {};
    
    if (req.query.status) {
      filters.status = req.query.status as string;
    }
    
    if (req.query.userId) {
      filters.userId = req.query.userId as string;
    }

    const result = await communityService.listInitiatives(page, limit, filters);

    res.json({
      success: true,
      data: result.initiatives,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing initiatives:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/community/initiatives/:id
 * Get a specific initiative by ID
 */
router.get('/initiatives/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const initiativeId = req.params.id;
    const initiative = await communityService.getInitiative(initiativeId);

    if (!initiative) {
      return res.status(404).json({
        success: false,
        message: 'Initiative not found'
      });
    }

    res.json({
      success: true,
      data: initiative
    });
  } catch (error) {
    console.error('Error getting initiative:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * PATCH /api/community/initiatives/:id
 * Update initiative content
 */
router.patch('/initiatives/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const initiativeId = req.params.id;
    const userId = req.user!.id;
    const { title, draft_content, target_audience, submission_details } = req.body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (draft_content !== undefined) updates.draft_content = draft_content;
    if (target_audience !== undefined) updates.target_audience = target_audience;
    if (submission_details !== undefined) updates.submission_details = submission_details;

    const initiative = await communityService.updateInitiative(initiativeId, updates, userId);

    if (!initiative) {
      return res.status(404).json({
        success: false,
        message: 'Initiative not found'
      });
    }

    res.json({
      success: true,
      data: initiative
    });
  } catch (error) {
    console.error('Error updating initiative:', error);
    
    if (error.message.includes('Permission denied') || error.message.includes('not found')) {
      res.status(403).json({
        success: false,
        message: error.message
      });
    } else if (error.message.includes('submitted')) {
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

/**
 * PUT /api/community/initiatives/:id/status
 * Update initiative status (draft -> refining -> submitted)
 */
router.put('/initiatives/:id/status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const initiativeId = req.params.id;
    const userId = req.user!.id;
    const { status, submission_details } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const initiative = await communityService.updateInitiativeStatus(
      initiativeId,
      status,
      userId,
      submission_details
    );

    if (!initiative) {
      return res.status(404).json({
        success: false,
        message: 'Initiative not found'
      });
    }

    res.json({
      success: true,
      data: { status: initiative.status, updated_at: initiative.updated_at }
    });
  } catch (error) {
    console.error('Error updating initiative status:', error);
    
    if (error.message.includes('Permission denied') || error.message.includes('not found')) {
      res.status(403).json({
        success: false,
        message: error.message
      });
    } else if (error.message.includes('Invalid status transition')) {
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

/**
 * DELETE /api/community/initiatives/:id
 * Delete a draft initiative
 */
router.delete('/initiatives/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const initiativeId = req.params.id;
    const userId = req.user!.id;

    const deleted = await communityService.deleteInitiative(initiativeId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Initiative not found or cannot be deleted'
      });
    }

    res.json({
      success: true,
      message: 'Initiative deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting initiative:', error);
    
    if (error.message.includes('Permission denied') || error.message.includes('not found')) {
      res.status(403).json({
        success: false,
        message: error.message
      });
    } else if (error.message.includes('draft')) {
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
