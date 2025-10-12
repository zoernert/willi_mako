import { Router, Response } from 'express';

import { authenticateToken, AuthenticatedRequest } from '../../../../../middleware/auth';
import { asyncHandler, AppError } from '../../../../../middleware/errorHandler';
import { apiV2RateLimiter } from '../../../../../middleware/api-v2/rateLimiter';
import { sessionService } from '../../../../../services/api-v2/session.service';
import { artifactsService } from '../../../../../services/api-v2/artifacts.service';
import { CreateArtifactResponseBody } from '../../../../../domain/api-v2/artifacts.types';

const router = Router();

router.post(
  '/',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId, type, name, mimeType, encoding, content, description, version, tags, metadata } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string') {
      throw new AppError('sessionId ist erforderlich', 400);
    }

    if (typeof type !== 'string' || !type.trim()) {
      throw new AppError('type ist erforderlich', 400);
    }

    if (typeof name !== 'string' || !name.trim()) {
      throw new AppError('name ist erforderlich', 400);
    }

    if (typeof mimeType !== 'string' || !mimeType.includes('/')) {
      throw new AppError('mimeType ist erforderlich', 400);
    }

    if (encoding !== 'utf8' && encoding !== 'base64') {
      throw new AppError('encoding muss "utf8" oder "base64" sein', 400);
    }

    if (typeof content !== 'string' || !content.length) {
      throw new AppError('content ist erforderlich', 400);
    }

    if (description !== undefined && typeof description !== 'string') {
      throw new AppError('description muss ein String sein', 400);
    }

    if (version !== undefined && typeof version !== 'string') {
      throw new AppError('version muss ein String sein', 400);
    }

    if (tags !== undefined && !Array.isArray(tags)) {
      throw new AppError('tags müssen als Array vorliegen', 400);
    }

    const session = await sessionService.getSession(sessionId);

    if (session.userId !== req.user!.id) {
      throw new AppError('Session wurde nicht gefunden', 404);
    }

    let sanitizedMetadata: Record<string, unknown> | undefined;

    if (metadata !== undefined) {
      if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
        throw new AppError('metadata muss ein Objekt sein', 400);
      }

      sanitizedMetadata = metadata as Record<string, unknown>;
    }

    const artifact = await artifactsService.createArtifact({
      userId: req.user!.id,
      sessionId,
      type,
      name,
      mimeType,
      encoding,
      content,
      description,
      version,
      tags,
      metadata: sanitizedMetadata
    });

    await sessionService.touchSession(sessionId);

    const responseBody: CreateArtifactResponseBody = {
      sessionId,
      artifact
    };

    res.status(201).json({
      success: true,
      data: responseBody
    });
  })
);

export default router;
