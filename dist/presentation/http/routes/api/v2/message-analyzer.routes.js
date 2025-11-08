"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/presentation/http/routes/api/v2/message-analyzer.routes.ts
const express_1 = require("express");
const auth_1 = require("../../../../../middleware/auth");
const errorHandler_1 = require("../../../../../middleware/errorHandler");
const rateLimiter_1 = require("../../../../../middleware/api-v2/rateLimiter");
const message_analyzer_service_1 = require("../../../../../modules/message-analyzer/services/message-analyzer.service");
const llmProvider_1 = __importDefault(require("../../../../../services/llmProvider"));
const router = (0, express_1.Router)();
const messageAnalyzerService = new message_analyzer_service_1.MessageAnalyzerService();
/**
 * POST /message-analyzer/analyze
 * Strukturanalyse einer EDIFACT-Nachricht
 */
router.post('/analyze', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
        throw new errorHandler_1.AppError('Message content is required and must be a string.', 400);
    }
    const result = await messageAnalyzerService.analyze(message);
    res.status(200).json({
        success: true,
        data: result
    });
}));
/**
 * POST /message-analyzer/explanation
 * KI-generierte verständliche Erklärung einer EDIFACT-Nachricht
 */
router.post('/explanation', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
        throw new errorHandler_1.AppError('Message content is required and must be a string.', 400);
    }
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
}));
/**
 * POST /message-analyzer/chat
 * Interaktiver Chat über eine EDIFACT-Nachricht
 */
router.post('/chat', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { message, chatHistory, currentEdifactMessage } = req.body;
    if (!message || typeof message !== 'string') {
        throw new errorHandler_1.AppError('Message content is required and must be a string.', 400);
    }
    if (!currentEdifactMessage || typeof currentEdifactMessage !== 'string') {
        throw new errorHandler_1.AppError('Current EDIFACT message is required for context.', 400);
    }
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
}));
/**
 * POST /message-analyzer/modify
 * Modifizierung einer EDIFACT-Nachricht basierend auf natürlichsprachlicher Anweisung
 */
router.post('/modify', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { instruction, currentMessage } = req.body;
    if (!instruction || typeof instruction !== 'string') {
        throw new errorHandler_1.AppError('Modification instruction is required.', 400);
    }
    if (!currentMessage || typeof currentMessage !== 'string') {
        throw new errorHandler_1.AppError('Current message is required.', 400);
    }
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
}));
/**
 * POST /message-analyzer/validate
 * Validierung einer EDIFACT-Nachricht (Struktur und Semantik)
 */
router.post('/validate', auth_1.authenticateToken, (0, rateLimiter_1.apiV2RateLimiter)(), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
        throw new errorHandler_1.AppError('Message content is required.', 400);
    }
    const validation = await messageAnalyzerService.validateEdifactMessage(message);
    res.status(200).json({
        success: true,
        data: validation
    });
}));
exports.default = router;
//# sourceMappingURL=message-analyzer.routes.js.map