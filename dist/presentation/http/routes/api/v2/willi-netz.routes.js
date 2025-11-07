"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../../middleware/auth");
const errorHandler_1 = require("../../../../../middleware/errorHandler");
const rateLimiter_1 = require("../../../../../middleware/api-v2/rateLimiter");
const session_service_1 = require("../../../../../services/api-v2/session.service");
const retrieval_service_1 = require("../../../../../services/api-v2/retrieval.service");
const chatParity_service_1 = require("../../../../../services/api-v2/chatParity.service");
const router = (0, express_1.Router)();
/**
 * POST /api/v2/willi-netz/semantic-search
 * Semantische Suche dediziert über die willi-netz Collection
 */
router.post('/semantic-search', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId, query, options } = req.body || {};
    if (!sessionId || typeof sessionId !== 'string') {
        throw new errorHandler_1.AppError('sessionId ist erforderlich', 400);
    }
    if (!query || typeof query !== 'string') {
        throw new errorHandler_1.AppError('query ist erforderlich', 400);
    }
    const session = await session_service_1.sessionService.getSession(sessionId);
    if (session.userId !== req.user.id) {
        throw new errorHandler_1.AppError('Session wurde nicht gefunden', 404);
    }
    const limitValue = typeof (options === null || options === void 0 ? void 0 : options.limit) === 'number' ? options.limit : undefined;
    const parsedOptions = {
        limit: typeof limitValue === 'number' ? Math.min(Math.max(limitValue, 1), 100) : undefined,
        alpha: typeof (options === null || options === void 0 ? void 0 : options.alpha) === 'number' ? options.alpha : undefined,
        outlineScoping: (options === null || options === void 0 ? void 0 : options.outlineScoping) === undefined ? undefined : Boolean(options === null || options === void 0 ? void 0 : options.outlineScoping),
        excludeVisual: (options === null || options === void 0 ? void 0 : options.excludeVisual) === undefined ? undefined : Boolean(options === null || options === void 0 ? void 0 : options.excludeVisual)
    };
    const result = await retrieval_service_1.retrievalService.semanticSearchWilliNetz(query, parsedOptions);
    await session_service_1.sessionService.touchSession(sessionId);
    res.json({
        success: true,
        data: {
            sessionId,
            collection: 'willi-netz',
            ...result
        }
    });
}));
/**
 * POST /api/v2/willi-netz/chat
 * Chat dediziert über die willi-netz Collection
 */
router.post('/chat', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId, message, contextSettings, timelineId } = req.body || {};
    if (!sessionId) {
        throw new errorHandler_1.AppError('sessionId ist erforderlich', 400);
    }
    if (!message || typeof message !== 'string') {
        throw new errorHandler_1.AppError('message ist erforderlich', 400);
    }
    const session = await session_service_1.sessionService.getSession(sessionId);
    if (session.userId !== req.user.id) {
        throw new errorHandler_1.AppError('Session wurde nicht gefunden', 404);
    }
    if (!session.legacyChatId) {
        throw new errorHandler_1.AppError('Session ist nicht mit einem Chat verknüpft', 500);
    }
    const authorization = req.headers.authorization;
    // Erweitere contextSettings um collection-spezifische Information
    const enhancedContextSettings = {
        ...contextSettings,
        targetCollection: 'willi-netz'
    };
    const data = await chatParity_service_1.chatParityService.forwardChat({
        sessionId,
        message,
        chatId: session.legacyChatId,
        contextSettings: enhancedContextSettings,
        timelineId
    }, authorization);
    await session_service_1.sessionService.touchSession(sessionId);
    res.json({
        success: true,
        data: {
            collection: 'willi-netz',
            ...data
        }
    });
}));
exports.default = router;
//# sourceMappingURL=willi-netz.routes.js.map