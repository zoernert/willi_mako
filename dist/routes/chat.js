"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const errorHandler_1 = require("../middleware/errorHandler");
const database_1 = __importDefault(require("../config/database"));
const gemini_1 = __importDefault(require("../services/gemini"));
const qdrant_1 = require("../services/qdrant");
const flip_mode_1 = __importDefault(require("../services/flip-mode"));
const contextManager_1 = __importDefault(require("../services/contextManager"));
const advancedReasoningService_1 = __importDefault(require("../services/advancedReasoningService"));
const gamification_service_1 = require("../modules/quiz/gamification.service");
const router = (0, express_1.Router)();
const qdrantService = new qdrant_1.QdrantService();
const gamificationService = new gamification_service_1.GamificationService();
class AdvancedRetrieval {
    async getContextualCompressedResults(query, userPreferences, limit = 10) {
        try {
            const optimizedResults = await qdrantService.searchWithOptimizations(query, limit * 2, 0.3, true);
            if (optimizedResults.length === 0) {
                const searchQueries = await gemini_1.default.generateSearchQueries(query);
                const allResults = [];
                for (const q of searchQueries) {
                    const results = await qdrantService.search('system', q, limit);
                    allResults.push(...results);
                }
                const uniqueResults = this.removeDuplicates(allResults);
                if (uniqueResults.length === 0) {
                    return [];
                }
                const synthesizedContext = await gemini_1.default.synthesizeContext(query, uniqueResults);
                return [
                    {
                        payload: {
                            text: synthesizedContext,
                        },
                        score: 1.0,
                        id: (0, uuid_1.v4)(),
                    },
                ];
            }
            const uniqueResults = this.removeDuplicates(optimizedResults);
            const contextualizedResults = this.enhanceResultsWithChunkTypeContext(uniqueResults);
            const synthesizedContext = await gemini_1.default.synthesizeContextWithChunkTypes(query, contextualizedResults);
            return [
                {
                    payload: {
                        text: synthesizedContext,
                        sources: uniqueResults.map(r => ({
                            source_document: r.payload?.document_metadata?.document_base_name || 'Unknown',
                            page_number: r.payload?.page_number || 'N/A',
                            chunk_type: r.payload?.chunk_type || 'paragraph',
                            score: r.score
                        }))
                    },
                    score: 1.0,
                    id: (0, uuid_1.v4)(),
                },
            ];
        }
        catch (error) {
            console.error('Error in advanced retrieval:', error);
            return [];
        }
    }
    enhanceResultsWithChunkTypeContext(results) {
        return results.map(result => {
            const chunkType = result.payload?.chunk_type || 'paragraph';
            let contextualPrefix = '';
            switch (chunkType) {
                case 'structured_table':
                    contextualPrefix = '[TABELLE] ';
                    break;
                case 'definition':
                    contextualPrefix = '[DEFINITION] ';
                    break;
                case 'abbreviation':
                    contextualPrefix = '[ABKÜRZUNG] ';
                    break;
                case 'visual_summary':
                    contextualPrefix = '[DIAGRAMM-BESCHREIBUNG] ';
                    break;
                case 'full_page':
                    contextualPrefix = '[VOLLTEXT] ';
                    break;
                default:
                    contextualPrefix = '[ABSATZ] ';
            }
            return {
                ...result,
                payload: {
                    ...result.payload,
                    contextual_content: contextualPrefix + (result.payload?.text || result.payload?.content || ''),
                    chunk_type_description: this.getChunkTypeDescription(chunkType)
                }
            };
        });
    }
    getChunkTypeDescription(chunkType) {
        const descriptions = {
            'structured_table': 'Tabellarische Darstellung von Daten',
            'definition': 'Offizielle Definition eines Begriffs',
            'abbreviation': 'Erklärung einer Abkürzung',
            'visual_summary': 'Textuelle Beschreibung eines Diagramms oder einer visuellen Darstellung',
            'full_page': 'Vollständiger Seiteninhalt',
            'paragraph': 'Textabsatz'
        };
        return descriptions[chunkType] || 'Allgemeiner Textinhalt';
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
    const { content, contextSettings } = req.body;
    const userId = req.user.id;
    const startTime = Date.now();
    if (!content) {
        throw new errorHandler_1.AppError('Message content is required', 400);
    }
    const chatResult = await database_1.default.query('SELECT id, flip_mode_used FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (chatResult.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    const chat = chatResult.rows[0];
    const userMessage = await database_1.default.query('INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at', [chatId, 'user', content]);
    if (!chat.flip_mode_used) {
        const clarificationResult = await flip_mode_1.default.analyzeClarificationNeed(content, userId);
        if (clarificationResult.needsClarification) {
            const clarificationMessageContent = JSON.stringify({
                type: 'clarification',
                clarificationResult,
            });
            const assistantMessage = await database_1.default.query('INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at', [chatId, 'assistant', clarificationMessageContent, { type: 'clarification' }]);
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
    }
    const previousMessages = await database_1.default.query('SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
    const userPreferences = await database_1.default.query('SELECT companies_of_interest, preferred_topics FROM user_preferences WHERE user_id = $1', [userId]);
    const reasoningPromise = advancedReasoningService_1.default.generateReasonedResponse(content, previousMessages.rows, userPreferences.rows[0] || {}, contextSettings);
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('REASONING_TIMEOUT')), 30000);
    });
    let reasoningResult;
    try {
        reasoningResult = await Promise.race([reasoningPromise, timeoutPromise]);
    }
    catch (error) {
        if (error.message === 'REASONING_TIMEOUT') {
            console.warn('⚠️ Advanced reasoning timed out, using fallback');
            const fallbackContext = await retrieval.getContextualCompressedResults(content, userPreferences.rows[0] || {}, 5);
            const contextText = fallbackContext.map(r => r.payload?.text || '').join('\n');
            const fallbackResponse = await gemini_1.default.generateResponse(previousMessages.rows.map(msg => ({ role: msg.role, content: msg.content })), contextText, userPreferences.rows[0] || {});
            reasoningResult = {
                response: fallbackResponse,
                reasoningSteps: [{
                        step: 'timeout_fallback',
                        description: 'Used fallback due to timeout',
                        timestamp: Date.now()
                    }],
                finalQuality: 0.7,
                iterationsUsed: 1,
                contextAnalysis: { topicsIdentified: [], informationGaps: [], contextQuality: 0.7 },
                qaAnalysis: { needsMoreContext: false, answerable: true, confidence: 0.7, missingInfo: [] },
                pipelineDecisions: { useIterativeRefinement: false, maxIterations: 1, confidenceThreshold: 0.8, reason: 'Timeout fallback' },
                apiCallsUsed: 2
            };
        }
        else {
            throw error;
        }
    }
    let aiResponse = reasoningResult.response;
    let responseMetadata = {
        contextSources: reasoningResult.reasoningSteps.filter((step) => step.step === 'context_analysis').length,
        userContextUsed: false,
        contextReason: 'Advanced multi-step reasoning pipeline used',
        reasoningSteps: reasoningResult.reasoningSteps,
        finalQuality: reasoningResult.finalQuality,
        iterationsUsed: reasoningResult.iterationsUsed,
        qdrantQueries: reasoningResult.reasoningSteps.reduce((sum, step) => sum + (step.qdrantQueries?.length || 0), 0),
        qdrantResults: reasoningResult.reasoningSteps.reduce((sum, step) => sum + (step.qdrantResults || 0), 0),
        semanticClusters: reasoningResult.contextAnalysis.semanticClusters?.length || 0,
        pipelineDecisions: reasoningResult.pipelineDecisions,
        qaAnalysis: reasoningResult.qaAnalysis,
        contextAnalysis: reasoningResult.contextAnalysis
    };
    let userContext = null;
    if (contextSettings?.includeUserDocuments || contextSettings?.includeUserNotes) {
        const contextResult = await contextManager_1.default.determineOptimalContext(content, userId, previousMessages.rows.slice(-5), contextSettings);
        userContext = contextResult.userContext;
        const contextDecision = contextResult.contextDecision;
        if (contextDecision.useUserContext && (userContext.userDocuments.length > 0 || userContext.userNotes.length > 0)) {
            let contextMode = 'standard';
            if (contextSettings?.useWorkspaceOnly) {
                contextMode = 'workspace-only';
            }
            else if (contextSettings && !contextSettings.includeSystemKnowledge) {
                contextMode = 'workspace-only';
            }
            else if (contextSettings && !contextSettings.includeUserDocuments && !contextSettings.includeUserNotes) {
                contextMode = 'system-only';
            }
            aiResponse = await gemini_1.default.generateResponseWithUserContext(previousMessages.rows.map(msg => ({ role: msg.role, content: msg.content })), reasoningResult.response, userContext.userDocuments, userContext.userNotes, userPreferences.rows[0] || {}, contextMode);
            responseMetadata = {
                ...responseMetadata,
                userContextUsed: true,
                contextReason: contextDecision.reason,
                userDocumentsUsed: userContext.userDocuments.length,
                userNotesUsed: userContext.userNotes.length,
                contextSummary: userContext.contextSummary
            };
        }
    }
    const assistantMessage = await database_1.default.query('INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at', [chatId, 'assistant', aiResponse, JSON.stringify(responseMetadata)]);
    await database_1.default.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);
    if (responseMetadata.userDocumentsUsed && responseMetadata.userDocumentsUsed > 0 && userContext?.suggestedDocuments) {
        try {
            for (const document of userContext.suggestedDocuments) {
                if (document && document.id && typeof document.id === 'string') {
                    await gamificationService.awardDocumentUsagePoints(document.id, chatId);
                }
            }
        }
        catch (error) {
            console.error('Error awarding document usage points:', error);
        }
    }
    const messageCountResult = await database_1.default.query('SELECT COUNT(*) FROM messages WHERE chat_id = $1 AND role = $2', [chatId, 'assistant']);
    let updatedChatTitle = null;
    if (parseInt(messageCountResult.rows[0].count) === 1) {
        try {
            const generatedTitle = await gemini_1.default.generateChatTitle(userMessage.rows[0].content, aiResponse);
            await database_1.default.query('UPDATE chats SET title = $1 WHERE id = $2', [generatedTitle, chatId]);
            updatedChatTitle = generatedTitle;
        }
        catch (error) {
            console.error('Error generating chat title:', error);
        }
    }
    const totalResponseTime = Date.now() - startTime;
    console.log(`📊 Chat response completed in ${totalResponseTime}ms (API calls: ${reasoningResult.apiCallsUsed || 'unknown'})`);
    return res.json({
        success: true,
        data: {
            userMessage: userMessage.rows[0],
            assistantMessage: assistantMessage.rows[0],
            updatedChatTitle,
            type: 'normal'
        }
    });
}));
router.post('/chats/:chatId/generate', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const { originalQuery, clarificationResponses } = req.body;
    const userId = req.user.id;
    if (!originalQuery) {
        throw new errorHandler_1.AppError('Original query is required', 400);
    }
    const chat = await database_1.default.query('SELECT id FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (chat.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    const enhancedQuery = await flip_mode_1.default.buildEnhancedQuery(originalQuery, userId, clarificationResponses);
    const userPreferences = await database_1.default.query('SELECT companies_of_interest, preferred_topics FROM user_preferences WHERE user_id = $1', [userId]);
    const contextResults = await retrieval.getContextualCompressedResults(enhancedQuery, userPreferences.rows[0] || {}, 10);
    const context = contextResults.map(result => result.payload.text).join('\n\n');
    const previousMessages = await database_1.default.query('SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
    const messagesForGeneration = previousMessages.rows.map(msg => ({ role: msg.role, content: msg.content }));
    messagesForGeneration.push({ role: 'user', content: enhancedQuery });
    const aiResponse = await gemini_1.default.generateResponse(messagesForGeneration, context, userPreferences.rows[0] || {}, true);
    const assistantMessage = await database_1.default.query('INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at', [chatId, 'assistant', aiResponse, JSON.stringify({
            contextSources: contextResults.length,
            enhancedQuery: true,
            originalQuery: originalQuery,
        })]);
    await database_1.default.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP, flip_mode_used = TRUE WHERE id = $1', [chatId]);
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