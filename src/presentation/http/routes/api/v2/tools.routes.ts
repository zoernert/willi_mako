import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../../../../middleware/auth';
import { asyncHandler, AppError } from '../../../../../middleware/errorHandler';
import { apiV2RateLimiter } from '../../../../../middleware/api-v2/rateLimiter';
import { sessionService } from '../../../../../services/api-v2/session.service';
import { toolingService } from '../../../../../services/api-v2/tooling.service';
import {
  GenerateToolScriptJobResponse,
  GenerateToolScriptRepairRequest,
  GenerateToolScriptRepairResponse,
  GenerateToolScriptRequest,
  RunNodeScriptJobResponse
} from '../../../../../domain/api-v2/tooling.types';

const router = Router();

router.post(
  '/generate-script',
  authenticateToken,
  apiV2RateLimiter({ capacity: 3, refillTokens: 3, intervalMs: 60_000 }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = (req.body || {}) as GenerateToolScriptRequest;
    const {
      sessionId,
      instructions,
      inputSchema,
      expectedOutputDescription,
      additionalContext,
      constraints,
      referenceDocuments,
      testCases,
      attachments
    } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      throw new AppError('sessionId ist erforderlich', 400);
    }

    if (typeof instructions !== 'string' || !instructions.trim()) {
      throw new AppError('instructions ist erforderlich', 400);
    }

    if (inputSchema !== undefined && (typeof inputSchema !== 'object' || Array.isArray(inputSchema))) {
      throw new AppError('inputSchema muss ein Objekt sein', 400);
    }

    if (constraints !== undefined && (typeof constraints !== 'object' || Array.isArray(constraints))) {
      throw new AppError('constraints muss ein Objekt sein', 400);
    }

    const session = await sessionService.getSession(sessionId);

    if (session.userId !== req.user!.id) {
      throw new AppError('Session wurde nicht gefunden', 404);
    }

    const job = await toolingService.enqueueGenerateScriptJob({
      userId: req.user!.id,
      sessionId,
      instructions,
      inputSchema: inputSchema as GenerateToolScriptRequest['inputSchema'],
      expectedOutputDescription,
      additionalContext,
      constraints,
      referenceDocuments,
      testCases,
      attachments
    });

    await sessionService.touchSession(sessionId);

    const payload: GenerateToolScriptJobResponse = {
      sessionId,
      job
    };

    res.status(202).json({
      success: true,
      data: payload
    });
  })
);

router.post(
  '/generate-script/repair',
  authenticateToken,
  apiV2RateLimiter({ capacity: 3, refillTokens: 3, intervalMs: 60_000 }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const body = (req.body || {}) as GenerateToolScriptRepairRequest;
    const {
      sessionId,
      jobId,
      repairInstructions,
      additionalContext,
      referenceDocuments,
      attachments,
      testCases
    } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      throw new AppError('sessionId ist erforderlich', 400);
    }

    if (!jobId || typeof jobId !== 'string') {
      throw new AppError('jobId ist erforderlich', 400);
    }

    if (repairInstructions !== undefined && typeof repairInstructions !== 'string') {
      throw new AppError('repairInstructions muss ein String sein', 400);
    }

    if (additionalContext !== undefined && typeof additionalContext !== 'string') {
      throw new AppError('additionalContext muss ein String sein', 400);
    }

    if (referenceDocuments !== undefined && !Array.isArray(referenceDocuments)) {
      throw new AppError('referenceDocuments muss ein Array sein', 400);
    }

    if (attachments !== undefined && !Array.isArray(attachments)) {
      throw new AppError('attachments muss ein Array sein', 400);
    }

    if (testCases !== undefined && !Array.isArray(testCases)) {
      throw new AppError('testCases muss ein Array sein', 400);
    }

    const session = await sessionService.getSession(sessionId);

    if (session.userId !== req.user!.id) {
      throw new AppError('Session wurde nicht gefunden', 404);
    }

    const job = await toolingService.resumeGenerateScriptJob({
      userId: req.user!.id,
      sessionId,
      jobId,
      repairInstructions,
      additionalContext,
      referenceDocuments,
      attachments,
      testCases
    });

    await sessionService.touchSession(sessionId);

    const payload: GenerateToolScriptRepairResponse = {
      sessionId,
      job
    };

    res.status(202).json({
      success: true,
      data: payload
    });
  })
);

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
  '/jobs',
  authenticateToken,
  apiV2RateLimiter(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      throw new AppError('sessionId ist erforderlich', 400);
    }

    const session = await sessionService.getSession(sessionId);

    if (session.userId !== req.user!.id) {
      throw new AppError('Session wurde nicht gefunden', 404);
    }

    const jobs = await toolingService.listJobsForSession(sessionId, req.user!.id);

    await sessionService.touchSession(sessionId);

    res.json({
      success: true,
      data: {
        jobs
      }
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
