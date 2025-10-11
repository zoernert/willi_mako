"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../../middleware/auth");
const errorHandler_1 = require("../../../../../middleware/errorHandler");
const session_service_1 = require("../../../../../services/api-v2/session.service");
const rateLimiter_1 = require("../../../../../middleware/api-v2/rateLimiter");
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { preferences, contextSettings, ttlMinutes } = req.body || {};
    const session = await session_service_1.sessionService.createSession({
        userId,
        preferences,
        contextSettings,
        ttlMinutes,
        sourceIp: req.ip,
        userAgent: req.get('user-agent') || undefined
    });
    res.status(201).json({
        success: true,
        data: session
    });
}));
router.get('/:sessionId', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId } = req.params;
    const session = await session_service_1.sessionService.getSession(sessionId);
    if (session.userId !== req.user.id) {
        return res.status(404).json({
            success: false,
            error: {
                message: 'Session wurde nicht gefunden',
                code: 'SESSION_NOT_FOUND'
            }
        });
    }
    res.json({
        success: true,
        data: session
    });
}));
router.delete('/:sessionId', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId } = req.params;
    const session = await session_service_1.sessionService.getSession(sessionId);
    if (session.userId !== req.user.id) {
        return res.status(404).json({
            success: false,
            error: {
                message: 'Session wurde nicht gefunden',
                code: 'SESSION_NOT_FOUND'
            }
        });
    }
    await session_service_1.sessionService.deleteSession(sessionId);
    res.status(204).send();
}));
exports.default = router;
//# sourceMappingURL=sessions.routes.js.map