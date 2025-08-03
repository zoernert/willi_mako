"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatConfigurationService = exports.SearchType = void 0;
const database_1 = require("../utils/database");
const gemini_1 = __importDefault(require("./gemini"));
const qdrant_1 = require("./qdrant");
var SearchType;
(function (SearchType) {
    SearchType["SEMANTIC"] = "semantic";
    SearchType["HYBRID"] = "hybrid";
    SearchType["KEYWORD"] = "keyword";
    SearchType["FUZZY"] = "fuzzy";
})(SearchType || (exports.SearchType = SearchType = {}));
class ChatConfigurationService {
    constructor() {
        this.activeConfig = null;
        this.lastConfigLoad = 0;
        this.configCacheTimeout = 5 * 60 * 1000;
        this.qdrantService = new qdrant_1.QdrantService();
    }
    async getActiveConfiguration() {
        const now = Date.now();
        if (this.activeConfig && (now - this.lastConfigLoad) < this.configCacheTimeout) {
            return this.activeConfig;
        }
        try {
            const config = await database_1.DatabaseHelper.executeQuerySingle(`
        SELECT id, name, config
        FROM chat_configurations 
        WHERE is_active = true
        LIMIT 1
      `);
            if (!config) {
                return this.getDefaultConfiguration();
            }
            this.activeConfig = config;
            this.lastConfigLoad = now;
            return config;
        }
        catch (error) {
            console.error('Error loading active chat configuration:', error);
            return this.getDefaultConfiguration();
        }
    }
    async generateConfiguredResponse(query, userId, previousMessages = [], userPreferences = {}, contextSettings) {
        const config = await this.getActiveConfiguration();
        const processingSteps = [];
        let searchQueries = [query];
        let contextUsed = '';
        try {
            if (this.isStepEnabled(config, 'query_understanding')) {
                const step = this.getStep(config, 'query_understanding');
                processingSteps.push({
                    name: 'Query Understanding',
                    startTime: Date.now(),
                    enabled: true,
                    prompt: step?.prompt
                });
                if (config.config.vectorSearch.useQueryExpansion) {
                    searchQueries = await gemini_1.default.generateSearchQueries(query);
                    searchQueries = searchQueries.slice(0, config.config.vectorSearch.maxQueries);
                }
                processingSteps[processingSteps.length - 1].endTime = Date.now();
                processingSteps[processingSteps.length - 1].output = { searchQueries };
            }
            if (this.isStepEnabled(config, 'context_search')) {
                processingSteps.push({
                    name: 'Context Search',
                    startTime: Date.now(),
                    enabled: true
                });
                let allResults = [];
                let searchDetails = [];
                let useOptimizedSearch = true;
                if (useOptimizedSearch) {
                    try {
                        const optimizedResults = await this.qdrantService.searchWithOptimizations(query, config.config.vectorSearch.limit * 2, config.config.vectorSearch.scoreThreshold, true);
                        allResults = optimizedResults;
                        searchDetails.push({
                            query: query,
                            searchType: 'optimized',
                            resultsCount: optimizedResults.length,
                            results: optimizedResults.slice(0, 5).map((r) => ({
                                id: r.id,
                                score: r.score,
                                title: r.payload?.title || r.payload?.source_document || 'Unknown',
                                source: r.payload?.document_metadata?.document_base_name || 'Unknown',
                                chunk_type: r.payload?.chunk_type || 'paragraph',
                                chunk_index: r.payload?.chunk_index || 0,
                                content: (r.payload?.text || r.payload?.content || '').substring(0, 300)
                            }))
                        });
                    }
                    catch (error) {
                        console.error('Optimized search failed, falling back to standard search:', error);
                        useOptimizedSearch = false;
                    }
                }
                if (!useOptimizedSearch) {
                    for (const q of searchQueries) {
                        const results = await this.qdrantService.searchByText(q, config.config.vectorSearch.limit, config.config.vectorSearch.scoreThreshold);
                        allResults.push(...results);
                        searchDetails.push({
                            query: q,
                            searchType: 'standard',
                            resultsCount: results.length,
                            results: results.slice(0, 5).map((r) => ({
                                id: r.id,
                                score: r.score,
                                title: r.payload?.title || r.payload?.source_document || 'Unknown',
                                source: r.payload?.document_metadata?.document_base_name || r.payload?.source || 'Unknown',
                                chunk_type: r.payload?.chunk_type || 'paragraph',
                                chunk_index: r.payload?.chunk_index || 0,
                                content: (r.payload?.text || r.payload?.content || '').substring(0, 300)
                            }))
                        });
                    }
                }
                const uniqueResults = this.removeDuplicates(allResults);
                const scores = uniqueResults.map((r) => r.score).filter(s => s !== undefined);
                const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                processingSteps[processingSteps.length - 1].endTime = Date.now();
                processingSteps[processingSteps.length - 1].output = {
                    searchDetails,
                    totalResultsFound: allResults.length,
                    uniqueResultsUsed: uniqueResults.length,
                    scoreThreshold: config.config.vectorSearch.scoreThreshold,
                    avgScore: avgScore,
                    searchType: useOptimizedSearch ? 'optimized' : 'standard'
                };
                if (this.isStepEnabled(config, 'context_optimization')) {
                    processingSteps.push({
                        name: 'Context Optimization',
                        startTime: Date.now(),
                        enabled: true
                    });
                    if (uniqueResults.length > 0) {
                        if (useOptimizedSearch && uniqueResults.some((r) => r.payload?.chunk_type)) {
                            const contextualizedResults = uniqueResults.map(result => {
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
                                        contextual_content: contextualPrefix + (result.payload?.text || result.payload?.content || '')
                                    }
                                };
                            });
                            contextUsed = await gemini_1.default.synthesizeContextWithChunkTypes(query, contextualizedResults);
                        }
                        else {
                            if (config.config.contextSynthesis.enabled) {
                                contextUsed = await gemini_1.default.synthesizeContext(query, uniqueResults);
                            }
                            else {
                                const relevantContent = uniqueResults.map((r) => {
                                    return r.payload?.content || r.content || r.payload?.text || '';
                                }).filter(text => text.trim().length > 0);
                                contextUsed = relevantContent.join('\n\n');
                            }
                        }
                        if (contextUsed.length < 200 && uniqueResults.length > 0) {
                            const relevantContent = uniqueResults.map((r) => {
                                return r.payload?.content || r.content || r.payload?.text || '';
                            }).filter(text => text.trim().length > 0);
                            const rawContext = relevantContent.join('\n\n');
                            contextUsed = rawContext.length > config.config.contextSynthesis.maxLength
                                ? rawContext.substring(0, config.config.contextSynthesis.maxLength) + '...'
                                : rawContext;
                        }
                        if (contextUsed.length > config.config.contextSynthesis.maxLength) {
                            contextUsed = contextUsed.substring(0, config.config.contextSynthesis.maxLength) + '...';
                        }
                    }
                    else {
                        contextUsed = '';
                    }
                    processingSteps[processingSteps.length - 1].endTime = Date.now();
                    processingSteps[processingSteps.length - 1].output = {
                        contextLength: contextUsed.length,
                        synthesized: config.config.contextSynthesis.enabled && contextUsed.length > 200,
                        maxLength: config.config.contextSynthesis.maxLength,
                        wasTruncated: contextUsed.endsWith('...'),
                        uniqueResultsUsed: uniqueResults.length,
                        chunkTypesFound: [...new Set(uniqueResults.map((r) => r.payload?.chunk_type || 'paragraph'))],
                        optimizedSearchUsed: useOptimizedSearch
                    };
                }
                else {
                    const relevantContent = uniqueResults.map((r) => {
                        return r.payload?.content || r.content || r.payload?.text || '';
                    }).filter(text => text.trim().length > 0);
                    contextUsed = relevantContent.join('\n\n');
                }
            }
            let response = '';
            if (this.isStepEnabled(config, 'response_generation')) {
                processingSteps.push({
                    name: 'Response Generation',
                    startTime: Date.now(),
                    enabled: true
                });
                const messages = previousMessages.map(msg => ({ role: msg.role, content: msg.content }));
                messages.push({ role: 'user', content: query });
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
                response = await gemini_1.default.generateResponse(messages, contextUsed, userPreferences, false, contextMode);
                processingSteps[processingSteps.length - 1].endTime = Date.now();
                processingSteps[processingSteps.length - 1].output = {
                    responseLength: response.length
                };
            }
            else {
                const messages = previousMessages.map(msg => ({ role: msg.role, content: msg.content }));
                messages.push({ role: 'user', content: query });
                response = await gemini_1.default.generateResponse(messages, contextUsed, userPreferences);
            }
            if (this.isStepEnabled(config, 'response_validation')) {
                processingSteps.push({
                    name: 'Response Validation',
                    startTime: Date.now(),
                    enabled: true
                });
                let validationIssues = [];
                if (config.config.qualityChecks.enabled) {
                    if (response.length < config.config.qualityChecks.minResponseLength) {
                        validationIssues.push('Response too short');
                    }
                    if (config.config.qualityChecks.checkForHallucination) {
                        if (response.includes('Ich bin mir nicht sicher') ||
                            response.includes('Das kann ich nicht beantworten')) {
                            validationIssues.push('Potential uncertainty detected');
                        }
                    }
                }
                processingSteps[processingSteps.length - 1].endTime = Date.now();
                processingSteps[processingSteps.length - 1].output = {
                    validationIssues,
                    passed: validationIssues.length === 0
                };
                if (validationIssues.length > 0) {
                    console.warn('Response validation issues:', validationIssues);
                }
            }
            return {
                response,
                contextUsed,
                searchQueries,
                processingSteps,
                configurationUsed: config.name
            };
        }
        catch (error) {
            console.error('Error in configured response generation:', error);
            const messages = previousMessages.map(msg => ({ role: msg.role, content: msg.content }));
            messages.push({ role: 'user', content: query });
            const fallbackResponse = await gemini_1.default.generateResponse(messages, '', userPreferences);
            return {
                response: fallbackResponse,
                contextUsed: '',
                searchQueries: [query],
                processingSteps: [{
                        name: 'Fallback Generation',
                        error: error instanceof Error ? error.message : 'Unknown error',
                        enabled: true
                    }],
                configurationUsed: 'Fallback'
            };
        }
    }
    getDefaultConfiguration() {
        return {
            id: 'default',
            name: 'Default Configuration',
            config: {
                maxIterations: 3,
                systemPrompt: 'Du bist Mako Willi, ein AI-Coach für die Energiewirtschaft und Marktkommunikation von Stromhaltig. Du hilfst bei technischen Fragen zu APERAK, UTILMD, MSCONS und anderen EDI-Nachrichten. Erkläre komplexe Sachverhalte verständlich und gehe auf spezifische Fehlercodes und deren Ursachen ein. Nutze die bereitgestellten Dokumenteninformationen, um präzise und praxisnahe Antworten zu geben.',
                vectorSearch: {
                    maxQueries: 3,
                    limit: 10,
                    scoreThreshold: 0.5,
                    useQueryExpansion: true,
                    searchType: SearchType.HYBRID,
                    hybridAlpha: 0.3,
                    diversityThreshold: 0.7
                },
                processingSteps: [
                    {
                        name: 'query_understanding',
                        enabled: true,
                        prompt: 'Analysiere die Benutzeranfrage und extrahiere die Kernfrage.'
                    },
                    {
                        name: 'context_search',
                        enabled: true,
                        prompt: 'Suche relevanten Kontext basierend auf der analysierten Anfrage.'
                    },
                    {
                        name: 'context_optimization',
                        enabled: true,
                        prompt: 'Optimiere und priorisiere den gefundenen Kontext.'
                    },
                    {
                        name: 'response_generation',
                        enabled: true,
                        prompt: 'Erstelle eine hilfreiche Antwort basierend auf dem Kontext.'
                    },
                    {
                        name: 'response_validation',
                        enabled: false,
                        prompt: 'Validiere die Antwort auf Korrektheit und Vollständigkeit.'
                    }
                ],
                contextSynthesis: {
                    enabled: true,
                    maxLength: 4000
                },
                qualityChecks: {
                    enabled: true,
                    minResponseLength: 50,
                    checkForHallucination: true
                }
            }
        };
    }
    isStepEnabled(config, stepName) {
        const step = config.config.processingSteps.find(s => s.name === stepName);
        return step ? step.enabled : false;
    }
    getStep(config, stepName) {
        return config.config.processingSteps.find(s => s.name === stepName);
    }
    async setAsDefault(configId) {
        try {
            await database_1.DatabaseHelper.executeQuery(`
        UPDATE chat_configurations 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
      `);
            await database_1.DatabaseHelper.executeQuery(`
        UPDATE chat_configurations 
        SET is_active = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [configId]);
            const verifyResult = await database_1.DatabaseHelper.executeQuerySingle(`
        SELECT id FROM chat_configurations WHERE id = $1
      `, [configId]);
            if (!verifyResult) {
                throw new Error(`Configuration with ID ${configId} not found`);
            }
            this.clearCache();
            console.log(`Configuration ${configId} set as default`);
        }
        catch (error) {
            console.error('Error setting default configuration:', error);
            throw error;
        }
    }
    async getActiveConfigurationId() {
        try {
            const result = await database_1.DatabaseHelper.executeQuerySingle(`
        SELECT id FROM chat_configurations WHERE is_active = true LIMIT 1
      `);
            return result?.id || null;
        }
        catch (error) {
            console.error('Error getting active configuration ID:', error);
            return null;
        }
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
    clearCache() {
        this.activeConfig = null;
        this.lastConfigLoad = 0;
    }
}
exports.ChatConfigurationService = ChatConfigurationService;
exports.default = new ChatConfigurationService();
//# sourceMappingURL=chatConfigurationService.js.map