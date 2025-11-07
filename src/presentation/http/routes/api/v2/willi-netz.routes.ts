import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../../../../middleware/auth';
import { asyncHandler, AppError } from '../../../../../middleware/errorHandler';
import { apiV2RateLimiter } from '../../../../../middleware/api-v2/rateLimiter';
import { sessionService } from '../../../../../services/api-v2/session.service';
import { retrievalService } from '../../../../../services/api-v2/retrieval.service';
import { chatParityService } from '../../../../../services/api-v2/chatParity.service';
import { SemanticSearchOptions } from '../../../../../domain/api-v2/retrieval.types';

const router = Router();

/**
 * POST /api/v2/willi-netz/semantic-search
 * Semantische Suche dediziert über die willi-netz Collection
 */
router.post(
  '/semantic-search',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId, query, options } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string') {
      throw new AppError('sessionId ist erforderlich', 400);
    }

    if (!query || typeof query !== 'string') {
      throw new AppError('query ist erforderlich', 400);
    }

    const session = await sessionService.getSession(sessionId);

    if (session.userId !== req.user!.id) {
      throw new AppError('Session wurde nicht gefunden', 404);
    }

    const limitValue = typeof options?.limit === 'number' ? options.limit : undefined;

    const parsedOptions: SemanticSearchOptions = {
      limit: typeof limitValue === 'number' ? Math.min(Math.max(limitValue, 1), 100) : undefined,
      alpha: typeof options?.alpha === 'number' ? options.alpha : undefined,
      outlineScoping: options?.outlineScoping === undefined ? undefined : Boolean(options?.outlineScoping),
      excludeVisual: options?.excludeVisual === undefined ? undefined : Boolean(options?.excludeVisual)
    };

    const result = await retrievalService.semanticSearchWilliNetz(query, parsedOptions);

    await sessionService.touchSession(sessionId);

    res.json({
      success: true,
      data: {
        sessionId,
        collection: 'willi-netz',
        ...result
      }
    });
  })
);

/**
 * POST /api/v2/willi-netz/chat
 * Chat dediziert über die willi-netz Collection
 */
router.post(
  '/chat',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId, message, contextSettings, timelineId } = req.body || {};

    if (!sessionId) {
      throw new AppError('sessionId ist erforderlich', 400);
    }

    if (!message || typeof message !== 'string') {
      throw new AppError('message ist erforderlich', 400);
    }

    const session = await sessionService.getSession(sessionId);

    if (session.userId !== req.user!.id) {
      throw new AppError('Session wurde nicht gefunden', 404);
    }

    if (!session.legacyChatId) {
      throw new AppError('Session ist nicht mit einem Chat verknüpft', 500);
    }

    const authorization = req.headers.authorization;
    
    // Erweitere contextSettings um collection-spezifische Information
    const enhancedContextSettings = {
      ...contextSettings,
      targetCollection: 'willi-netz'
    };

    const data = await chatParityService.forwardChat(
      {
        sessionId,
        message,
        chatId: session.legacyChatId,
        contextSettings: enhancedContextSettings,
        timelineId
      },
      authorization
    );

    await sessionService.touchSession(sessionId);

    res.json({
      success: true,
      data: {
        collection: 'willi-netz',
        ...data
      }
    });
  })
);

export default router;
