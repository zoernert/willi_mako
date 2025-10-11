import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../../../../middleware/auth';
import { asyncHandler } from '../../../../../middleware/errorHandler';
import { sessionService } from '../../../../../services/api-v2/session.service';
import { apiV2RateLimiter } from '../../../../../middleware/api-v2/rateLimiter';

const router = Router();

router.post(
  '/',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { preferences, contextSettings, ttlMinutes } = req.body || {};

    const session = await sessionService.createSession({
      userId,
      preferences,
      contextSettings,
      ttlMinutes,
      sourceIp: req.ip,
      userAgent: req.get('user-agent') || undefined
    });

    res.status(201).json({
      success: true,
      data: session
    });
  })
);

router.get(
  '/:sessionId',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;
    const session = await sessionService.getSession(sessionId);

    if (session.userId !== req.user!.id) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Session wurde nicht gefunden',
          code: 'SESSION_NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: session
    });
  })
);

router.delete(
  '/:sessionId',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;
    const session = await sessionService.getSession(sessionId);

    if (session.userId !== req.user!.id) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Session wurde nicht gefunden',
          code: 'SESSION_NOT_FOUND'
        }
      });
    }

    await sessionService.deleteSession(sessionId);

    res.status(204).send();
  })
);

export default router;
