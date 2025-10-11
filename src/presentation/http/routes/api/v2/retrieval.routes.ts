import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../../../../middleware/auth';
import { asyncHandler, AppError } from '../../../../../middleware/errorHandler';
import { apiV2RateLimiter } from '../../../../../middleware/api-v2/rateLimiter';
import { sessionService } from '../../../../../services/api-v2/session.service';
import { retrievalService } from '../../../../../services/api-v2/retrieval.service';
import { SemanticSearchOptions } from '../../../../../domain/api-v2/retrieval.types';

const router = Router();

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

    const result = await retrievalService.semanticSearch(query, parsedOptions);

    await sessionService.touchSession(sessionId);

    res.json({
      success: true,
      data: {
        sessionId,
        ...result
      }
    });
  })
);

export default router;
