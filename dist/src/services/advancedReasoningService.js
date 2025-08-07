"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const qdrant_1 = require("./qdrant");
const gemini_1 = __importDefault(require("./gemini"));
class AdvancedReasoningService {
    constructor() {
        this.maxApiCalls = 10;
        this.qdrantService = new qdrant_1.QdrantService();
    }
    async generateReasonedResponse(query, previousMessages, userPreferences = {}, contextSettings = {}) {
        const startTime = Date.now();
        const reasoningSteps = [];
        let apiCallsUsed = 0;
        try {
            console.log('🚀 Starting Advanced Reasoning Pipeline...');
            // Step 1: Quick Context Retrieval (1 API call max)
            const step1Start = Date.now();
            // Simple search first for speed
            const quickResults = await this.qdrantService.search('system', query, 10);
            if (quickResults.length === 0) {
                // If no results, try one enhanced search
                const searchQueries = await this.generateOptimalSearchQueries(query, userPreferences);
                apiCallsUsed++;
                const allResults = await this.performParallelSearch(searchQueries.slice(0, 3)); // Limit to 3 queries
                reasoningSteps.push({
                    step: 'enhanced_search',
                    description: `Enhanced search with ${searchQueries.length} queries found ${allResults.length} results`,
                    timestamp: step1Start,
                    duration: Date.now() - step1Start,
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
                timestamp: step1Start,
                duration: Date.now() - step1Start,
                qdrantResults: quickResults.length,
                result: { documentsFound: quickResults.length, quality: contextAnalysis.contextQuality }
            });
            // Step 2: Fast Response Generation (1 API call)
            const step2Start = Date.now();
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
                timestamp: step2Start,
                duration: Date.now() - step2Start,
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
                const fallbackResults = await this.qdrantService.search('system', query, 5);
                const contextText = fallbackResults.map(r => { var _a; return ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.text) || ''; }).join('\n');
                const fallbackResponse = await gemini_1.default.generateResponse(previousMessages.concat([{ role: 'user', content: query }]), contextText, userPreferences);
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
    async generateDirectResponse(query, results, previousMessages, userPreferences, reasoningSteps, apiCallsUsed) {
        const responseStart = Date.now();
        // Synthesize context efficiently
        const context = results.map(r => { var _a, _b; return ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.text) || ((_b = r.payload) === null || _b === void 0 ? void 0 : _b.content) || ''; }).join('\n\n');
        // Generate response directly
        const response = await gemini_1.default.generateResponse(previousMessages.concat([{ role: 'user', content: query }]), context, userPreferences, true);
        reasoningSteps.push({
            step: 'direct_response',
            description: 'Generated response with available context',
            timestamp: responseStart,
            duration: Date.now() - responseStart,
            result: { responseLength: response.length, contextLength: context.length }
        });
        const totalDuration = Date.now() - reasoningSteps[0].timestamp;
        console.log(`✅ Direct response completed in ${totalDuration}ms with ${apiCallsUsed} API calls`);
        return {
            response,
            reasoningSteps,
            finalQuality: results.length >= 5 ? 0.8 : 0.7,
            iterationsUsed: 1,
            contextAnalysis: this.analyzeContext(results, query),
            qaAnalysis: {
                needsMoreContext: false,
                answerable: true,
                confidence: 0.8,
                missingInfo: []
            },
            pipelineDecisions: {
                useIterativeRefinement: false,
                maxIterations: 1,
                confidenceThreshold: 0.8,
                reason: 'Direct response for speed'
            },
            apiCallsUsed
        };
    }
    async generateOptimalSearchQueries(query, userPreferences) {
        try {
            // Fast search query generation with reduced complexity
            const simplePrompt = `Generate 3 search terms for: "${query}". Return only JSON array like ["term1", "term2", "term3"]:`;
            const result = await gemini_1.default.generateText(simplePrompt);
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
    async performParallelSearch(queries) {
        // Perform all QDrant searches in parallel
        const searchPromises = queries.map(query => this.qdrantService.searchWithOptimizations(query, 10, 0.3, true));
        const results = await Promise.all(searchPromises);
        // Flatten and deduplicate results
        const allResults = results.flat();
        const seen = new Set();
        return allResults.filter(result => {
            if (seen.has(result.id))
                return false;
            seen.add(result.id);
            return true;
        }).slice(0, 20); // Limit to top 20 results
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
    async performQAAnalysis(query, context) {
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
            const result = await gemini_1.default.generateText(prompt);
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
                currentResponse = await gemini_1.default.generateResponse(previousMessages.concat([{ role: 'user', content: query }]), context, userPreferences, true);
                apiCallsUsed++;
            }
            else {
                // Subsequent iterations: Refine the response
                const refinementPrompt = `Improve the following response to the user query by making it more comprehensive and accurate:

Original Query: ${query}
Current Response: ${currentResponse}
Additional Context: ${context.slice(0, 1000)}

Provide an improved version:`;
                currentResponse = await gemini_1.default.generateText(refinementPrompt);
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
    async assessResponseQuality(query, response, context) {
        const prompt = `Rate the quality of this response on a scale of 0-1:

Query: ${query}
Response: ${response}
Available Context: ${context.slice(0, 500)}...

Consider: relevance, completeness, accuracy, clarity.
Respond with only a number between 0 and 1:`;
        try {
            const result = await gemini_1.default.generateText(prompt);
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