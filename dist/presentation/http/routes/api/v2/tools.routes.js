"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../../middleware/auth");
const errorHandler_1 = require("../../../../../middleware/errorHandler");
const rateLimiter_1 = require("../../../../../middleware/api-v2/rateLimiter");
const session_service_1 = require("../../../../../services/api-v2/session.service");
const tooling_service_1 = require("../../../../../services/api-v2/tooling.service");
const router = (0, express_1.Router)();
router.post('/generate-script', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)({ capacity: 3, refillTokens: 3, intervalMs: 60000 }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = (req.body || {});
    const { sessionId, instructions, inputSchema, expectedOutputDescription, additionalContext, constraints, referenceDocuments, testCases, attachments } = body;
    if (!sessionId || typeof sessionId !== 'string') {
        throw new errorHandler_1.AppError('sessionId ist erforderlich', 400);
    }
    if (typeof instructions !== 'string' || !instructions.trim()) {
        throw new errorHandler_1.AppError('instructions ist erforderlich', 400);
    }
    if (inputSchema !== undefined && (typeof inputSchema !== 'object' || Array.isArray(inputSchema))) {
        throw new errorHandler_1.AppError('inputSchema muss ein Objekt sein', 400);
    }
    if (constraints !== undefined && (typeof constraints !== 'object' || Array.isArray(constraints))) {
        throw new errorHandler_1.AppError('constraints muss ein Objekt sein', 400);
    }
    const session = await session_service_1.sessionService.getSession(sessionId);
    if (session.userId !== req.user.id) {
        throw new errorHandler_1.AppError('Session wurde nicht gefunden', 404);
    }
    const job = await tooling_service_1.toolingService.enqueueGenerateScriptJob({
        userId: req.user.id,
        sessionId,
        instructions,
        inputSchema: inputSchema,
        expectedOutputDescription,
        additionalContext,
        constraints,
        referenceDocuments,
        testCases,
        attachments
    });
    await session_service_1.sessionService.touchSession(sessionId);
    const payload = {
        sessionId,
        job
    };
    res.status(202).json({
        success: true,
        data: payload
    });
}));
router.post('/generate-script/repair', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)({ capacity: 3, refillTokens: 3, intervalMs: 60000 }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const body = (req.body || {});
    const { sessionId, jobId, repairInstructions, additionalContext, referenceDocuments, attachments, testCases } = body;
    if (!sessionId || typeof sessionId !== 'string') {
        throw new errorHandler_1.AppError('sessionId ist erforderlich', 400);
    }
    if (!jobId || typeof jobId !== 'string') {
        throw new errorHandler_1.AppError('jobId ist erforderlich', 400);
    }
    if (repairInstructions !== undefined && typeof repairInstructions !== 'string') {
        throw new errorHandler_1.AppError('repairInstructions muss ein String sein', 400);
    }
    if (additionalContext !== undefined && typeof additionalContext !== 'string') {
        throw new errorHandler_1.AppError('additionalContext muss ein String sein', 400);
    }
    if (referenceDocuments !== undefined && !Array.isArray(referenceDocuments)) {
        throw new errorHandler_1.AppError('referenceDocuments muss ein Array sein', 400);
    }
    if (attachments !== undefined && !Array.isArray(attachments)) {
        throw new errorHandler_1.AppError('attachments muss ein Array sein', 400);
    }
    if (testCases !== undefined && !Array.isArray(testCases)) {
        throw new errorHandler_1.AppError('testCases muss ein Array sein', 400);
    }
    const session = await session_service_1.sessionService.getSession(sessionId);
    if (session.userId !== req.user.id) {
        throw new errorHandler_1.AppError('Session wurde nicht gefunden', 404);
    }
    const job = await tooling_service_1.toolingService.resumeGenerateScriptJob({
        userId: req.user.id,
        sessionId,
        jobId,
        repairInstructions,
        additionalContext,
        referenceDocuments,
        attachments,
        testCases
    });
    await session_service_1.sessionService.touchSession(sessionId);
    const payload = {
        sessionId,
        job
    };
    res.status(202).json({
        success: true,
        data: payload
    });
}));
router.post('/run-node-script', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId, source, timeoutMs, metadata } = req.body || {};
    if (!sessionId || typeof sessionId !== 'string') {
        throw new errorHandler_1.AppError('sessionId ist erforderlich', 400);
    }
    if (typeof source !== 'string' || !source.trim()) {
        throw new errorHandler_1.AppError('source ist erforderlich', 400);
    }
    const session = await session_service_1.sessionService.getSession(sessionId);
    if (session.userId !== req.user.id) {
        throw new errorHandler_1.AppError('Session wurde nicht gefunden', 404);
    }
    const sanitizedTimeout = typeof timeoutMs === 'number' ? timeoutMs : undefined;
    let sanitizedMetadata;
    if (metadata !== undefined) {
        if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
            throw new errorHandler_1.AppError('metadata muss ein Objekt sein', 400);
        }
        sanitizedMetadata = metadata;
    }
    const job = await tooling_service_1.toolingService.createNodeScriptJob({
        userId: req.user.id,
        sessionId,
        source,
        timeoutMs: sanitizedTimeout,
        metadata: sanitizedMetadata
    });
    await session_service_1.sessionService.touchSession(sessionId);
    const payload = {
        sessionId,
        job
    };
    res.status(202).json({
        success: true,
        data: payload
    });
}));
router.get('/jobs', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string') {
        throw new errorHandler_1.AppError('sessionId ist erforderlich', 400);
    }
    const session = await session_service_1.sessionService.getSession(sessionId);
    if (session.userId !== req.user.id) {
        throw new errorHandler_1.AppError('Session wurde nicht gefunden', 404);
    }
    const jobs = await tooling_service_1.toolingService.listJobsForSession(sessionId, req.user.id);
    await session_service_1.sessionService.touchSession(sessionId);
    res.json({
        success: true,
        data: {
            jobs
        }
    });
}));
router.get('/jobs/:jobId', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { jobId } = req.params;
    if (!jobId || typeof jobId !== 'string') {
        throw new errorHandler_1.AppError('jobId ist erforderlich', 400);
    }
    const job = await tooling_service_1.toolingService.getJobForUser(jobId, req.user.id);
    res.json({
        success: true,
        data: {
            job
        }
    });
}));
exports.default = router;
//# sourceMappingURL=tools.routes.js.map