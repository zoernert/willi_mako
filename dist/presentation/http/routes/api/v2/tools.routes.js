"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../../middleware/auth");
const errorHandler_1 = require("../../../../../middleware/errorHandler");
const rateLimiter_1 = require("../../../../../middleware/api-v2/rateLimiter");
const session_service_1 = require("../../../../../services/api-v2/session.service");
const tooling_service_1 = require("../../../../../services/api-v2/tooling.service");
const router = (0, express_1.Router)();
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