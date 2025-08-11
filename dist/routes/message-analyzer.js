"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageAnalyzerRoutes = void 0;
// src/routes/message-analyzer.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const message_analyzer_service_1 = require("../modules/message-analyzer/services/message-analyzer.service");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
exports.messageAnalyzerRoutes = router;
const messageAnalyzerService = new message_analyzer_service_1.MessageAnalyzerService();
router.post('/analyze', auth_1.requireAuth, async (req, res, next) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
        return next(new errors_1.AppError('Message content is required and must be a string.', 400));
    }
    try {
        const result = await messageAnalyzerService.analyze(message);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=message-analyzer.js.map