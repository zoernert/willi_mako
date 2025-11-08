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
        // Use the full 6-phase analysis pipeline for comprehensive explanation
        const analysis = await messageAnalyzerService.analyze(message);
        // Use the raw summary from Gemini (already contains formatted tables)
        const explanation = analysis.summary;
        res.status(200).json({
            success: true,
            data: {
                explanation,
                messageType: analysis.format,
                success: true,
                debug: analysis.debug // NEW: Include debug info for all 6 phases
            }
        });
    }
    catch (error) {
        console.error('Error generating AI explanation:', error);
        next(new errors_1.AppError('Fehler beim Generieren der KI-Erklärung', 500));
    }
});
// Interactive chat endpoint for message analysis
router.post('/chat', auth_1.requireAuth, async (req, res, next) => {
    const { message, chatHistory, currentEdifactMessage } = req.body;
    if (!message || typeof message !== 'string') {
        return next(new errors_1.AppError('Message content is required and must be a string.', 400));
    }
    if (!currentEdifactMessage || typeof currentEdifactMessage !== 'string') {
        return next(new errors_1.AppError('Current EDIFACT message is required for context.', 400));
    }
    try {
        // Build context from chat history
        const historyContext = chatHistory && Array.isArray(chatHistory)
            ? chatHistory.map((msg) => `${msg.role === 'user' ? 'Nutzer' : 'Assistent'}: ${msg.content}`).join('\n')
            : '';
        const prompt = `Du bist ein Experte für EDIFACT-Nachrichten in der deutschen Energiewirtschaft (edi@energy). 
      
Aktuelle EDIFACT-Nachricht:
${currentEdifactMessage}

${historyContext ? `Bisheriger Gesprächsverlauf:\n${historyContext}\n` : ''}

Benutzerfrage: ${message}

Beantworte die Frage präzise und verständlich auf Deutsch. Beziehe dich auf die konkrete EDIFACT-Nachricht und nutze dein Expertenwissen zu Formaten wie MSCONS, UTILMD, ORDERS, INVOIC, etc.`;
        const response = await llmProvider_1.default.generateText(prompt);
        res.status(200).json({
            success: true,
            data: {
                response,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Error in message analyzer chat:', error);
        next(new errors_1.AppError('Fehler beim Verarbeiten der Chat-Anfrage', 500));
    }
});
// Modify EDIFACT message based on natural language instruction
router.post('/modify', auth_1.requireAuth, async (req, res, next) => {
    const { instruction, currentMessage } = req.body;
    if (!instruction || typeof instruction !== 'string') {
        return next(new errors_1.AppError('Modification instruction is required.', 400));
    }
    if (!currentMessage || typeof currentMessage !== 'string') {
        return next(new errors_1.AppError('Current message is required.', 400));
    }
    try {
        // Use LLM to modify the message based on instruction
        const prompt = `Du bist ein Experte für EDIFACT-Nachrichten in der deutschen Energiewirtschaft (edi@energy).

Aktuelle EDIFACT-Nachricht:
${currentMessage}

Änderungsauftrag: ${instruction}

WICHTIG: 
1. Führe die gewünschte Änderung durch und gib die VOLLSTÄNDIGE modifizierte EDIFACT-Nachricht zurück
2. Behalte das EDIFACT-Format exakt bei (Trennzeichen, Segmentstruktur, etc.)
3. Achte auf korrekte Syntax und Formatkonventionen
4. Gib NUR die modifizierte Nachricht zurück, keine Erklärungen
5. Stelle sicher, dass alle Pflichtfelder erhalten bleiben

Modifizierte EDIFACT-Nachricht:`;
        const modifiedMessage = await llmProvider_1.default.generateText(prompt);
        // Clean up the response (remove potential markdown formatting)
        const cleanedMessage = modifiedMessage
            .replace(/```edifact\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        // Validate basic EDIFACT structure
        const isValid = await messageAnalyzerService.validateEdifactStructure(cleanedMessage);
        res.status(200).json({
            success: true,
            data: {
                modifiedMessage: cleanedMessage,
                isValid,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Error modifying message:', error);
        next(new errors_1.AppError('Fehler beim Modifizieren der Nachricht', 500));
    }
});
// Validate EDIFACT message structure and semantics
router.post('/validate', auth_1.requireAuth, async (req, res, next) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
        return next(new errors_1.AppError('Message content is required.', 400));
    }
    try {
        const validation = await messageAnalyzerService.validateEdifactMessage(message);
        res.status(200).json({
            success: true,
            data: validation
        });
    }
    catch (error) {
        console.error('Error validating message:', error);
        next(new errors_1.AppError('Fehler beim Validieren der Nachricht', 500));
    }
});
//# sourceMappingURL=message-analyzer.js.map