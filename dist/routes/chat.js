"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
// Initialize services
const qdrantService = new qdrant_1.QdrantService();
const gamificationService = new gamification_service_1.GamificationService();
// CR-CS30: Helper function to generate CS30 additional response
async function generateCs30AdditionalResponse(userQuery, userHasCs30Access) {
    if (!userHasCs30Access) {
        console.log('🔍 CS30: User does not have cs30 access');
        return { hasCs30Response: false };
    }
    try {
        // Check if cs30 collection is available
        const isCs30Available = await qdrantService.isCs30Available();
        if (!isCs30Available) {
            console.log('🔍 CS30: Collection not available, skipping cs30 response');
            return { hasCs30Response: false };
        }
        console.log('🔍 CS30: Collection available, searching...');
        // Search cs30 collection for relevant content with lower threshold for testing
        const cs30Results = await qdrantService.searchCs30(userQuery, 3, 0.60); // Lowered from 0.80 to 0.60
        console.log(`🔍 CS30: Found ${cs30Results.length} results`);
        if (cs30Results.length > 0) {
            console.log('🔍 CS30: Top result score:', cs30Results[0].score);
        }
        if (cs30Results.length === 0) {
            console.log('🔍 CS30: No relevant results found above threshold');
            return { hasCs30Response: false };
        }
        // Extract context from cs30 results
        const cs30Context = cs30Results.map(result => {
            var _a, _b;
            // CS30 uses 'content' field instead of 'text'
            return ((_a = result.payload) === null || _a === void 0 ? void 0 : _a.content) || ((_b = result.payload) === null || _b === void 0 ? void 0 : _b.text) || '';
        }).join('\n\n');
        console.log('🔍 CS30: Generating response with context length:', cs30Context.length);
        // Generate cs30-specific response
        const cs30Response = await gemini_1.default.generateResponse([{ role: 'user', content: userQuery }], cs30Context, {}, false // not enhanced query
        );
        console.log(`✅ CS30: Generated response with ${cs30Results.length} sources`);
        return {
            hasCs30Response: true,
            cs30Response: cs30Response,
            cs30Sources: cs30Results.map(r => {
                var _a, _b, _c, _d;
                return ({
                    source_document: ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.source) || 'Schleupen Dokumentation',
                    content_type: ((_b = r.payload) === null || _b === void 0 ? void 0 : _b.type) || 'N/A',
                    document_name: ((_c = r.payload) === null || _c === void 0 ? void 0 : _c.document_name) || null,
                    chunk_type: ((_d = r.payload) === null || _d === void 0 ? void 0 : _d.chunk_type) || null,
                    score: r.score
                });
            })
        };
    }
    catch (error) {
        console.error('❌ CS30: Error generating response:', error);
        return { hasCs30Response: false };
    }
}
// Advanced retrieval service for contextual compression
class AdvancedRetrieval {
    async getContextualCompressedResults(query, userPreferences, // userPreferences is kept for interface consistency, but not used in the new flow
    limit = 10) {
        try {
            // 1. Optimierte Suche mit Pre-Filtering und Query-Transformation
            const optimizedResults = await qdrantService.searchWithOptimizations(query, limit * 2, // Hole mehr Ergebnisse für bessere Synthese
            0.3, // Niedrigerer Threshold für mehr Ergebnisse
            true // Verwende HyDE
            );
            if (optimizedResults.length === 0) {
                // Fallback zur normalen Suche
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
                // Context Synthesis für Fallback
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
            // 2. Entferne Duplikate
            const uniqueResults = this.removeDuplicates(optimizedResults);
            // 3. Intelligente Post-Processing basierend auf chunk_type
            const contextualizedResults = this.enhanceResultsWithChunkTypeContext(uniqueResults);
            // 4. Context Synthesis mit verbessertem Kontext
            const synthesizedContext = await gemini_1.default.synthesizeContextWithChunkTypes(query, contextualizedResults);
            // Return the synthesized context in the expected format
            return [
                {
                    payload: {
                        text: synthesizedContext,
                        sources: uniqueResults.map(r => {
                            var _a, _b, _c, _d;
                            return ({
                                source_document: ((_b = (_a = r.payload) === null || _a === void 0 ? void 0 : _a.document_metadata) === null || _b === void 0 ? void 0 : _b.document_base_name) || 'Unknown',
                                page_number: ((_c = r.payload) === null || _c === void 0 ? void 0 : _c.page_number) || 'N/A',
                                chunk_type: ((_d = r.payload) === null || _d === void 0 ? void 0 : _d.chunk_type) || 'paragraph',
                                score: r.score
                            });
                        })
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
    /**
     * Erweitert Ergebnisse mit kontextspezifischen Informationen basierend auf chunk_type
     */
    enhanceResultsWithChunkTypeContext(results) {
        return results.map(result => {
            var _a, _b, _c;
            const chunkType = ((_a = result.payload) === null || _a === void 0 ? void 0 : _a.chunk_type) || 'paragraph';
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
                    contextual_content: contextualPrefix + (((_b = result.payload) === null || _b === void 0 ? void 0 : _b.text) || ((_c = result.payload) === null || _c === void 0 ? void 0 : _c.content) || ''),
                    chunk_type_description: this.getChunkTypeDescription(chunkType)
                }
            };
        });
    }
    /**
     * Beschreibt den Typ des Chunks für besseren Kontext
     */
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
// Get user's chats
router.get('/chats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const chats = await database_1.default.query('SELECT id, title, created_at, updated_at FROM chats WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
    res.json({
        success: true,
        data: chats.rows
    });
}));
// Get specific chat with messages
router.get('/chats/:chatId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.id;
    // Verify chat belongs to user
    const chat = await database_1.default.query('SELECT id, title, created_at, updated_at FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (chat.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    // Get messages
    const messages = await database_1.default.query('SELECT id, role, content, metadata, created_at FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
    res.json({
        success: true,
        data: {
            chat: chat.rows[0],
            messages: messages.rows
        }
    });
}));
// Create new chat
router.post('/chats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { title } = req.body;
    const userId = req.user.id;
    const chat = await database_1.default.query('INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at, updated_at', [userId, title || 'Neuer Chat']);
    res.status(201).json({
        success: true,
        data: chat.rows[0]
    });
}));
// Send message in chat
router.post('/chats/:chatId/messages', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a, _b, _c, _d;
    const { chatId } = req.params;
    const { content, contextSettings, timelineId } = req.body;
    const userId = req.user.id;
    const startTime = Date.now();
    if (!content) {
        throw new errorHandler_1.AppError('Message content is required', 400);
    }
    // Verify chat belongs to user and get flip_mode_used status
    const chatResult = await database_1.default.query('SELECT id, flip_mode_used FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (chatResult.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    const chat = chatResult.rows[0];
    // Save user message
    const userMessage = await database_1.default.query('INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at', [chatId, 'user', content]);
    // Check if Flip Mode should be activated
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
    // Proceed with normal response generation using configured pipeline
    const previousMessages = await database_1.default.query('SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
    const userPreferences = await database_1.default.query('SELECT companies_of_interest, preferred_topics FROM user_preferences WHERE user_id = $1', [userId]);
    // Use the advanced reasoning pipeline for better quality responses with timeout protection
    const reasoningPromise = advancedReasoningService_1.default.generateReasonedResponse(content, previousMessages.rows, userPreferences.rows[0] || {}, contextSettings);
    // Add timeout protection (120 seconds for complex queries)
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('REASONING_TIMEOUT')), 120000);
    });
    let reasoningResult;
    try {
        reasoningResult = await Promise.race([reasoningPromise, timeoutPromise]);
    }
    catch (error) {
        if (error.message === 'REASONING_TIMEOUT') {
            console.warn('⚠️ Advanced reasoning timed out, using fallback');
            // Fallback to simple response
            const fallbackContext = await retrieval.getContextualCompressedResults(content, userPreferences.rows[0] || {}, 5);
            const contextText = fallbackContext.map(r => { var _a; return ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.text) || ''; }).join('\n');
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
        qdrantQueries: reasoningResult.reasoningSteps.reduce((sum, step) => { var _a; return sum + (((_a = step.qdrantQueries) === null || _a === void 0 ? void 0 : _a.length) || 0); }, 0),
        qdrantResults: reasoningResult.reasoningSteps.reduce((sum, step) => sum + (step.qdrantResults || 0), 0),
        semanticClusters: ((_a = reasoningResult.contextAnalysis.semanticClusters) === null || _a === void 0 ? void 0 : _a.length) || 0,
        pipelineDecisions: reasoningResult.pipelineDecisions,
        qaAnalysis: reasoningResult.qaAnalysis,
        contextAnalysis: reasoningResult.contextAnalysis
    };
    // Check if we need to enhance with user context (fallback to existing logic if needed)
    let userContext = null;
    if ((contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.includeUserDocuments) || (contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.includeUserNotes)) {
        const contextResult = await contextManager_1.default.determineOptimalContext(content, userId, previousMessages.rows.slice(-5), contextSettings);
        userContext = contextResult.userContext;
        const contextDecision = contextResult.contextDecision;
        if (contextDecision.useUserContext && (userContext.userDocuments.length > 0 || userContext.userNotes.length > 0)) {
            // Enhance the response with user context
            let contextMode = 'standard';
            if (contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.useWorkspaceOnly) {
                contextMode = 'workspace-only';
            }
            else if (contextSettings && !contextSettings.includeSystemKnowledge) {
                contextMode = 'workspace-only';
            }
            else if (contextSettings && !contextSettings.includeUserDocuments && !contextSettings.includeUserNotes) {
                contextMode = 'system-only';
            }
            aiResponse = await gemini_1.default.generateResponseWithUserContext(previousMessages.rows.map(msg => ({ role: msg.role, content: msg.content })), reasoningResult.response, // Use reasoning result as enhanced context
            userContext.userDocuments, userContext.userNotes, userPreferences.rows[0] || {}, contextMode);
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
    // Award points for document usage if documents were used in the response
    if (responseMetadata.userDocumentsUsed && responseMetadata.userDocumentsUsed > 0 && (userContext === null || userContext === void 0 ? void 0 : userContext.suggestedDocuments)) {
        try {
            for (const document of userContext.suggestedDocuments) {
                // Ensure document has a valid ID before awarding points
                if (document && document.id && typeof document.id === 'string') {
                    await gamificationService.awardDocumentUsagePoints(document.id, chatId);
                }
            }
        }
        catch (error) {
            console.error('Error awarding document usage points:', error);
            // Don't fail the chat response if points awarding fails
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
    // CR-CS30: Check if user has cs30 access and generate additional response
    const userQuery = await database_1.default.query('SELECT can_access_cs30 FROM users WHERE id = $1', [userId]);
    const userHasCs30Access = ((_b = userQuery.rows[0]) === null || _b === void 0 ? void 0 : _b.can_access_cs30) || false;
    console.log(`🔍 CS30 Access Check: User ${userId} has cs30 access: ${userHasCs30Access}`);
    // Generate CS30 additional response asynchronously (don't block primary response)
    let cs30ResponsePromise = null;
    if (userHasCs30Access) {
        console.log(`🔍 Starting CS30 search for query: "${content}"`);
        cs30ResponsePromise = generateCs30AdditionalResponse(content, userHasCs30Access);
    }
    // Prepare primary response data
    const primaryResponseData = {
        userMessage: userMessage.rows[0],
        assistantMessage: assistantMessage.rows[0],
        updatedChatTitle,
        type: 'normal'
    };
    // If cs30 access is enabled, wait for cs30 response and include if relevant
    if (cs30ResponsePromise) {
        try {
            const cs30Result = await cs30ResponsePromise;
            if (cs30Result.hasCs30Response) {
                // Save CS30 additional response as separate message
                const cs30Message = await database_1.default.query('INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at', [chatId, 'assistant', cs30Result.cs30Response, JSON.stringify({
                        type: 'cs30_additional',
                        sources: cs30Result.cs30Sources,
                        sourceCount: ((_c = cs30Result.cs30Sources) === null || _c === void 0 ? void 0 : _c.length) || 0
                    })]);
                console.log(`✅ Added CS30 additional response with ${((_d = cs30Result.cs30Sources) === null || _d === void 0 ? void 0 : _d.length) || 0} sources`);
                // Timeline-Integration (falls timelineId übergeben)
                if (timelineId) {
                    try {
                        const { TimelineActivityService } = await Promise.resolve().then(() => __importStar(require('../services/TimelineActivityService')));
                        const timelineService = new TimelineActivityService(database_1.default);
                        // Timeline-Aktivität erfassen
                        await timelineService.captureActivity({
                            timelineId,
                            feature: 'chat',
                            activityType: 'conversation_completed',
                            rawData: {
                                chat_id: chatId,
                                user_message: content,
                                assistant_response: reasoningResult.response,
                                cs30_additional: cs30Result.hasCs30Response,
                                reasoning_quality: reasoningResult.finalQuality,
                                api_calls_used: reasoningResult.apiCallsUsed,
                                processing_time_ms: Date.now() - startTime
                            },
                            priority: 2
                        });
                    }
                    catch (timelineError) {
                        console.warn('Timeline integration failed:', timelineError);
                        // Don't fail the main request if timeline integration fails
                    }
                }
                return res.json({
                    success: true,
                    data: {
                        ...primaryResponseData,
                        cs30AdditionalResponse: cs30Message.rows[0],
                        hasCs30Additional: true
                    }
                });
            }
        }
        catch (error) {
            console.error('❌ Error in CS30 response generation:', error);
            // Continue with primary response only
        }
    }
    // Timeline-Integration für normale Chats (ohne CS30)
    if (timelineId) {
        try {
            const { TimelineActivityService } = await Promise.resolve().then(() => __importStar(require('../services/TimelineActivityService')));
            const timelineService = new TimelineActivityService(database_1.default);
            // Timeline-Aktivität erfassen
            await timelineService.captureActivity({
                timelineId,
                feature: 'chat',
                activityType: 'conversation_completed',
                rawData: {
                    chat_id: chatId,
                    user_message: content,
                    assistant_response: reasoningResult.response,
                    cs30_additional: false,
                    reasoning_quality: reasoningResult.finalQuality,
                    api_calls_used: reasoningResult.apiCallsUsed,
                    processing_time_ms: Date.now() - startTime
                },
                priority: 2
            });
        }
        catch (timelineError) {
            console.warn('Timeline integration failed:', timelineError);
            // Don't fail the main request if timeline integration fails
        }
    }
    return res.json({
        success: true,
        data: primaryResponseData
    });
}));
// Generate response (with or without clarification)
router.post('/chats/:chatId/generate', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const { originalQuery, clarificationResponses } = req.body;
    const userId = req.user.id;
    if (!originalQuery) {
        throw new errorHandler_1.AppError('Original query is required', 400);
    }
    // Verify chat belongs to user
    const chat = await database_1.default.query('SELECT id FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (chat.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    // Build enhanced query with clarification context (live or from profile)
    const enhancedQuery = await flip_mode_1.default.buildEnhancedQuery(originalQuery, userId, clarificationResponses);
    // Get user preferences for retrieval
    const userPreferences = await database_1.default.query('SELECT companies_of_interest, preferred_topics FROM user_preferences WHERE user_id = $1', [userId]);
    // Get relevant context using enhanced query
    const contextResults = await retrieval.getContextualCompressedResults(enhancedQuery, userPreferences.rows[0] || {}, 10);
    const context = contextResults.map(result => result.payload.text).join('\n\n');
    // Get previous messages for context
    const previousMessages = await database_1.default.query('SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
    const messagesForGeneration = previousMessages.rows.map(msg => ({ role: msg.role, content: msg.content }));
    // Add the enhanced query as the current user turn
    messagesForGeneration.push({ role: 'user', content: enhancedQuery });
    // Generate enhanced AI response
    const aiResponse = await gemini_1.default.generateResponse(messagesForGeneration, context, userPreferences.rows[0] || {}, true // isEnhancedQuery = true
    );
    // Save AI response
    const assistantMessage = await database_1.default.query('INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at', [chatId, 'assistant', aiResponse, JSON.stringify({
            contextSources: contextResults.length,
            enhancedQuery: true,
            originalQuery: originalQuery,
        })]);
    // Mark flip mode as used for this chat and update timestamp
    await database_1.default.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP, flip_mode_used = TRUE WHERE id = $1', [chatId]);
    res.json({
        success: true,
        data: {
            assistantMessage: assistantMessage.rows[0],
            type: 'enhanced_response'
        }
    });
}));
// Delete chat
router.delete('/chats/:chatId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.id;
    // Verify chat belongs to user
    const result = await database_1.default.query('DELETE FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (result.rowCount === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    res.json({
        success: true,
        message: 'Chat deleted successfully'
    });
}));
// Update chat title
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