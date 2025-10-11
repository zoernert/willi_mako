import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../../../../middleware/auth';
import { asyncHandler, AppError } from '../../../../../middleware/errorHandler';
import { apiV2RateLimiter } from '../../../../../middleware/api-v2/rateLimiter';
import { sessionService } from '../../../../../services/api-v2/session.service';
import { chatParityService } from '../../../../../services/api-v2/chatParity.service';

const router = Router();

router.post(
  '/',
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
    const data = await chatParityService.forwardChat(
      {
        sessionId,
        message,
        chatId: session.legacyChatId,
        contextSettings,
        timelineId
      },
      authorization
    );

    await sessionService.touchSession(sessionId);

    res.json({
      success: true,
      data
    });
  })
);

export default router;
