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

export default router;
