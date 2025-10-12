"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../../middleware/auth");
const errorHandler_1 = require("../../../../../middleware/errorHandler");
const rateLimiter_1 = require("../../../../../middleware/api-v2/rateLimiter");
const session_service_1 = require("../../../../../services/api-v2/session.service");
const retrieval_service_1 = require("../../../../../services/api-v2/retrieval.service");
const router = (0, express_1.Router)();
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
    const result = await retrieval_service_1.retrievalService.semanticSearch(query, parsedOptions);
    await session_service_1.sessionService.touchSession(sessionId);
    res.json({
        success: true,
        data: {
            sessionId,
            ...result
        }
    });
}));
exports.default = router;
//# sourceMappingURL=retrieval.routes.js.map