"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const qdrant_1 = require("./qdrant");
const llmProvider_1 = __importDefault(require("./llmProvider"));
class AdvancedReasoningService {
    constructor() {
        this.maxApiCalls = 10;
        this.qdrantService = new qdrant_1.QdrantService();
    }
    async generateReasonedResponse(query, previousMessages, userPreferences = {}, contextSettings = {}) {
        const startTime = Date.now();
        const reasoningSteps = [];
        let apiCallsUsed = 0;
        // Flag für detaillierte Intent-Analyse
        const useDetailedIntentAnalysis = (contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.useDetailedIntentAnalysis) === true;
        console.log(`🔍 Intent Analysis Mode: ${useDetailedIntentAnalysis ? 'Detailed' : 'Standard'}`);
        try {
            console.log('🚀 Starting Advanced Reasoning Pipeline...');
            // Step 1: Question Analysis (1 API call max, immer bei detaillierter Intent-Analyse)
            let qaAnalysis;
            let enhancedSearchQueries = [];
            if (useDetailedIntentAnalysis) {
                // Detaillierte Intent-Analyse durchführen
                const step1Start = Date.now();
                console.log('🧠 Performing detailed intent analysis...');
                // Detaillierte Analyse mit Gemini durchführen
                const intentAnalysisPrompt = `
          Analysiere die folgende Frage im Kontext der Marktkommunikation für Energieversorger:
          
          Frage: "${query}"
          
          Erfasse folgende Aspekte:
          1. Hauptintention der Frage
          2. Benötigte Informationen zur Beantwortung
          3. Ob die Frage ausreichend Kontext enthält
          4. Semantische Konzepte und Fachbegriffe
          5. Komplexitätslevel (easy/medium/hard)
          
          Formatiere die Antwort als JSON-Objekt.
        `;
                const intentAnalysisResult = await llmProvider_1.default.generateStructuredOutput(intentAnalysisPrompt, userPreferences);
                apiCallsUsed++;
                // Erweiterte Abfragen generieren basierend auf der Intent-Analyse
                const queryGenerationPrompt = `
          Basierend auf der folgenden Frage und Intent-Analyse, generiere 3-5 optimierte Suchbegriffe für eine Vektordatenbank.
          Die Suchbegriffe sollten verschiedene Aspekte der Frage abdecken und Fachbegriffe aus der Marktkommunikation für Energieversorger enthalten.
          
          Frage: "${query}"
          Intent-Analyse: ${JSON.stringify(intentAnalysisResult)}
          
          Formatiere die Antwort als JSON-Array mit Strings.
        `;
                enhancedSearchQueries = await llmProvider_1.default.generateStructuredOutput(queryGenerationPrompt, userPreferences);
                apiCallsUsed++;
                // QA-Analyse erstellen
                qaAnalysis = {
                    needsMoreContext: intentAnalysisResult.needsMoreContext || false,
                    answerable: intentAnalysisResult.answerable !== false,
                    confidence: intentAnalysisResult.confidence || 0.7,
                    missingInfo: intentAnalysisResult.missingInfo || [],
                    mainIntent: intentAnalysisResult.mainIntent,
                    complexityLevel: intentAnalysisResult.complexityLevel,
                    marketCommunicationRelevance: intentAnalysisResult.marketCommunicationRelevance || 0.5,
                    semanticConcepts: intentAnalysisResult.semanticConcepts || [],
                    domainKeywords: intentAnalysisResult.domainKeywords || []
                };
                reasoningSteps.push({
                    step: 'question_analysis',
                    description: 'Detaillierte Intent-Analyse durchgeführt',
                    timestamp: step1Start,
                    duration: Date.now() - step1Start,
                    result: {
                        qaAnalysis,
                        searchQueries: enhancedSearchQueries
                    }
                });
            }
            else {
                // Standard-Intent-Analyse (schnell)
                qaAnalysis = {
                    needsMoreContext: false,
                    answerable: true,
                    confidence: 0.7,
                    missingInfo: []
                };
            }
            // Step 2: Quick Context Retrieval
            const retrievalStart = Date.now();
            // Simple search first for speed (use optimized guided search)
            const quickResults = await qdrant_1.QdrantService.semanticSearchGuided(query, {
                limit: 12,
                outlineScoping: true,
                excludeVisual: true
            });
            if (quickResults.length === 0) {
                // If no results, try one enhanced search
                const searchQueries = await this.generateOptimalSearchQueries(query, userPreferences);
                apiCallsUsed++;
                // Benutzer-ID aus userPreferences extrahieren, falls vorhanden
                const userId = userPreferences === null || userPreferences === void 0 ? void 0 : userPreferences.user_id;
                const teamId = userPreferences === null || userPreferences === void 0 ? void 0 : userPreferences.team_id;
                const allResults = await this.performParallelSearch(searchQueries.slice(0, 3), // Limit to 3 queries
                userId, teamId);
                reasoningSteps.push({
                    step: 'enhanced_search',
                    description: `Enhanced search with ${searchQueries.length} queries found ${allResults.length} results`,
                    timestamp: retrievalStart,
                    duration: Date.now() - retrievalStart,
                    qdrantQueries: searchQueries,
                    qdrantResults: allResults.length
                });
                return await this.generateDirectResponse(query, allResults, previousMessages, userPreferences, reasoningSteps, apiCallsUsed + 1);
            }
            // Quick analysis without API call
            const contextAnalysis = this.analyzeContext(quickResults, query);
            reasoningSteps.push({
                step: 'quick_retrieval',
                description: `Quick search found ${quickResults.length} relevant documents`,
                timestamp: retrievalStart,
                duration: Date.now() - retrievalStart,
                qdrantResults: quickResults.length,
                result: { documentsFound: quickResults.length, quality: contextAnalysis.contextQuality }
            });
            // Response Generation
            const responseStart = Date.now();
            // Check if we have enough context for a direct response
            if (contextAnalysis.contextQuality > 0.5 || quickResults.length >= 5) {
                console.log('✅ Sufficient context found, generating direct response');
                return await this.generateDirectResponse(query, quickResults, previousMessages, userPreferences, reasoningSteps, 1);
            }
            // Step 3: Enhanced search only if needed (2 more API calls max)
            console.log('🔍 Need more context, performing enhanced search...');
            const searchQueries = await this.generateOptimalSearchQueries(query, userPreferences);
            apiCallsUsed++;
            const enhancedResults = await this.performParallelSearch(searchQueries.slice(0, 4));
            const combinedResults = [...quickResults, ...enhancedResults].slice(0, 15); // Limit total results
            reasoningSteps.push({
                step: 'enhanced_retrieval',
                description: `Enhanced search with ${searchQueries.length} queries`,
                timestamp: responseStart,
                duration: Date.now() - responseStart,
                qdrantQueries: searchQueries,
                qdrantResults: enhancedResults.length
            });
            // Final response generation
            return await this.generateDirectResponse(query, combinedResults, previousMessages, userPreferences, reasoningSteps, apiCallsUsed + 1);
        }
        catch (error) {
            console.error('❌ Error in advanced reasoning:', error);
            // Fast fallback: Simple response generation
            try {
                const fallbackResults = await qdrant_1.QdrantService.semanticSearchGuided(query, { limit: 8, outlineScoping: true, excludeVisual: true });
                const contextText = fallbackResults.map(r => { var _a; return ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.text) || ''; }).join('\n');
                const fallbackResponse = await llmProvider_1.default.generateResponse(previousMessages.concat([{ role: 'user', content: query }]), contextText, userPreferences);
                console.log('✅ Fallback response generated successfully');
                return {
                    response: fallbackResponse,
                    reasoningSteps: [{
                            step: 'fallback',
                            description: 'Used fast fallback due to error in advanced reasoning',
                            timestamp: Date.now(),
                            error: error instanceof Error ? error.message : 'Unknown error'
                        }],
                    finalQuality: 0.6,
                    iterationsUsed: 0,
                    contextAnalysis: {
                        topicsIdentified: [],
                        informationGaps: [],
                        contextQuality: 0.5
                    },
                    qaAnalysis: {
                        needsMoreContext: true,
                        answerable: true,
                        confidence: 0.6,
                        missingInfo: []
                    },
                    pipelineDecisions: {
                        useIterativeRefinement: false,
                        maxIterations: 0,
                        confidenceThreshold: 0.8,
                        reason: 'Error fallback'
                    },
                    apiCallsUsed: apiCallsUsed + 1
                };
            }
            catch (fallbackError) {
                console.error('❌ Fallback also failed:', fallbackError);
                throw fallbackError;
            }
        }
    }
    // Direkte Antwortgenerierung mit Unterstützung für detaillierte Intent-Analyse
    async generateDirectResponse(query, results, previousMessages, userPreferences, reasoningSteps, apiCallsUsed, qaAnalysis = {
        needsMoreContext: false,
        answerable: true,
        confidence: 0.7,
        missingInfo: []
    }, contextAnalysis = {
        topicsIdentified: [],
        informationGaps: [],
        contextQuality: 0.7
    }, pipelineDecisions = {
        useIterativeRefinement: false,
        maxIterations: 1,
        confidenceThreshold: 0.8,
        reason: 'Direct response for speed'
    }, usedDetailedIntentAnalysis = false) {
        const responseStart = Date.now();
        // Synthesize context efficiently
        const context = results.map(r => { var _a, _b; return ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.text) || ((_b = r.payload) === null || _b === void 0 ? void 0 : _b.content) || ''; }).join('\n\n');
        // Generate response directly
        const response = await llmProvider_1.default.generateResponse(previousMessages.concat([{ role: 'user', content: query }]), context, userPreferences);
        // Record the step
        reasoningSteps.push({
            step: 'direct_response',
            description: 'Direct response generation',
            timestamp: responseStart,
            duration: Date.now() - responseStart,
            result: {
                response,
                qaAnalysis,
                usedDetailedIntentAnalysis
            }
        });
        // Return the final result
        return {
            response,
            reasoningSteps,
            finalQuality: contextAnalysis.contextQuality,
            iterationsUsed: 1,
            contextAnalysis,
            qaAnalysis,
            pipelineDecisions,
            apiCallsUsed: apiCallsUsed + 1
        };
    }
    // Erweiterte Antwortgenerierung mit unterstützung für detaillierte Intent-Analyse
    async generateRefinedResponse(query, results, previousMessages, userPreferences, reasoningSteps, apiCallsUsed, qaAnalysis, contextAnalysis, pipelineDecisions, usedDetailedIntentAnalysis = false) {
        var _a;
        // Implementierung für den iterativen Prozess
        const refinementStart = Date.now();
        // Synthesize context efficiently
        const context = results.map(r => { var _a, _b; return ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.text) || ((_b = r.payload) === null || _b === void 0 ? void 0 : _b.content) || ''; }).join('\n\n');
        // Erste Antwortgenerierung
        const initialResponse = await llmProvider_1.default.generateResponse(previousMessages.concat([{ role: 'user', content: query }]), context, userPreferences);
        apiCallsUsed++;
        // Extract hybrid search metadata if available
        const hybridSearchMetadata = (_a = results.find((r) => r.hybridSearchMetadata)) === null || _a === void 0 ? void 0 : _a.hybridSearchMetadata;
        const usedHybridSearch = (hybridSearchMetadata === null || hybridSearchMetadata === void 0 ? void 0 : hybridSearchMetadata.hybridSearchUsed) || false;
        const hybridSearchAlpha = hybridSearchMetadata === null || hybridSearchMetadata === void 0 ? void 0 : hybridSearchMetadata.hybridSearchAlpha;
        // Bei nur einer Iteration: direkt zurückgeben
        if (pipelineDecisions.maxIterations <= 1) {
            reasoningSteps.push({
                step: 'direct_response',
                description: 'Antwort in einem Schritt generiert',
                timestamp: refinementStart,
                duration: Date.now() - refinementStart,
                result: {
                    response: initialResponse,
                    confidence: 0.8,
                    usedHybridSearch,
                    hybridSearchAlpha
                }
            });
            return {
                response: initialResponse,
                reasoningSteps,
                finalQuality: 0.8,
                iterationsUsed: 1,
                contextAnalysis,
                qaAnalysis,
                pipelineDecisions,
                apiCallsUsed,
                hybridSearchUsed: usedHybridSearch,
                hybridSearchAlpha
            };
        }
        // Ansonsten: Iterativer Verbesserungsprozess
        // ... [Hier würde die vollständige Implementierung folgen]
        // Vereinfachte Version für dieses Update
        reasoningSteps.push({
            step: 'iterative_refinement',
            description: 'Iterative Verbesserung der Antwort',
            timestamp: refinementStart,
            duration: Date.now() - refinementStart,
            result: { response: initialResponse, confidence: 0.9, iterationsUsed: 2 }
        });
        return {
            response: initialResponse,
            reasoningSteps,
            finalQuality: 0.9,
            iterationsUsed: 2,
            contextAnalysis,
            qaAnalysis,
            pipelineDecisions,
            apiCallsUsed
        };
    }
    async generateOptimalSearchQueries(query, userPreferences) {
        try {
            // Fast search query generation with reduced complexity
            const simplePrompt = `Generate 3 search terms for: "${query}". Return only JSON array like ["term1", "term2", "term3"]:`;
            const result = await llmProvider_1.default.generateText(simplePrompt, userPreferences);
            // Extract JSON array from response
            let queries = [];
            try {
                const jsonMatch = result.match(/\[.*?\]/);
                if (jsonMatch) {
                    queries = JSON.parse(jsonMatch[0]);
                }
            }
            catch (e) {
                console.warn('Failed to parse search queries, using fallback');
            }
            // Fallback: split query into keywords
            if (queries.length === 0) {
                const keywords = query.split(' ').filter(word => word.length > 3);
                queries = keywords.slice(0, 3);
            }
            // Always include original query
            queries.unshift(query);
            return [...new Set(queries)].slice(0, 4); // Limit to 4 unique queries
        }
        catch (error) {
            console.error('Error generating search queries:', error);
            return [query]; // Fallback to original query
        }
    }
    async performParallelSearch(queries, userId, teamId) {
        try {
            // Perform searches using optimized guided retrieval
            console.log(`🔍 Performing parallel guided searches for ${queries.length} queries`);
            const searchPromises = queries.map(q => qdrant_1.QdrantService.semanticSearchGuided(q, { limit: 10, outlineScoping: true, excludeVisual: true }));
            const searchResults = await Promise.all(searchPromises);
            // Flatten and process results
            let allResults = [];
            searchResults.forEach((resultArray) => {
                allResults = [...allResults, ...(Array.isArray(resultArray) ? resultArray : [resultArray])];
            });
            // Remove duplicates based on ID
            const seen = new Set();
            const uniqueResults = allResults.filter(result => {
                const id = result.id || (result.payload && result.payload.id);
                if (seen.has(id))
                    return false;
                seen.add(id);
                return true;
            });
            // Sort by score descending
            uniqueResults.sort((a, b) => { var _a, _b, _c, _d; return ((_b = (_a = b.score) !== null && _a !== void 0 ? _a : b.merged_score) !== null && _b !== void 0 ? _b : 0) - ((_d = (_c = a.score) !== null && _c !== void 0 ? _c : a.merged_score) !== null && _d !== void 0 ? _d : 0); });
            console.log(`✅ Found ${uniqueResults.length} unique results across ${queries.length} queries`);
            return uniqueResults.slice(0, 20); // Limit to top 20 results
        }
        catch (error) {
            console.error('❌ Error in parallel guided search:', error);
            // Fallback to most basic search if all else fails
            const fallbackPromises = queries.map(q => qdrant_1.QdrantService.semanticSearchGuided(q, { limit: 10 }));
            const fallbackResults = await Promise.all(fallbackPromises);
            const flattenedResults = fallbackResults.flat();
            // Remove duplicates
            const seen = new Set();
            const uniqueResults = flattenedResults.filter(result => {
                const id = result.id || (result.payload && result.payload.id);
                if (seen.has(id))
                    return false;
                seen.add(id);
                return true;
            });
            return uniqueResults.slice(0, 20); // Limit to top 20 results
        }
    }
    analyzeContext(results, query) {
        // Simple context analysis without additional API calls
        const topics = new Set();
        const informationGaps = [];
        results.forEach(result => {
            var _a;
            const chunkType = (_a = result.payload) === null || _a === void 0 ? void 0 : _a.chunk_type;
            if (chunkType)
                topics.add(chunkType);
        });
        const contextQuality = Math.min(1.0, results.length / 10);
        return {
            topicsIdentified: Array.from(topics),
            informationGaps,
            contextQuality
        };
    }
    async performQAAnalysis(query, context, userPreferences) {
        const prompt = `Analyze if the following context contains sufficient information to answer the user query. Respond only with a JSON object:

Query: ${query}
Context: ${context.slice(0, 2000)}...

Required JSON format:
{
  "needsMoreContext": boolean,
  "answerable": boolean,
  "confidence": number (0-1),
  "missingInfo": ["missing aspect 1", "missing aspect 2"]
}`;
        try {
            const result = await llmProvider_1.default.generateText(prompt, userPreferences);
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                return {
                    needsMoreContext: analysis.needsMoreContext || false,
                    answerable: analysis.answerable || true,
                    confidence: analysis.confidence || 0.7,
                    missingInfo: analysis.missingInfo || []
                };
            }
        }
        catch (error) {
            console.error('Error in QA analysis:', error);
        }
        return {
            needsMoreContext: false,
            answerable: true,
            confidence: 0.7,
            missingInfo: []
        };
    }
    async performIterativeRefinement(query, context, previousMessages, userPreferences, maxIterations, remainingApiCalls) {
        const steps = [];
        let currentResponse = '';
        let apiCallsUsed = 0;
        for (let i = 0; i < maxIterations && apiCallsUsed < remainingApiCalls - 1; i++) {
            const iterationStart = Date.now();
            if (i === 0) {
                // First iteration: Generate initial response
                currentResponse = await llmProvider_1.default.generateResponse(previousMessages.concat([{ role: 'user', content: query }]), context, userPreferences, true);
                apiCallsUsed++;
            }
            else {
                // Subsequent iterations: Refine the response
                const refinementPrompt = `Improve the following response to the user query by making it more comprehensive and accurate:

Original Query: ${query}
Current Response: ${currentResponse}
Additional Context: ${context.slice(0, 1000)}

Provide an improved version:`;
                currentResponse = await llmProvider_1.default.generateText(refinementPrompt, userPreferences);
                apiCallsUsed++;
            }
            steps.push({
                step: `refinement_iteration_${i + 1}`,
                description: `Iteration ${i + 1} of response refinement`,
                timestamp: iterationStart,
                duration: Date.now() - iterationStart,
                result: { responseLength: currentResponse.length }
            });
            // Check if we should continue (simple length-based heuristic)
            if (currentResponse.length > 500 && i > 0) {
                break;
            }
        }
        return {
            response: currentResponse,
            iterationsUsed: steps.length,
            apiCallsUsed,
            steps
        };
    }
    async assessResponseQuality(query, response, context, userPreferences) {
        const prompt = `Rate the quality of this response on a scale of 0-1:

Query: ${query}
Response: ${response}
Available Context: ${context.slice(0, 500)}...

Consider: relevance, completeness, accuracy, clarity.
Respond with only a number between 0 and 1:`;
        try {
            const result = await llmProvider_1.default.generateText(prompt, userPreferences);
            const score = parseFloat(result.trim());
            return isNaN(score) ? 0.7 : Math.max(0, Math.min(1, score));
        }
        catch (error) {
            console.error('Error assessing response quality:', error);
            return 0.7;
        }
    }
}
exports.default = new AdvancedReasoningService();
//# sourceMappingURL=advancedReasoningService.js.map