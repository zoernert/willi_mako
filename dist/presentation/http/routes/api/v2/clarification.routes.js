"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../../middleware/auth");
const errorHandler_1 = require("../../../../../middleware/errorHandler");
const rateLimiter_1 = require("../../../../../middleware/api-v2/rateLimiter");
const session_service_1 = require("../../../../../services/api-v2/session.service");
const clarification_service_1 = require("../../../../../services/api-v2/clarification.service");
const router = (0, express_1.Router)();
router.post('/analyze', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId, query, includeEnhancedQuery } = req.body || {};
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
    const analysis = await clarification_service_1.clarificationService.analyze(session, query, {
        includeEnhancedQuery: includeEnhancedQuery === true
    });
    await session_service_1.sessionService.touchSession(sessionId);
    res.json({
        success: true,
        data: {
            sessionId,
            query,
            analysis
        }
    });
}));
exports.default = router;
//# sourceMappingURL=clarification.routes.js.map