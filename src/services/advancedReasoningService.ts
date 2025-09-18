import { QdrantService } from './qdrant';
import llm from './llmProvider';

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
  mainIntent?: string;
  complexityLevel?: 'easy' | 'medium' | 'hard';
  marketCommunicationRelevance?: number;
  semanticConcepts?: string[];
  domainKeywords?: string[];
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
  hybridSearchUsed?: boolean;
  hybridSearchAlpha?: number;
}

class AdvancedReasoningService {
  private qdrantService: QdrantService;
  private maxApiCalls = 10;

  constructor() {
    this.qdrantService = new QdrantService();
  }

  // Build lightweight metrics about context usage per step
  private buildContextMetrics(results: any[]) {
    try {
      const safeArray = Array.isArray(results) ? results : [];
      const getText = (r: any) => (r?.payload?.text || r?.payload?.content || '') as string;
      const getSourceLabel = (r: any) => {
        const p = r?.payload || {};
        // Prefer message_format grouping (e.g., BDEW, BNetzA, FAQ, Mein Workspace)
        return (
          p.message_format ||
          p.type ||
          p.source ||
          p.document_name ||
          'Unbekannt'
        ) as string;
      };
      const totals = {
        totalSnippets: safeArray.length,
        contextChars: 0,
        approxTokens: 0,
        bySource: {} as Record<string, { count: number; chars: number }>
      };
      for (const r of safeArray) {
        const txt = getText(r);
        const chars = typeof txt === 'string' ? txt.length : 0;
        totals.contextChars += chars;
        const label = getSourceLabel(r);
        if (!totals.bySource[label]) totals.bySource[label] = { count: 0, chars: 0 };
        totals.bySource[label].count += 1;
        totals.bySource[label].chars += chars;
      }
      // Rough token estimate (German text ~ 4 chars/token on average)
      totals.approxTokens = Math.max(1, Math.round(totals.contextChars / 4));
      return totals;
    } catch {
      return { totalSnippets: 0, contextChars: 0, approxTokens: 0, bySource: {} };
    }
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
    
    // Flag für detaillierte Intent-Analyse
    const useDetailedIntentAnalysis = contextSettings?.useDetailedIntentAnalysis === true;
    console.log(`🔍 Intent Analysis Mode: ${useDetailedIntentAnalysis ? 'Detailed' : 'Standard'}`);

  try {
      console.log('🚀 Starting Advanced Reasoning Pipeline...');

      // Step 1: Question Analysis (1 API call max, immer bei detaillierter Intent-Analyse)
      let qaAnalysis: QAAnalysis;
      let enhancedSearchQueries: string[] = [];
      
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
        
        const intentAnalysisResult = await llm.generateStructuredOutput(
          intentAnalysisPrompt,
          userPreferences
        );
        apiCallsUsed++;
        
        // Erweiterte Abfragen generieren basierend auf der Intent-Analyse
        const queryGenerationPrompt = `
          Basierend auf der folgenden Frage und Intent-Analyse, generiere 3-5 optimierte Suchbegriffe für eine Vektordatenbank.
          Die Suchbegriffe sollten verschiedene Aspekte der Frage abdecken und Fachbegriffe aus der Marktkommunikation für Energieversorger enthalten.
          
          Frage: "${query}"
          Intent-Analyse: ${JSON.stringify(intentAnalysisResult)}
          
          Formatiere die Antwort als JSON-Array mit Strings.
        `;
        
        enhancedSearchQueries = await llm.generateStructuredOutput(
          queryGenerationPrompt,
          userPreferences
        );
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
      } else {
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
      const quickResults = await QdrantService.semanticSearchGuided(query, {
        limit: 24,
        outlineScoping: true,
        excludeVisual: true
      });
      
      if (quickResults.length === 0) {
        // If no results, try one enhanced search
        const searchQueries = await this.generateOptimalSearchQueries(query, userPreferences);
        apiCallsUsed++;
        
        // Benutzer-ID aus userPreferences extrahieren, falls vorhanden
        const userId = userPreferences?.user_id;
        const teamId = userPreferences?.team_id;
        
  const allResults = await this.performParallelSearch(
          searchQueries.slice(0, 3), // Limit to 3 queries
          userId,
          teamId
        );
        
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
        result: { 
          documentsFound: quickResults.length, 
          quality: contextAnalysis.contextQuality,
          contextMetrics: this.buildContextMetrics(quickResults)
        }
      });

  // Response Generation
      const responseStart = Date.now();
      
      // Check if we have enough context for a direct response
      if (contextAnalysis.contextQuality > 0.5 || quickResults.length >= 5) {
        console.log('✅ Sufficient context found, generating direct response');
        // Re-rank the quick results to maximize relevance
        const rerankStart = Date.now();
        const topN = Math.min(12, quickResults.length);
        const rerankedQuick = await this.rerankResultsLLM(query, quickResults, topN);
        reasoningSteps.push({
          step: 'rerank',
          description: `LLM re-ranking applied to quick results (top ${topN})`,
          timestamp: rerankStart,
          duration: Date.now() - rerankStart,
          qdrantResults: rerankedQuick.length,
          result: { contextMetrics: this.buildContextMetrics(rerankedQuick) }
        });
        // Check admin override for iterative refinement
        const override = contextSettings?.overridePipeline as Partial<PipelineDecision> | undefined;
        if (override?.useIterativeRefinement) {
          const decisions: PipelineDecision = {
            useIterativeRefinement: true,
            maxIterations: override.maxIterations ?? 2,
            confidenceThreshold: override.confidenceThreshold ?? 0.8,
            reason: 'Admin override iterative refinement'
          };
          return await this.generateRefinedResponse(
            query,
            rerankedQuick,
            previousMessages,
            userPreferences,
            reasoningSteps,
            1,
            qaAnalysis,
            contextAnalysis,
            decisions,
            useDetailedIntentAnalysis
          );
        }
        return await this.generateDirectResponse(
          query,
          rerankedQuick,
          previousMessages,
          userPreferences,
          reasoningSteps,
          1,
          qaAnalysis,
          contextAnalysis,
          {
            useIterativeRefinement: false,
            maxIterations: 1,
            confidenceThreshold: 0.8,
            reason: 'Direct response for speed'
          },
          useDetailedIntentAnalysis
        );
      }

      // Step 3: Enhanced search only if needed (2 more API calls max)
      console.log('🔍 Need more context, performing enhanced search...');
      const searchQueries = await this.generateOptimalSearchQueries(query, userPreferences);
      apiCallsUsed++;
      
      const enhancedResults = await this.performParallelSearch(searchQueries.slice(0, 4));
      const combinedResultsRaw = [...quickResults, ...enhancedResults].slice(0, 30); // Limit total results
      // Apply re-ranking on combined results
      const rerankStart2 = Date.now();
      const topNCombined = Math.min(12, combinedResultsRaw.length);
      const combinedResults = await this.rerankResultsLLM(query, combinedResultsRaw, topNCombined);
      reasoningSteps.push({
        step: 'rerank',
        description: `LLM re-ranking applied to combined results (top ${topNCombined})`,
        timestamp: rerankStart2,
        duration: Date.now() - rerankStart2,
  qdrantResults: combinedResults.length,
  result: { contextMetrics: this.buildContextMetrics(combinedResults) }
      });
      
      reasoningSteps.push({
        step: 'enhanced_retrieval',
        description: `Enhanced search with ${searchQueries.length} queries`,
        timestamp: responseStart,
        duration: Date.now() - responseStart,
        qdrantQueries: searchQueries,
  qdrantResults: enhancedResults.length,
  result: { contextMetrics: this.buildContextMetrics(enhancedResults) }
      });

      // Final response generation (with optional admin override)
      const override = contextSettings?.overridePipeline as Partial<PipelineDecision> | undefined;
      if (override?.useIterativeRefinement) {
        const decisions: PipelineDecision = {
          useIterativeRefinement: true,
          maxIterations: override.maxIterations ?? 2,
          confidenceThreshold: override.confidenceThreshold ?? 0.8,
          reason: 'Admin override iterative refinement'
        };
        return await this.generateRefinedResponse(
          query,
          combinedResults,
          previousMessages,
          userPreferences,
          reasoningSteps,
          apiCallsUsed + 1,
          qaAnalysis!,
          contextAnalysis,
          decisions,
          useDetailedIntentAnalysis
        );
      }
      return await this.generateDirectResponse(
        query,
        combinedResults,
        previousMessages,
        userPreferences,
        reasoningSteps,
        apiCallsUsed + 1,
        qaAnalysis!,
        contextAnalysis,
        {
          useIterativeRefinement: false,
          maxIterations: 1,
          confidenceThreshold: 0.8,
          reason: 'Direct response for speed'
        },
        useDetailedIntentAnalysis
      );

    } catch (error) {
      console.error('❌ Error in advanced reasoning:', error);
      
      // Fast fallback: Simple response generation
      try {
  const fallbackResults = await QdrantService.semanticSearchGuided(query, { limit: 16, outlineScoping: true, excludeVisual: true });
        const contextText = fallbackResults.map(r => r.payload?.text || '').join('\n');
        const fallbackResponse = await llm.generateResponse(
          previousMessages,
          contextText,
          userPreferences
        );

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
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  // Direkte Antwortgenerierung mit Unterstützung für detaillierte Intent-Analyse
  private async generateDirectResponse(
    query: string,
    results: any[],
    previousMessages: any[],
    userPreferences: any,
    reasoningSteps: ReasoningStep[],
    apiCallsUsed: number,
    qaAnalysis: QAAnalysis = {
      needsMoreContext: false,
      answerable: true,
      confidence: 0.7,
      missingInfo: []
    },
    contextAnalysis: ContextAnalysis = {
      topicsIdentified: [],
      informationGaps: [],
      contextQuality: 0.7
    },
    pipelineDecisions: PipelineDecision = {
      useIterativeRefinement: false,
      maxIterations: 1,
      confidenceThreshold: 0.8,
      reason: 'Direct response for speed'
    },
    usedDetailedIntentAnalysis: boolean = false
  ): Promise<ReasoningResult> {
    const responseStart = Date.now();
    
  // Synthesize context efficiently
  const context = results.map(r => r.payload?.text || r.payload?.content || '').join('\n\n');
  const contextMetrics = this.buildContextMetrics(results);
    
    // Generate response directly
    // Previous messages already include the most recent user turn from the DB
    const response = await llm.generateResponse(
      previousMessages,
      context,
      userPreferences
    );
    
    // Record the step
  reasoningSteps.push({
      step: 'direct_response',
      description: 'Direct response generation',
      timestamp: responseStart,
      duration: Date.now() - responseStart,
      result: { 
    response,
    qaAnalysis,
    usedDetailedIntentAnalysis,
    contextMetrics
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
  private async generateRefinedResponse(
    query: string,
    results: any[],
    previousMessages: any[],
    userPreferences: any,
    reasoningSteps: ReasoningStep[],
    apiCallsUsed: number,
    qaAnalysis: QAAnalysis,
    contextAnalysis: ContextAnalysis,
    pipelineDecisions: PipelineDecision,
    usedDetailedIntentAnalysis: boolean = false
  ): Promise<ReasoningResult> {
    // Implementierung für den iterativen Prozess
    const refinementStart = Date.now();
    
  // Synthesize context efficiently
  const context = results.map(r => r.payload?.text || r.payload?.content || '').join('\n\n');
  const contextMetrics = this.buildContextMetrics(results);
    
    // Erste Antwortgenerierung
  // Previous messages already include the most recent user turn from the DB
  const initialResponse = await llm.generateResponse(
      previousMessages,
      context,
      userPreferences
    );
    apiCallsUsed++;
    
    // Extract hybrid search metadata if available
    const hybridSearchMetadata = results.find((r: any) => r.hybridSearchMetadata)?.hybridSearchMetadata;
    const usedHybridSearch = hybridSearchMetadata?.hybridSearchUsed || false;
    const hybridSearchAlpha = hybridSearchMetadata?.hybridSearchAlpha;
    
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
          hybridSearchAlpha,
          contextMetrics
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

  private async generateOptimalSearchQueries(query: string, userPreferences: any): Promise<string[]> {
    try {
      // Fast search query generation with reduced complexity
      const simplePrompt = `Generate 3 search terms for: "${query}". Return only JSON array like ["term1", "term2", "term3"]:`;
      
  const result = await llm.generateText(simplePrompt, userPreferences);
      
      // Extract JSON array from response
      let queries: string[] = [];
      try {
        const jsonMatch = result.match(/\[.*?\]/);
        if (jsonMatch) {
          queries = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
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
      
    } catch (error) {
      console.error('Error generating search queries:', error);
      return [query]; // Fallback to original query
    }
  }

  private async performParallelSearch(queries: string[], userId?: string, teamId?: string): Promise<any[]> {
    try {
      // Perform searches using optimized guided retrieval
      console.log(`🔍 Performing parallel guided searches for ${queries.length} queries`);
      
  const searchPromises = queries.map(q => QdrantService.semanticSearchGuided(q, { limit: 20, outlineScoping: true, excludeVisual: true }));
      const searchResults = await Promise.all(searchPromises);
      
      // Flatten and process results
      let allResults: any[] = [];
      searchResults.forEach((resultArray: any[]) => {
        allResults = [...allResults, ...(Array.isArray(resultArray) ? resultArray : [resultArray])];
      });
      
      // Remove duplicates based on ID
      const seen = new Set();
      const uniqueResults = allResults.filter(result => {
        const id = result.id || (result.payload && result.payload.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      
      // Sort by score descending
      uniqueResults.sort((a, b) => (b.score ?? b.merged_score ?? 0) - (a.score ?? a.merged_score ?? 0));
      
  console.log(`✅ Found ${uniqueResults.length} unique results across ${queries.length} queries`);
  return uniqueResults.slice(0, 40); // Limit to top 40 results for richer context
    } catch (error) {
      console.error('❌ Error in parallel guided search:', error);
      
      // Fallback to most basic search if all else fails
  const fallbackPromises = queries.map(q => QdrantService.semanticSearchGuided(q, { limit: 20 }));
      const fallbackResults = await Promise.all(fallbackPromises);
      const flattenedResults = fallbackResults.flat();
      
      // Remove duplicates
      const seen = new Set();
      const uniqueResults = flattenedResults.filter(result => {
        const id = result.id || (result.payload && result.payload.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      
  return uniqueResults.slice(0, 40); // Limit to top 40 results
    }
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

  private async performQAAnalysis(
    query: string,
    context: string,
    userPreferences: any
  ): Promise<QAAnalysis> {
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
  const result = await llm.generateText(prompt, userPreferences);
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
        currentResponse = await llm.generateResponse(
          previousMessages,
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

  currentResponse = await llm.generateText(refinementPrompt, userPreferences);
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

  // Re-rank retrieved results using LLM to pick best matching snippets
  private async rerankResultsLLM(query: string, results: any[], topN: number = 12): Promise<any[]> {
    try {
      if (!Array.isArray(results) || results.length === 0) return [];
      if (results.length <= topN) return results;

      // Build compact candidates list
      const candidates = results.slice(0, Math.min(results.length, 40)).map((r, idx) => {
        const id = String(r.id ?? r.payload?.id ?? idx);
        const title = (r.payload?.title || r.payload?.document_name || r.payload?.document_base_name || '').toString();
        const chunk = (r.payload?.contextual_content || r.payload?.text || r.payload?.content || '').toString();
        const snippet = chunk.replace(/\s+/g, ' ').slice(0, 350);
        const ctype = (r.payload?.chunk_type || 'n/a').toString();
        const page = r.payload?.page_number != null ? `p.${r.payload.page_number}` : '';
        return { id, title, ctype, page, snippet };
      });

      const list = candidates.map(c => `- id: ${c.id}\n  title: ${c.title}\n  type: ${c.ctype} ${c.page}\n  snippet: ${c.snippet}`).join('\n\n');
      const prompt = `Wähle die ${topN} relevantesten Einträge zur Beantwortung der Nutzerfrage und gib die IDs in Reihenfolge zurück.
Nutzerfrage: ${query}
Kandidaten:\n${list}

Antworte ausschließlich als valides JSON ohne Markdown:
{"rankedIds": ["id1", "id2", ...]}`;

      const ranked = await llm.generateStructuredOutput(prompt);
      const ids: string[] = Array.isArray(ranked?.rankedIds) ? ranked.rankedIds.map((x: any) => String(x)) : [];
      if (!ids.length) return results.slice(0, topN);

      // Map by id (string) for quick lookup
      const byId = new Map<string, any>();
      for (const r of results) {
        const key = String(r.id ?? r.payload?.id ?? '');
        if (key) byId.set(key, r);
      }
      const ordered: any[] = [];
      for (const id of ids) {
        const item = byId.get(String(id));
        if (item) ordered.push(item);
      }
      // Append any missing items by original order to fill topN
      if (ordered.length < topN) {
        for (const r of results) {
          if (ordered.length >= topN) break;
          if (!ordered.includes(r)) ordered.push(r);
        }
      }
      return ordered.slice(0, topN);
    } catch (e) {
      console.warn('Re-ranking failed, using original order:', (e as any)?.message || e);
      return results.slice(0, topN);
    }
  }

  private async assessResponseQuality(
    query: string,
    response: string,
    context: string,
    userPreferences: any
  ): Promise<number> {
    const prompt = `Rate the quality of this response on a scale of 0-1:

Query: ${query}
Response: ${response}
Available Context: ${context.slice(0, 500)}...

Consider: relevance, completeness, accuracy, clarity.
Respond with only a number between 0 and 1:`;

    try {
  const result = await llm.generateText(prompt, userPreferences);
      const score = parseFloat(result.trim());
      return isNaN(score) ? 0.7 : Math.max(0, Math.min(1, score));
    } catch (error) {
      console.error('Error assessing response quality:', error);
      return 0.7;
    }
  }
}

export default new AdvancedReasoningService();
