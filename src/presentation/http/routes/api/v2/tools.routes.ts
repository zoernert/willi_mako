import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../../../../middleware/auth';
import { asyncHandler, AppError } from '../../../../../middleware/errorHandler';
import { apiV2RateLimiter } from '../../../../../middleware/api-v2/rateLimiter';
import { sessionService } from '../../../../../services/api-v2/session.service';
import { toolingService } from '../../../../../services/api-v2/tooling.service';
import { RunNodeScriptJobResponse } from '../../../../../domain/api-v2/tooling.types';

const router = Router();

router.post(
  '/run-node-script',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId, source, timeoutMs, metadata } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string') {
      throw new AppError('sessionId ist erforderlich', 400);
    }

    if (typeof source !== 'string' || !source.trim()) {
      throw new AppError('source ist erforderlich', 400);
    }

    const session = await sessionService.getSession(sessionId);

    if (session.userId !== req.user!.id) {
      throw new AppError('Session wurde nicht gefunden', 404);
    }

    const sanitizedTimeout = typeof timeoutMs === 'number' ? timeoutMs : undefined;

    let sanitizedMetadata: Record<string, unknown> | undefined;

    if (metadata !== undefined) {
      if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
        throw new AppError('metadata muss ein Objekt sein', 400);
      }

      sanitizedMetadata = metadata as Record<string, unknown>;
    }

    const job = await toolingService.createNodeScriptJob({
      userId: req.user!.id,
      sessionId,
      source,
      timeoutMs: sanitizedTimeout,
      metadata: sanitizedMetadata
    });

    await sessionService.touchSession(sessionId);

    const payload: RunNodeScriptJobResponse = {
      sessionId,
      job
    };

    res.status(202).json({
      success: true,
      data: payload
    });
  })
);

router.get(
  '/jobs/:jobId',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { jobId } = req.params;

    if (!jobId || typeof jobId !== 'string') {
      throw new AppError('jobId ist erforderlich', 400);
    }

    const job = await toolingService.getJobForUser(jobId, req.user!.id);

    res.json({
      success: true,
      data: {
        job
      }
    });
  })
);

export default router;
