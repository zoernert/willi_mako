#!/usr/bin/env node
/**
 * CS30 Chat Flow Debug Script
 * 
 * This script simulates the chat flow of the Willi Mako application,
 * specifically focusing on analyzing issues with the CS30 collection.
 * It captures all reasoning steps, contexts, and responses in a debug.json file.
 * 
 * Version 2.0: Added support for HyDE, intelligent filtering, and optimized search
 * to match the production search logic.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuration
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const CS30_COLLECTION_NAME = process.env.CS30_COLLECTION || 'cs30';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Command line options
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');
const INSPECT_ONLY = process.argv.includes('--inspect-only');
const LOWER_THRESHOLD = process.argv.includes('--lower-threshold') || process.argv.includes('-l');
const EXPAND_QUERY = process.argv.includes('--expand-query') || process.argv.includes('-e');
const SAMPLE_POINTS = process.argv.includes('--sample-points') || process.argv.includes('-s');
const USE_HYDE = process.argv.includes('--hyde') || process.argv.includes('-h');
const DISABLE_FILTERS = process.argv.includes('--no-filters');
const DISABLE_OPTIMIZATIONS = process.argv.includes('--no-optimizations');
const COMPARE_METHODS = process.argv.includes('--compare') || process.argv.includes('-c');
const SHOW_QUERY = process.argv.includes('--show-query') || process.argv.includes('-q');

// Initialize the debug object
const debugData = {
  timestamp: new Date().toISOString(),
  query: '',
  expandedQuery: '',
  hypotheticalAnswer: '',
  commandLineOptions: {
    verbose: VERBOSE,
    inspectOnly: INSPECT_ONLY,
    lowerThreshold: LOWER_THRESHOLD,
    expandQuery: EXPAND_QUERY,
    samplePoints: SAMPLE_POINTS,
    useHyDE: USE_HYDE,
    disableFilters: DISABLE_FILTERS,
    disableOptimizations: DISABLE_OPTIMIZATIONS,
    compareMethods: COMPARE_METHODS
  },
  flow: [],
  cs30: {
    collection: CS30_COLLECTION_NAME,
    isAvailable: false,
    collectionInfo: {},
    samplePoints: [],
    searchResults: [],
    basicSearchResults: [],
    searchScores: [],
    payloadStructure: {},
    contextUsed: ''
  },
  response: {
    final: '',
    withoutCs30: '',
    onlyCs30: '',
    analysis: {}
  },
  metrics: {
    cs30SearchTime: 0,
    cs30GenerationTime: 0,
    totalProcessingTime: 0
  }
};

// Initialize clients
const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
  checkCompatibility: false
});

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

/**
 * Logs a step in the processing flow
 */
function logStep(stepName, details) {
  const step = {
    name: stepName,
    timestamp: new Date().toISOString(),
    details
  };
  
  debugData.flow.push(step);
  console.log(`[${stepName}]`, typeof details === 'object' ? JSON.stringify(details).substring(0, 100) + '...' : details);
  
  return step;
}

/**
 * Checks if CS30 collection exists and is available
 */
async function checkCs30Availability() {
  logStep('CS30_CHECK_START', 'Checking CS30 collection availability');
  
  try {
    const collections = await qdrantClient.getCollections();
    const isAvailable = collections.collections.some(c => c.name === CS30_COLLECTION_NAME);
    
    debugData.cs30.isAvailable = isAvailable;
    
    logStep('CS30_CHECK_COMPLETE', { isAvailable });
    
    if (isAvailable) {
      const collectionInfo = await qdrantClient.getCollection(CS30_COLLECTION_NAME);
      const collectionDetails = {
        vectorCount: collectionInfo.vectors_count,
        dimensions: collectionInfo.config?.params?.vectors?.size || 'unknown',
        distanceMetric: collectionInfo.config?.params?.vectors?.distance || 'unknown',
        hasIndexes: !!collectionInfo.config?.params?.indexing_threshold,
        config: collectionInfo.config
      };
      
      debugData.cs30.collectionInfo = collectionDetails;
      
      logStep('CS30_COLLECTION_INFO', collectionDetails);
      
      // Get sample points if requested
      if (SAMPLE_POINTS) {
        await getSamplePoints();
      }
    }
    
    return isAvailable;
  } catch (error) {
    logStep('CS30_CHECK_ERROR', { error: error.message });
    return false;
  }
}

/**
 * Gets sample points from the CS30 collection to analyze
 */
async function getSamplePoints() {
  logStep('CS30_SAMPLE_POINTS_START', 'Getting sample points from CS30 collection');
  
  try {
    const scrollResult = await qdrantClient.scroll(CS30_COLLECTION_NAME, {
      limit: 5,
      with_payload: true,
      with_vector: false
    });
    
    if (scrollResult.points && scrollResult.points.length > 0) {
      const samplePoints = scrollResult.points.map(point => ({
        id: point.id,
        payloadKeys: Object.keys(point.payload || {}),
        payload: VERBOSE ? point.payload : {
          // Include only important fields for non-verbose mode
          title: point.payload?.title || point.payload?.name,
          content_preview: truncateString(point.payload?.content || point.payload?.text || '', 200),
          source: point.payload?.source,
          type: point.payload?.type
        }
      }));
      
      debugData.cs30.samplePoints = samplePoints;
      
      // Analyze payload structure to understand what fields are available
      if (scrollResult.points.length > 0 && scrollResult.points[0].payload) {
        const samplePayload = scrollResult.points[0].payload;
        const structure = analyzePayloadStructure(samplePayload);
        debugData.cs30.payloadStructure = structure;
      }
      
      logStep('CS30_SAMPLE_POINTS_COMPLETE', { 
        count: samplePoints.length,
        sample: samplePoints[0]
      });
    } else {
      logStep('CS30_SAMPLE_POINTS_COMPLETE', { count: 0 });
    }
  } catch (error) {
    logStep('CS30_SAMPLE_POINTS_ERROR', { error: error.message });
  }
}

/**
 * Analyzes the structure of a payload to understand what fields are available
 */
function analyzePayloadStructure(payload) {
  const structure = {};
  
  for (const key in payload) {
    const value = payload[key];
    const valueType = typeof value;
    
    if (valueType === 'object' && value !== null) {
      structure[key] = {
        type: Array.isArray(value) ? 'array' : 'object',
        length: Array.isArray(value) ? value.length : Object.keys(value).length,
        sample: Array.isArray(value) && value.length > 0 ? 
          (typeof value[0] === 'object' ? '[Complex Object]' : value[0]) : 
          '[Object]'
      };
    } else {
      structure[key] = {
        type: valueType,
        length: valueType === 'string' ? value.length : null,
        sample: valueType === 'string' ? truncateString(value, 50) : value
      };
    }
  }
  
  return structure;
}

/**
 * Helper function to truncate strings
 */
function truncateString(str, maxLength) {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

/**
 * Generate embeddings for text using Gemini
 */
async function generateEmbedding(text) {
  logStep('EMBEDDING_GENERATION_START', { text: text.substring(0, 100) + '...' });
  
  try {
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const embedResult = await embeddingModel.embedContent(text);
    const embedding = embedResult.embedding.values;
    
    logStep('EMBEDDING_GENERATION_COMPLETE', { dimensions: embedding.length });
    
    return embedding;
  } catch (error) {
    logStep('EMBEDDING_GENERATION_ERROR', { error: error.message });
    throw error;
  }
}

/**
 * Query analysis for intelligent filtering
 */
class QueryAnalysisService {
  static DOCUMENT_MAPPINGS = {
    'GPKE': 'GPKE_Geschäftsprozesse',
    'MaBiS': 'MaBiS_Marktregeln',
    'WiM': 'WiM_Wechselprozesse',
    'BDEW': 'BDEW_Marktregeln',
    'MaKo': 'MaKo_Marktkommunikation',
    'EDIFACT': 'EDIFACT_Standards',
    'UTILMD': 'UTILMD_Stammdaten',
    'MSCONS': 'MSCONS_Verbrauchsdaten'
  };

  static DEFINITION_PATTERNS = [
    /was ist\s+/i,
    /definiere\s+/i,
    /was bedeutet\s+/i,
    /definition\s+(von|für)\s+/i,
    /erklär(e|ung)\s+(mir\s+)?/i,
    /was versteht man unter\s+/i,
    /abkürzung\s+/i,
    /steht.*für/i
  ];

  static TABLE_PATTERNS = [
    /liste\s+(der|von|alle)/i,
    /tabelle\s+(mit|der|von)/i,
    /fristen\s+(für|von|in)/i,
    /werte\s+(in|der|aus)\s+(der\s+)?tabelle/i,
    /übersicht\s+(über|der|von)/i,
    /aufstellung\s+(der|von)/i,
    /codes?\s+(für|von|in)/i,
    /kennzahlen\s+(für|von)/i
  ];

  /**
   * Analyzes a user query and extracts filter criteria
   */
  static analyzeQuery(query) {
    const normalizedQuery = query.toLowerCase().trim();
    let intentType = 'general';
    let confidence = 0.7;
    const filterCriteria = {
      temporal: { requireLatest: true }
    };

    // 1. Detect intent type
    if (this.DEFINITION_PATTERNS.some(pattern => pattern.test(normalizedQuery))) {
      intentType = 'definition';
      filterCriteria.chunkTypes = ['definition', 'abbreviation'];
      confidence = 0.9;
    } else if (this.TABLE_PATTERNS.some(pattern => pattern.test(normalizedQuery))) {
      intentType = 'table_data';
      filterCriteria.chunkTypes = ['structured_table'];
      confidence = 0.85;
    }

    // 2. Detect document reference
    let documentReference;
    for (const [keyword, documentBaseName] of Object.entries(this.DOCUMENT_MAPPINGS)) {
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (keywordRegex.test(query)) {
        documentReference = keyword;
        filterCriteria.documentBaseName = documentBaseName;
        if (intentType === 'general') {
          intentType = 'document_specific';
        }
        confidence = Math.min(confidence + 0.1, 1.0);
        break;
      }
    }

    // 3. Query expansion
    let expandedQuery = query;
    
    // 4. Expand query based on intent
    if (intentType === 'definition') {
      expandedQuery = `Definition und Bedeutung: ${expandedQuery}`;
    } else if (intentType === 'table_data') {
      expandedQuery = `Tabellarische Daten und Listen: ${expandedQuery}`;
    }

    return {
      intentType,
      documentReference,
      filterCriteria,
      expandedQuery,
      confidence
    };
  }

  /**
   * Creates Qdrant filter based on analysis results
   */
  static createQdrantFilter(analysisResult) {
    const filter = {};
    const mustFilters = [];

    // Chunk-Type Filter
    if (analysisResult.filterCriteria.chunkTypes) {
      mustFilters.push({
        key: 'chunk_type',
        match: { 
          value: analysisResult.filterCriteria.chunkTypes.length === 1 
            ? analysisResult.filterCriteria.chunkTypes[0]
            : analysisResult.filterCriteria.chunkTypes 
        }
      });
    }

    // Document-specific filter
    if (analysisResult.filterCriteria.documentBaseName) {
      mustFilters.push({
        key: 'document_metadata.document_base_name',
        match: { value: analysisResult.filterCriteria.documentBaseName }
      });
    }

    if (mustFilters.length > 0) {
      filter.must = mustFilters;
    }

    return Object.keys(filter).length > 0 ? filter : null;
  }

  /**
   * Creates a summary of applied filters for logging
   */
  static createFilterSummary(analysisResult) {
    const parts = [];
    
    parts.push(`Intent: ${analysisResult.intentType}`);
    
    if (analysisResult.documentReference) {
      parts.push(`Dokument: ${analysisResult.documentReference}`);
    }
    
    if (analysisResult.filterCriteria.chunkTypes) {
      parts.push(`Chunk-Types: ${analysisResult.filterCriteria.chunkTypes.join(', ')}`);
    }
    
    parts.push(`Confidence: ${(analysisResult.confidence * 100).toFixed(1)}%`);
    
    return parts.join(' | ');
  }
}

/**
 * Generates a hypothetical answer for HyDE approach
 */
async function generateHypotheticalAnswer(query) {
  logStep('HYDE_GENERATION_START', { query });
  
  try {
    const prompt = `Du bist ein Experte für die deutsche Energiewirtschaft. Beantworte die folgende Frage prägnant und ausschließlich basierend auf deinem allgemeinen Wissen über die Marktprozesse. Gib nur die Antwort aus, ohne einleitende Sätze.

Frage: ${query}

Antwort:`;

    const result = await model.generateContent(prompt, {
      temperature: 0.2,
      maxOutputTokens: 1024,
    });
    
    const answer = result.response.text().trim();
    
    logStep('HYDE_GENERATION_COMPLETE', { answer });
    
    return answer;
  } catch (error) {
    logStep('HYDE_GENERATION_ERROR', { error: error.message });
    // Fallback to original query
    return query;
  }
}

/**
 * Optimized search function that mimics the production search logic
 */
async function searchWithOptimizations(query, limit = 5, scoreThreshold = 0.60) {
  logStep('OPTIMIZED_SEARCH_START', { query, limit, scoreThreshold });
  
  try {
    // 1. Query analysis for intelligent filtering
    const analysisResult = QueryAnalysisService.analyzeQuery(query);
    
    logStep('QUERY_ANALYSIS', {
      intentType: analysisResult.intentType,
      documentReference: analysisResult.documentReference,
      expandedQuery: analysisResult.expandedQuery,
      confidence: analysisResult.confidence,
      filterSummary: QueryAnalysisService.createFilterSummary(analysisResult)
    });
    
    // 2. HyDE: Generate hypothetical answer if enabled
    let searchQuery = analysisResult.expandedQuery;
    if (USE_HYDE) {
      try {
        const hypotheticalAnswer = await generateHypotheticalAnswer(analysisResult.expandedQuery);
        searchQuery = hypotheticalAnswer;
        debugData.hypotheticalAnswer = hypotheticalAnswer;
      } catch (error) {
        logStep('HYDE_ERROR', { error: error.message });
        // Continue with expanded query on error
      }
    }
    
    // 3. Create filter based on analysis (if not disabled)
    let filter = null;
    if (!DISABLE_FILTERS) {
      filter = QueryAnalysisService.createQdrantFilter(analysisResult);
      logStep('FILTER_CREATED', { filter });
    }
    
    // 4. Generate embedding and search
    const queryVector = await generateEmbedding(searchQuery);
    
    const searchParams = {
      vector: queryVector,
      limit,
      score_threshold: scoreThreshold,
      with_payload: true
    };
    
    if (filter) {
      searchParams.filter = filter;
    }
    
    logStep('SEARCH_EXECUTION', { 
      searchQuery: SHOW_QUERY ? searchQuery : truncateString(searchQuery, 100),
      params: searchParams 
    });
    
    const results = await qdrantClient.search(CS30_COLLECTION_NAME, searchParams);
    
    logStep('SEARCH_RESULTS_COUNT', { count: results.length });
    
    // 5. Add metadata to results
    const enhancedResults = results.map(result => {
      return {
        ...result,
        search_metadata: {
          original_query: query,
          expanded_query: analysisResult.expandedQuery,
          search_query: searchQuery,
          analysis_result: {
            intent_type: analysisResult.intentType,
            confidence: analysisResult.confidence,
            document_reference: analysisResult.documentReference,
            filter_summary: QueryAnalysisService.createFilterSummary(analysisResult),
          },
          filter_applied: filter ? Object.keys(filter) : [],
          used_hyde: USE_HYDE
        }
      };
    });
    
    return enhancedResults;
  } catch (error) {
    logStep('OPTIMIZED_SEARCH_ERROR', { error: error.message });
    return [];
  }
}

/**
 * Basic search function (for comparison with optimized search)
 */
async function basicSearch(query, limit = 5, scoreThreshold = 0.60) {
  // If we're using expanded query, generate it first
  let expandedQuery = query;
  if (EXPAND_QUERY) {
    try {
      expandedQuery = await expandQueryForSearch(query);
      debugData.expandedQuery = expandedQuery;
    } catch (error) {
      logStep('QUERY_EXPANSION_ERROR', { error: error.message });
    }
  }
  
  // Use lower threshold if specified
  if (LOWER_THRESHOLD) {
    scoreThreshold = 0.3; // Much lower threshold to see any matches
  }
  
  // Use the appropriate query for search
  const searchQuery = EXPAND_QUERY ? expandedQuery : query;
  
  logStep('BASIC_SEARCH_START', { 
    originalQuery: query,
    searchQuery,
    limit, 
    scoreThreshold,
    usingExpansion: EXPAND_QUERY
  });
  
  try {
    const queryVector = await generateEmbedding(searchQuery);
    
    const searchResults = await qdrantClient.search(CS30_COLLECTION_NAME, {
      vector: queryVector,
      limit: limit,
      score_threshold: scoreThreshold,
      with_payload: true
    });
    
    logStep('BASIC_SEARCH_COMPLETE', { 
      resultsCount: searchResults.length
    });
    
    return searchResults;
  } catch (error) {
    logStep('BASIC_SEARCH_ERROR', { error: error.message });
    return [];
  }
}

/**
 * Expands a user query to improve search results
 * This technique helps bridge the semantic gap by adding relevant terms
 */
async function expandQueryForSearch(query) {
  logStep('QUERY_EXPANSION_START', { originalQuery: query });
  
  try {
    const prompt = `Als Assistent für die Energiewirtschaft und speziell für die Schleupen CS/30 Software, 
erweitere die folgende Suchanfrage mit relevanten Fachbegriffen, ohne die Bedeutung zu verändern.
Füge Schleupen-spezifische Menüpfade, Modulnamen und typische Arbeitsprozesse hinzu, die für diese Anfrage relevant sein könnten.
Formuliere keine neue Frage, sondern gib nur die erweiterte Suchanfrage zurück (maximal 200 Zeichen).

Originalanfrage: "${query}"`;

    const result = await model.generateContent(prompt, {
      temperature: 0.2,
      maxOutputTokens: 512,
    });
    
    const expandedQuery = result.response.text().trim();
    
    logStep('QUERY_EXPANSION_COMPLETE', { 
      originalQuery: query, 
      expandedQuery 
    });
    
    return expandedQuery;
  } catch (error) {
    logStep('QUERY_EXPANSION_ERROR', { error: error.message });
    return query; // Fallback to original query
  }
}

/**
 * Searches the CS30 collection for relevant documents
 */
async function searchCs30(query, limit = 5, scoreThreshold = 0.60) {
  const startTime = Date.now();
  
  // Use lower threshold if specified
  if (LOWER_THRESHOLD) {
    scoreThreshold = 0.3; // Much lower threshold to see any matches
  }

  let results = [];
  
  if (COMPARE_METHODS) {
    // Run both methods and compare
    const basicResults = await basicSearch(query, limit, scoreThreshold);
    const optimizedResults = await searchWithOptimizations(query, limit, scoreThreshold);
    
    logStep('SEARCH_COMPARISON', {
      basicResultsCount: basicResults.length,
      optimizedResultsCount: optimizedResults.length
    });
    
    // Store both results in debug data
    debugData.cs30.basicSearchResults = basicResults.map(result => ({
      id: result.id,
      score: result.score,
      payload: VERBOSE ? result.payload : {
        title: result.payload?.title || result.payload?.name || 'No title',
        contentPreview: truncateString(result.payload?.content || result.payload?.text || '', 200),
        source: result.payload?.source || 'Unknown',
        type: result.payload?.type || 'Unknown'
      }
    }));
    
    // Use optimized results as the main results
    results = optimizedResults;
  } else if (DISABLE_OPTIMIZATIONS) {
    // Use basic search
    results = await basicSearch(query, limit, scoreThreshold);
  } else {
    // Use optimized search
    results = await searchWithOptimizations(query, limit, scoreThreshold);
  }
  
  const endTime = Date.now();
  debugData.metrics.cs30SearchTime = endTime - startTime;
  
  // Log more details if we have results
  if (results.length > 0) {
    const topResultDetails = {
      id: results[0].id,
      score: results[0].score,
      payloadKeys: Object.keys(results[0].payload || {})
    };
    
    if (VERBOSE) {
      topResultDetails.payload = results[0].payload;
    } else {
      topResultDetails.title = results[0].payload?.title || results[0].payload?.name || 'No title';
      topResultDetails.contentPreview = truncateString(results[0].payload?.content || results[0].payload?.text || '', 100);
    }
    
    logStep('CS30_TOP_RESULT', topResultDetails);
  }
  
  debugData.cs30.searchResults = results.map(result => ({
    id: result.id,
    score: result.score,
    payload: VERBOSE ? result.payload : {
      title: result.payload?.title || result.payload?.name || 'No title',
      contentPreview: truncateString(result.payload?.content || result.payload?.text || '', 200),
      source: result.payload?.source || 'Unknown',
      type: result.payload?.type || 'Unknown'
    }
  }));
  
  debugData.cs30.searchScores = results.map(r => r.score);
  
  return results;
}

/**
 * Extracts the main content from a search result
 */
function extractContentFromResult(result) {
  // Try to get content from both possible fields (content or text)
  let content = '';
  
  if (result.payload?.content && typeof result.payload.content === 'string') {
    content = result.payload.content;
  } else if (result.payload?.text && typeof result.payload.text === 'string') {
    content = result.payload.text;
  }
  
  // Add title if available
  const title = result.payload?.title || result.payload?.name || '';
  if (title) {
    content = `## ${title}\n\n${content}`;
  }
  
  // Add source if available
  const source = result.payload?.source || '';
  if (source) {
    content += `\n\nQuelle: ${source}`;
  }
  
  return content;
}

/**
 * Prepares context for the chat API
 */
function prepareContextFromResults(results) {
  if (!results || results.length === 0) {
    return '';
  }
  
  // Extract content from results
  const contexts = results.map((result, index) => {
    const content = extractContentFromResult(result);
    return `[Dokument ${index + 1}] (Relevanz: ${result.score.toFixed(2)})\n${content}`;
  });
  
  return contexts.join('\n\n');
}

/**
 * Generate a response using Gemini
 */
async function generateResponse(query, context = '', useContext = true) {
  try {
    const startTime = Date.now();
    
    // Create prompt based on whether we're using context
    const prompt = useContext 
      ? `Du bist Willi, ein hilfreicher virtueller Assistent für die deutsche Energiewirtschaft. 
Deine Aufgabe ist es, Fragen zu Marktprozessen, GPKE, MaBiS, WiM und anderen energiewirtschaftlichen Themen zu beantworten.
Gib präzise, verständliche und fachlich korrekte Antworten.
Nutze ausschließlich die folgenden Kontextinformationen für deine Antwort:

Kontext:
${context}

Frage: ${query}`
      : `Du bist Willi, ein hilfreicher virtueller Assistent für die deutsche Energiewirtschaft. 
Deine Aufgabe ist es, Fragen zu Marktprozessen, GPKE, MaBiS, WiM und anderen energiewirtschaftlichen Themen zu beantworten.
Gib präzise, verständliche und fachlich korrekte Antworten.
Nutze dein allgemeines Wissen über die deutsche Energiewirtschaft:

Frage: ${query}`;
    
    // Generate content with a single call
    const result = await model.generateContent(prompt, {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 1024,
    });
    
    const response = await result.response;
    const endTime = Date.now();
    const generationTime = endTime - startTime;
    
    if (useContext) {
      debugData.metrics.cs30GenerationTime = generationTime;
    }
    
    return response.text();
  } catch (error) {
    console.error('Error generating response:', error);
    return 'Entschuldigung, ich konnte keine Antwort generieren. Bitte versuche es später noch einmal.';
  }
}

/**
 * Analyzes and compares the standard and CS30 responses
 */
async function compareResponses(standardResponse, cs30Response, userQuery) {
  logStep('RESPONSE_COMPARISON_START', { 
    standardResponseLength: standardResponse.length,
    cs30ResponseLength: cs30Response.length
  });
  
  try {
    const prompt = `Analysiere die beiden Antworten auf die Nutzeranfrage und vergleiche ihre Qualität.
Nutzeranfrage: "${userQuery}"

STANDARDANTWORT (ohne CS30-Kontext):
${standardResponse}

CS30-ANTWORT (mit CS30-Kontext):
${cs30Response}

Bewerte folgende Aspekte und gib jeweils eine Punktzahl von 1-10:
1. Inhaltliche Relevanz zur Anfrage
2. Detailtiefe und Spezifität
3. Fachliche Korrektheit
4. Nützlichkeit für Energieversorgungs-Mitarbeiter
5. Vollständigkeit der Antwort

Abschließendes Urteil: Welche Antwort ist besser für die gegebene Anfrage?`;

    const result = await model.generateContent(prompt, {
      temperature: 0.2,
      maxOutputTokens: 4096,
    });
    
    const analysis = result.response.text();
    
    logStep('RESPONSE_COMPARISON_COMPLETE', { 
      analysisLength: analysis.length
    });
    
    return analysis;
  } catch (error) {
    logStep('RESPONSE_COMPARISON_ERROR', { error: error.message });
    return `Fehler bei der Vergleichsanalyse: ${error.message}`;
  }
}

/**
 * Main function
 */
async function main() {
  const startTime = Date.now();
  
  // Create debug-logs directory if it doesn't exist
  const logsDir = 'debug-logs';
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }
  
  // Get query from command line with improved debugging
  console.log('Debug - process.argv:', process.argv);
  
  // Improved query extraction - find the first non-option argument
  // that isn't the script name and isn't following an option that takes a parameter
  let queryArg = null;
  const knownOptionsWithValues = ['-o', '--output', '--file'];
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    const prevArg = process.argv[i-1];
    
    // Skip this argument if it follows an option that takes a value
    if (knownOptionsWithValues.includes(prevArg)) {
      continue;
    }
    
    // Skip options
    if (arg.startsWith('-')) {
      continue;
    }
    
    // Skip the script name
    if (arg === process.argv[0] || arg.endsWith('debug-cs30-chat-flow-v2.js')) {
      continue;
    }
    
    // This is likely the query
    queryArg = arg;
    break;
  }
  
  console.log('Debug - extracted queryArg:', queryArg);
  
  if (!queryArg && !INSPECT_ONLY) {
    console.log('Usage: node debug-cs30-chat-flow-v2.js "Your query here" [options]');
    console.log('Options:');
    console.log('  --verbose, -v       Show verbose output');
    console.log('  --inspect-only      Only inspect collection, don\'t run query');
    console.log('  --sample-points, -s Show sample points from collection');
    console.log('  --lower-threshold, -l Use lower threshold for search');
    console.log('  --expand-query, -e  Use query expansion');
    console.log('  --hyde, -h          Use HyDE for search (Hypothetical Document Embeddings)');
    console.log('  --no-filters        Disable intelligent filters');
    console.log('  --no-optimizations  Use basic search instead of optimized search');
    console.log('  --compare, -c       Run both basic and optimized search for comparison');
    console.log('  --show-query, -q    Show full generated queries in logs');
    return;
  }
  
  const query = queryArg || 'Inspect only mode';
  debugData.query = query;
  
  // Check CS30 availability
  const isCs30Available = await checkCs30Availability();
  
  if (!isCs30Available) {
    console.log('CS30 collection is not available');
    writeDebugData();
    return;
  }
  
  if (INSPECT_ONLY) {
    console.log('Inspect only mode - completed');
    writeDebugData();
    return;
  }
  
  // Search CS30
  const searchResults = await searchCs30(query);
  
  if (searchResults.length === 0) {
    console.log('No results found in CS30 collection');
  } else {
    console.log(`Found ${searchResults.length} results in CS30 collection`);
    
    // Prepare context from results
    const context = prepareContextFromResults(searchResults);
    debugData.cs30.contextUsed = context;
    
    // Generate response with CS30 context
    console.log('Generating response with CS30 context...');
    const responseWithCs30 = await generateResponse(query, context, true);
    debugData.response.final = responseWithCs30;
    debugData.response.onlyCs30 = responseWithCs30;
    
    console.log('\n--- Response with CS30 context ---');
    console.log(responseWithCs30);
  }
  
  // Generate response without CS30 context (for comparison)
  console.log('Generating response without CS30 context...');
  const responseWithoutCs30 = await generateResponse(query, '', false);
  debugData.response.withoutCs30 = responseWithoutCs30;
  
  // Compare responses if we have both
  if (searchResults.length > 0) {
    console.log('Comparing responses...');
    const analysis = await compareResponses(responseWithoutCs30, debugData.response.onlyCs30, query);
    debugData.response.analysis = analysis;
    
    console.log('\n--- Response Comparison Analysis ---');
    console.log(analysis);
  } else {
    // If no CS30 results, use the response without CS30 as final
    debugData.response.final = responseWithoutCs30;
    
    console.log('\n--- Response without CS30 context ---');
    console.log(responseWithoutCs30);
  }
  
  const endTime = Date.now();
  debugData.metrics.totalProcessingTime = endTime - startTime;
  
  // Write debug data
  writeDebugData();
}

/**
 * Writes debug data to a file
 */
function writeDebugData() {
  // Create timestamp for filename
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const sanitizedQuery = debugData.query.slice(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `debug-logs/cs30-${sanitizedQuery}_${timestamp}.json`;
  
  try {
    fs.writeFileSync(filename, JSON.stringify(debugData, null, 2));
    console.log(`\nDebug data written to ${filename}`);
  } catch (error) {
    console.error('Error writing debug data:', error);
  }
}

// Run the main function
main().catch(error => {
  console.error('Error in main function:', error);
  
  // Still try to write debug data on error
  debugData.error = error.message;
  writeDebugData();
});
