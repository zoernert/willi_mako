import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../../../../middleware/auth';
import { asyncHandler, AppError } from '../../../../../middleware/errorHandler';
import { apiV2RateLimiter } from '../../../../../middleware/api-v2/rateLimiter';
import { sessionService } from '../../../../../services/api-v2/session.service';
import { contextService } from '../../../../../services/api-v2/context.service';

const router = Router();

router.post(
  '/resolve',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId, query, messages, contextSettingsOverride } = req.body || {};

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

    const result = await contextService.resolve(session, query, {
      messages,
      contextSettingsOverride
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
