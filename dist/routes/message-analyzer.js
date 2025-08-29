"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageAnalyzerRoutes = void 0;
// src/routes/message-analyzer.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const message_analyzer_service_1 = require("../modules/message-analyzer/services/message-analyzer.service");
const llmProvider_1 = __importDefault(require("../services/llmProvider"));
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
router.post('/ai-explanation', auth_1.requireAuth, async (req, res, next) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
        return next(new errors_1.AppError('Message content is required and must be a string.', 400));
    }
    try {
        const prompt = `Erkläre mir den Inhalt folgender Marktmeldung aus der Energiewirtschaft. Gib eine verständliche und strukturierte Erklärung auf Deutsch:

${message}

Bitte erkläre:
1. Was für eine Art von Nachricht das ist
2. Die wichtigsten Inhalte und Bedeutung
3. Welche Akteure betroffen sind
4. Was die praktischen Auswirkungen sind
5. Eventuell vorhandene Besonderheiten oder Auffälligkeiten`;
        const explanation = await llmProvider_1.default.generateText(prompt);
        res.status(200).json({
            success: true,
            data: {
                explanation,
                success: true
            }
        });
    }
    catch (error) {
        console.error('Error generating AI explanation:', error);
        next(new errors_1.AppError('Fehler beim Generieren der KI-Erklärung', 500));
    }
});
//# sourceMappingURL=message-analyzer.js.map