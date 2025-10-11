"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../../middleware/auth");
const errorHandler_1 = require("../../../../../middleware/errorHandler");
const rateLimiter_1 = require("../../../../../middleware/api-v2/rateLimiter");
const session_service_1 = require("../../../../../services/api-v2/session.service");
const chatParity_service_1 = require("../../../../../services/api-v2/chatParity.service");
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    const data = await chatParity_service_1.chatParityService.forwardChat({
        sessionId,
        message,
        chatId: session.legacyChatId,
        contextSettings,
        timelineId
    }, authorization);
    await session_service_1.sessionService.touchSession(sessionId);
    res.json({
        success: true,
        data
    });
}));
exports.default = router;
//# sourceMappingURL=chat.routes.js.map