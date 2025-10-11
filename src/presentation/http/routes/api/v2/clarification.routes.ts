import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../../../../middleware/auth';
import { asyncHandler, AppError } from '../../../../../middleware/errorHandler';
import { apiV2RateLimiter } from '../../../../../middleware/api-v2/rateLimiter';
import { sessionService } from '../../../../../services/api-v2/session.service';
import { clarificationService } from '../../../../../services/api-v2/clarification.service';

const router = Router();

router.post(
  '/analyze',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId, query, includeEnhancedQuery } = req.body || {};

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

    const analysis = await clarificationService.analyze(session, query, {
      includeEnhancedQuery: includeEnhancedQuery === true
    });

    await sessionService.touchSession(sessionId);

    res.json({
      success: true,
      data: {
        sessionId,
        query,
        analysis
      }
    });
  })
);

export default router;
