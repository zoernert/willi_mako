import { QdrantService } from './qdrant';
import geminiService from './gemini';

export interface ReasoningStep {
  step: string;
  description: string;
  timestamp: number;
  duration?: number;
  qdrantQueries?: string[];
  qdrantResults?: number;
  result?: any;
  error?: string;
}

export interface ContextAnalysis {
  semanticClusters?: any[];
  topicsIdentified: string[];
  informationGaps: string[];
  contextQuality: number;
}

export interface QAAnalysis {
  needsMoreContext: boolean;
  answerable: boolean;
  confidence: number;
  missingInfo: string[];
}

export interface PipelineDecision {
  useIterativeRefinement: boolean;
  maxIterations: number;
  confidenceThreshold: number;
  reason: string;
}

export interface ReasoningResult {
  response: string;
  reasoningSteps: ReasoningStep[];
  finalQuality: number;
  iterationsUsed: number;
  contextAnalysis: ContextAnalysis;
  qaAnalysis: QAAnalysis;
  pipelineDecisions: PipelineDecision;
  apiCallsUsed: number;
}

class AdvancedReasoningService {
  private qdrantService: QdrantService;
  private maxApiCalls = 10;

  constructor() {
    this.qdrantService = new QdrantService();
  }

  async generateReasonedResponse(
    query: string,
    previousMessages: any[],
    userPreferences: any = {},
    contextSettings: any = {}
  ): Promise<ReasoningResult> {
    const startTime = Date.now();
    const reasoningSteps: ReasoningStep[] = [];
    let apiCallsUsed = 0;

    try {
      // Step 1: Initial Query Analysis and Context Retrieval (2 API calls max)
      const step1Start = Date.now();
      
      // Generate enhanced search queries (1 API call)
      const searchQueries = await this.generateOptimalSearchQueries(query, userPreferences);
      apiCallsUsed++;
      
      reasoningSteps.push({
        step: 'query_analysis',
        description: `Generated ${searchQueries.length} optimized search queries`,
        timestamp: step1Start,
        duration: Date.now() - step1Start,
        qdrantQueries: searchQueries,
        result: { searchQueries }
      });

      // Parallel QDrant searches for all queries
      const allResults = await this.performParallelSearch(searchQueries);
      const contextAnalysis = this.analyzeContext(allResults, query);
      
      reasoningSteps.push({
        step: 'context_retrieval',
        description: `Retrieved ${allResults.length} relevant documents`,
        timestamp: Date.now(),
        qdrantResults: allResults.length,
        result: { documentsFound: allResults.length, quality: contextAnalysis.contextQuality }
      });

      // Step 2: Context Synthesis (1 API call)
      const step2Start = Date.now();
      const synthesizedContext = await geminiService.synthesizeContextWithChunkTypes(query, allResults);
      apiCallsUsed++;

      reasoningSteps.push({
        step: 'context_synthesis',
        description: 'Synthesized context from retrieved documents',
        timestamp: step2Start,
        duration: Date.now() - step2Start,
        result: { contextLength: synthesizedContext.length }
      });

      // Step 3: QA Analysis and Pipeline Decision (1 API call)
      const qaAnalysis = await this.performQAAnalysis(query, synthesizedContext);
      apiCallsUsed++;

      const pipelineDecision: PipelineDecision = {
        useIterativeRefinement: qaAnalysis.confidence < 0.8 && apiCallsUsed < 8,
        maxIterations: Math.min(2, Math.floor((this.maxApiCalls - apiCallsUsed) / 2)),
        confidenceThreshold: 0.8,
        reason: qaAnalysis.confidence < 0.8 ? 'Low confidence, enabling refinement' : 'High confidence, proceeding directly'
      };

      reasoningSteps.push({
        step: 'qa_analysis',
        description: `Analyzed answer quality (confidence: ${qaAnalysis.confidence})`,
        timestamp: Date.now(),
        result: { qaAnalysis, pipelineDecision }
      });

      // Step 4: Response Generation with optional refinement
      let finalResponse = '';
      let iterationsUsed = 0;
      
      if (pipelineDecision.useIterativeRefinement && pipelineDecision.maxIterations > 0) {
        // Iterative refinement approach (max 4 more API calls)
        const refinementResult = await this.performIterativeRefinement(
          query, 
          synthesizedContext, 
          previousMessages, 
          userPreferences,
          pipelineDecision.maxIterations,
          this.maxApiCalls - apiCallsUsed
        );
        
        finalResponse = refinementResult.response;
        iterationsUsed = refinementResult.iterationsUsed;
        apiCallsUsed += refinementResult.apiCallsUsed;
        reasoningSteps.push(...refinementResult.steps);
      } else {
        // Direct response generation (1 API call)
        const step4Start = Date.now();
        finalResponse = await geminiService.generateResponse(
          previousMessages.concat([{ role: 'user', content: query }]),
          synthesizedContext,
          userPreferences,
          true
        );
        apiCallsUsed++;

        reasoningSteps.push({
          step: 'response_generation',
          description: 'Generated final response directly',
          timestamp: step4Start,
          duration: Date.now() - step4Start,
          result: { responseLength: finalResponse.length }
        });
      }

      // Step 5: Final Quality Assessment (1 API call if budget allows)
      let finalQuality = 0.8; // Default assumption
      if (apiCallsUsed < this.maxApiCalls) {
        finalQuality = await this.assessResponseQuality(query, finalResponse, synthesizedContext);
        apiCallsUsed++;

        reasoningSteps.push({
          step: 'quality_assessment',
          description: `Final quality score: ${finalQuality}`,
          timestamp: Date.now(),
          result: { finalQuality }
        });
      }

      console.log(`🎯 Advanced Reasoning completed: ${apiCallsUsed}/${this.maxApiCalls} API calls used`);

      return {
        response: finalResponse,
        reasoningSteps,
        finalQuality,
        iterationsUsed,
        contextAnalysis,
        qaAnalysis,
        pipelineDecisions: pipelineDecision,
        apiCallsUsed
      };

    } catch (error) {
      console.error('Error in advanced reasoning:', error);
      
      // Fallback: Simple response generation
      try {
        const fallbackContext = await this.qdrantService.search('system', query, 5);
        const contextText = fallbackContext.map(r => r.payload?.text || '').join('\n');
        const fallbackResponse = await geminiService.generateResponse(
          previousMessages.concat([{ role: 'user', content: query }]),
          contextText,
          userPreferences
        );

        return {
          response: fallbackResponse,
          reasoningSteps: [{
            step: 'fallback',
            description: 'Used fallback due to error in advanced reasoning',
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
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  private async generateOptimalSearchQueries(query: string, userPreferences: any): Promise<string[]> {
    // Generate 3-5 diverse search queries to cover different aspects
    const queries = await geminiService.generateSearchQueries(query);
    
    // Limit to max 5 queries to control QDrant calls
    return queries.slice(0, 5);
  }

  private async performParallelSearch(queries: string[]): Promise<any[]> {
    // Perform all QDrant searches in parallel
    const searchPromises = queries.map(query => 
      this.qdrantService.searchWithOptimizations(query, 10, 0.3, true)
    );
    
    const results = await Promise.all(searchPromises);
    
    // Flatten and deduplicate results
    const allResults = results.flat();
    const seen = new Set();
    return allResults.filter(result => {
      if (seen.has(result.id)) return false;
      seen.add(result.id);
      return true;
    }).slice(0, 20); // Limit to top 20 results
  }

  private analyzeContext(results: any[], query: string): ContextAnalysis {
    // Simple context analysis without additional API calls
    const topics = new Set<string>();
    const informationGaps: string[] = [];
    
    results.forEach(result => {
      const chunkType = result.payload?.chunk_type;
      if (chunkType) topics.add(chunkType);
    });

    const contextQuality = Math.min(1.0, results.length / 10);
    
    return {
      topicsIdentified: Array.from(topics),
      informationGaps,
      contextQuality
    };
  }

  private async performQAAnalysis(query: string, context: string): Promise<QAAnalysis> {
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
      const result = await geminiService.generateText(prompt);
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
    } catch (error) {
      console.error('Error in QA analysis:', error);
    }

    return {
      needsMoreContext: false,
      answerable: true,
      confidence: 0.7,
      missingInfo: []
    };
  }

  private async performIterativeRefinement(
    query: string,
    context: string,
    previousMessages: any[],
    userPreferences: any,
    maxIterations: number,
    remainingApiCalls: number
  ): Promise<{
    response: string;
    iterationsUsed: number;
    apiCallsUsed: number;
    steps: ReasoningStep[];
  }> {
    const steps: ReasoningStep[] = [];
    let currentResponse = '';
    let apiCallsUsed = 0;
    
    for (let i = 0; i < maxIterations && apiCallsUsed < remainingApiCalls - 1; i++) {
      const iterationStart = Date.now();
      
      if (i === 0) {
        // First iteration: Generate initial response
        currentResponse = await geminiService.generateResponse(
          previousMessages.concat([{ role: 'user', content: query }]),
          context,
          userPreferences,
          true
        );
        apiCallsUsed++;
      } else {
        // Subsequent iterations: Refine the response
        const refinementPrompt = `Improve the following response to the user query by making it more comprehensive and accurate:

Original Query: ${query}
Current Response: ${currentResponse}
Additional Context: ${context.slice(0, 1000)}

Provide an improved version:`;

        currentResponse = await geminiService.generateText(refinementPrompt);
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

  private async assessResponseQuality(query: string, response: string, context: string): Promise<number> {
    const prompt = `Rate the quality of this response on a scale of 0-1:

Query: ${query}
Response: ${response}
Available Context: ${context.slice(0, 500)}...

Consider: relevance, completeness, accuracy, clarity.
Respond with only a number between 0 and 1:`;

    try {
      const result = await geminiService.generateText(prompt);
      const score = parseFloat(result.trim());
      return isNaN(score) ? 0.7 : Math.max(0, Math.min(1, score));
    } catch (error) {
      console.error('Error assessing response quality:', error);
      return 0.7;
    }
  }
}

export default new AdvancedReasoningService();
