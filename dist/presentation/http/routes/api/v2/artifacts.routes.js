"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../../middleware/auth");
const errorHandler_1 = require("../../../../../middleware/errorHandler");
const rateLimiter_1 = require("../../../../../middleware/api-v2/rateLimiter");
const session_service_1 = require("../../../../../services/api-v2/session.service");
const artifacts_service_1 = require("../../../../../services/api-v2/artifacts.service");
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId, type, name, mimeType, encoding, content, description, version, tags, metadata } = req.body || {};
    if (!sessionId || typeof sessionId !== 'string') {
        throw new errorHandler_1.AppError('sessionId ist erforderlich', 400);
    }
    if (typeof type !== 'string' || !type.trim()) {
        throw new errorHandler_1.AppError('type ist erforderlich', 400);
    }
    if (typeof name !== 'string' || !name.trim()) {
        throw new errorHandler_1.AppError('name ist erforderlich', 400);
    }
    if (typeof mimeType !== 'string' || !mimeType.includes('/')) {
        throw new errorHandler_1.AppError('mimeType ist erforderlich', 400);
    }
    if (encoding !== 'utf8' && encoding !== 'base64') {
        throw new errorHandler_1.AppError('encoding muss "utf8" oder "base64" sein', 400);
    }
    if (typeof content !== 'string' || !content.length) {
        throw new errorHandler_1.AppError('content ist erforderlich', 400);
    }
    if (description !== undefined && typeof description !== 'string') {
        throw new errorHandler_1.AppError('description muss ein String sein', 400);
    }
    if (version !== undefined && typeof version !== 'string') {
        throw new errorHandler_1.AppError('version muss ein String sein', 400);
    }
    if (tags !== undefined && !Array.isArray(tags)) {
        throw new errorHandler_1.AppError('tags müssen als Array vorliegen', 400);
    }
    const session = await session_service_1.sessionService.getSession(sessionId);
    if (session.userId !== req.user.id) {
        throw new errorHandler_1.AppError('Session wurde nicht gefunden', 404);
    }
    let sanitizedMetadata;
    if (metadata !== undefined) {
        if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
            throw new errorHandler_1.AppError('metadata muss ein Objekt sein', 400);
        }
        sanitizedMetadata = metadata;
    }
    const artifact = await artifacts_service_1.artifactsService.createArtifact({
        userId: req.user.id,
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
    await session_service_1.sessionService.touchSession(sessionId);
    const responseBody = {
        sessionId,
        artifact
    };
    res.status(201).json({
        success: true,
        data: responseBody
    });
}));
exports.default = router;
//# sourceMappingURL=artifacts.routes.js.map