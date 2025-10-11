import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../../../../middleware/auth';
import { asyncHandler, AppError } from '../../../../../middleware/errorHandler';
import { apiV2RateLimiter } from '../../../../../middleware/api-v2/rateLimiter';
import { sessionService } from '../../../../../services/api-v2/session.service';
import { reasoningService } from '../../../../../services/api-v2/reasoning.service';

const router = Router();

router.post(
  '/generate',
  authenticateToken,
  apiV2RateLimiter({ capacity: 6, refillTokens: 6, intervalMs: 60_000 }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId, query, messages, contextSettingsOverride, preferencesOverride, overridePipeline, useDetailedIntentAnalysis } =
      req.body || {};

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

    const result = await reasoningService.generate(session, {
      query,
      messages,
      contextSettingsOverride,
      preferencesOverride,
      overridePipeline,
      useDetailedIntentAnalysis
    });

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
