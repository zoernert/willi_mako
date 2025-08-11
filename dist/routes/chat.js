"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const database_1 = __importDefault(require("../config/database"));
const gemini_1 = __importDefault(require("../services/gemini"));
const qdrant_1 = __importDefault(require("../services/qdrant"));
const flip_mode_1 = __importDefault(require("../services/flip-mode"));
const router = (0, express_1.Router)();
class AdvancedRetrieval {
    async getContextualCompressedResults(query, userPreferences, limit = 20) {
        try {
            const queryEmbedding = await gemini_1.default.generateEmbedding(query);
            const queryVariations = await this.generateQueryVariations(query);
            const allResults = [];
            for (const variation of queryVariations) {
                const variationEmbedding = await gemini_1.default.generateEmbedding(variation);
                const results = await qdrant_1.default.searchSimilar(variationEmbedding, limit / queryVariations.length);
                allResults.push(...results);
            }
            const uniqueResults = this.removeDuplicates(allResults);
            const compressedResults = await this.applyContextualCompression(uniqueResults, query, userPreferences);
            return compressedResults.slice(0, limit);
        }
        catch (error) {
            console.error('Error in advanced retrieval:', error);
            return [];
        }
    }
    async generateQueryVariations(query) {
        const variations = [query];
        const companyTerms = ['Stadtwerke', 'Energieversorger', 'Netzbetreiber', 'Stromanbieter'];
        for (const term of companyTerms) {
            if (query.toLowerCase().includes(term.toLowerCase())) {
                variations.push(`${query} ${term}`);
            }
        }
        const topicTerms = ['Marktkommunikation', 'Bilanzierung', 'Regulierung', 'Smart Meter'];
        for (const term of topicTerms) {
            if (query.toLowerCase().includes(term.toLowerCase())) {
                variations.push(`${query} ${term}`);
            }
        }
        return variations;
    }
    removeDuplicates(results) {
        const seen = new Set();
        return results.filter(result => {
            if (seen.has(result.id)) {
                return false;
            }
            seen.add(result.id);
            return true;
        });
    }
    async applyContextualCompression(results, query, userPreferences) {
        const filteredResults = results.filter(result => {
            if (userPreferences.companiesOfInterest && userPreferences.companiesOfInterest.length > 0) {
                const hasCompanyMatch = userPreferences.companiesOfInterest.some((company) => result.payload.text.toLowerCase().includes(company.toLowerCase()));
                if (hasCompanyMatch) {
                    result.score += 0.1;
                }
            }
            if (userPreferences.preferredTopics && userPreferences.preferredTopics.length > 0) {
                const hasTopicMatch = userPreferences.preferredTopics.some((topic) => result.payload.text.toLowerCase().includes(topic.toLowerCase()));
                if (hasTopicMatch) {
                    result.score += 0.1;
                }
            }
            return result.score > 0.6;
        });
        return filteredResults.sort((a, b) => b.score - a.score);
    }
}
const retrieval = new AdvancedRetrieval();
router.get('/chats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const chats = await database_1.default.query('SELECT id, title, created_at, updated_at FROM chats WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
    res.json({
        success: true,
        data: chats.rows
    });
}));
router.get('/chats/:chatId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.id;
    const chat = await database_1.default.query('SELECT id, title, created_at, updated_at FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (chat.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    const messages = await database_1.default.query('SELECT id, role, content, metadata, created_at FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
    res.json({
        success: true,
        data: {
            chat: chat.rows[0],
            messages: messages.rows
        }
    });
}));
router.post('/chats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { title } = req.body;
    const userId = req.user.id;
    const chat = await database_1.default.query('INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at, updated_at', [userId, title || 'Neuer Chat']);
    res.status(201).json({
        success: true,
        data: chat.rows[0]
    });
}));
router.post('/chats/:chatId/messages', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    if (!content) {
        throw new errorHandler_1.AppError('Message content is required', 400);
    }
    const chat = await database_1.default.query('SELECT id FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (chat.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    const userPreferences = await database_1.default.query('SELECT companies_of_interest, preferred_topics FROM user_preferences WHERE user_id = $1', [userId]);
    const userMessage = await database_1.default.query('INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at', [chatId, 'user', content]);
    const previousMessages = await database_1.default.query('SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
    const clarificationResult = await flip_mode_1.default.analyzeClarificationNeed(content, userId);
    if (clarificationResult.needsClarification) {
        const clarificationMessage = {
            type: 'clarification',
            content: 'Ich möchte Ihnen die bestmögliche Antwort geben! Mit ein paar zusätzlichen Informationen kann ich Ihnen eine viel zielgerichtetere Antwort liefern.',
            clarificationResult,
            reasoning: clarificationResult.reasoning
        };
        const assistantMessage = await database_1.default.query('INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at', [chatId, 'assistant', JSON.stringify(clarificationMessage), JSON.stringify({
                type: 'clarification',
                sessionId: clarificationResult.sessionId,
                ambiguityScore: clarificationResult.ambiguityScore
            })]);
        await database_1.default.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);
        return res.json({
            success: true,
            data: {
                userMessage: userMessage.rows[0],
                assistantMessage: assistantMessage.rows[0],
                type: 'clarification'
            }
        });
    }
    const contextResults = await retrieval.getContextualCompressedResults(content, userPreferences.rows[0] || {}, 10);
    const context = contextResults
        .map(result => result.payload.text)
        .join('\n\n');
    const aiResponse = await gemini_1.default.generateResponse(previousMessages.rows.map(msg => ({ role: msg.role, content: msg.content })), context, userPreferences.rows[0] || {});
    const assistantMessage = await database_1.default.query('INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at', [chatId, 'assistant', aiResponse, JSON.stringify({ contextSources: contextResults.length })]);
    await database_1.default.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);
    const messageCount = await database_1.default.query('SELECT COUNT(*) FROM messages WHERE chat_id = $1 AND role = $2', [chatId, 'assistant']);
    let updatedChatTitle = null;
    if (parseInt(messageCount.rows[0].count) === 1) {
        try {
            const generatedTitle = await gemini_1.default.generateChatTitle(userMessage.rows[0].content, aiResponse);
            await database_1.default.query('UPDATE chats SET title = $1 WHERE id = $2', [generatedTitle, chatId]);
            updatedChatTitle = generatedTitle;
        }
        catch (error) {
            console.error('Error generating chat title:', error);
        }
    }
    return res.json({
        success: true,
        data: {
            userMessage: userMessage.rows[0],
            assistantMessage: assistantMessage.rows[0],
            updatedChatTitle: updatedChatTitle,
            type: 'normal'
        }
    });
}));
router.post('/chats/:chatId/clarification', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const { sessionId, responses } = req.body;
    const userId = req.user.id;
    if (!sessionId || !responses) {
        throw new errorHandler_1.AppError('Session ID and responses are required', 400);
    }
    const chat = await database_1.default.query('SELECT id FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (chat.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    for (const response of responses) {
        await flip_mode_1.default.recordClarificationResponse(sessionId, response.questionId, response.answer);
    }
    const enhancedQuery = await flip_mode_1.default.buildEnhancedQuery(sessionId);
    const userPreferences = await database_1.default.query('SELECT companies_of_interest, preferred_topics FROM user_preferences WHERE user_id = $1', [userId]);
    const contextResults = await retrieval.getContextualCompressedResults(enhancedQuery, userPreferences.rows[0] || {}, 10);
    const context = contextResults
        .map(result => result.payload.text)
        .join('\n\n');
    const previousMessages = await database_1.default.query('SELECT role, content, metadata FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
    const filteredMessages = previousMessages.rows.filter(msg => {
        try {
            const metadata = msg.metadata ?
                (typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata) : {};
            return metadata.type !== 'clarification';
        }
        catch (error) {
            console.error('Error parsing metadata:', error, msg.metadata);
            return true;
        }
    });
    const messagesForGeneration = filteredMessages.map(msg => ({ role: msg.role, content: msg.content }));
    if (messagesForGeneration.length > 0 && messagesForGeneration[messagesForGeneration.length - 1].role === 'user') {
        messagesForGeneration[messagesForGeneration.length - 1].content = enhancedQuery;
    }
    else {
        messagesForGeneration.push({ role: 'user', content: enhancedQuery });
    }
    const aiResponse = await gemini_1.default.generateResponse(messagesForGeneration, context, userPreferences.rows[0] || {}, true);
    const assistantMessage = await database_1.default.query('INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at', [chatId, 'assistant', aiResponse, JSON.stringify({
            contextSources: contextResults.length,
            clarificationSessionId: sessionId,
            enhancedQuery: true
        })]);
    await database_1.default.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);
    await flip_mode_1.default.completeSession(sessionId);
    res.json({
        success: true,
        data: {
            assistantMessage: assistantMessage.rows[0],
            type: 'enhanced_response'
        }
    });
}));
router.delete('/chats/:chatId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.id;
    const result = await database_1.default.query('DELETE FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (result.rowCount === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    res.json({
        success: true,
        message: 'Chat deleted successfully'
    });
}));
router.put('/chats/:chatId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const { title } = req.body;
    const userId = req.user.id;
    if (!title) {
        throw new errorHandler_1.AppError('Title is required', 400);
    }
    const result = await database_1.default.query('UPDATE chats SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING id, title, updated_at', [title, chatId, userId]);
    if (result.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    res.json({
        success: true,
        data: result.rows[0]
    });
}));
exports.default = router;
//# sourceMappingURL=chat.js.map