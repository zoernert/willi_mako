#!/usr/bin/env node
/**
 * CS30 Chat Flow Debug Script
 * 
 * This script simulates the chat flow of the Willi Mako application,
 * specifically focusing on analyzing issues with the CS30 collection.
 * It captures all reasoning /**
 * Generate embeddings for text using Gemini
 */
async function generateEmbedding(text) {
  logStep('EMBEDDING_GENERATION_START', { text });
  
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

    const generationResult = await model.generateContent(prompt);
    const result = await generationResult.response;
    const answer = result.text().trim();
    
    logStep('HYDE_GENERATION_COMPLETE', { answer });
    
    return answer;
  } catch (error) {
    logStep('HYDE_GENERATION_ERROR', { error: error.message });
    // Fallback to original query
    return query;
  }
}d responses in a debug.json file.
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
    searchScores: [],
    payloadStructure: {},
    contextUsed: ''
  },
  response: {
    final: '',
    withoutCs30: '',
    onlyCs30: ''
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
 * Generates embeddings for a query using Gemini
 */
async function generateEmbedding(text) {
  logStep('EMBEDDING_GENERATION_START', { text: text.substring(0, 100) + '...' });
  
  try {
    const embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' });
    const result = await embeddingModel.embedContent(text);
    const embedding = result.embedding.values;
    
    logStep('EMBEDDING_GENERATION_COMPLETE', { dimensions: embedding.length });
    
    return embedding;
  } catch (error) {
    logStep('EMBEDDING_GENERATION_ERROR', { error: error.message });
    throw error;
  }
}

/**
 * Searches the CS30 collection for relevant documents
 */
async function searchCs30(query, limit = 5, scoreThreshold = 0.60) {
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
  
  logStep('CS30_SEARCH_START', { 
    originalQuery: query,
    searchQuery,
    limit, 
    scoreThreshold,
    usingExpansion: EXPAND_QUERY
  });
  
  const startTime = Date.now();
  
  try {
    const queryVector = await generateEmbedding(searchQuery);
    
    const searchResults = await qdrantClient.search(CS30_COLLECTION_NAME, {
      vector: queryVector,
      limit: limit,
      score_threshold: scoreThreshold,
      with_payload: true
    });
    
    const endTime = Date.now();
    debugData.metrics.cs30SearchTime = endTime - startTime;
    
    logStep('CS30_SEARCH_COMPLETE', { 
      resultsCount: searchResults.length,
      timeMs: debugData.metrics.cs30SearchTime
    });
    
    // Log more details if we have results
    if (searchResults.length > 0) {
      const topResultDetails = {
        id: searchResults[0].id,
        score: searchResults[0].score,
        payloadKeys: Object.keys(searchResults[0].payload || {})
      };
      
      if (VERBOSE) {
        topResultDetails.payload = searchResults[0].payload;
      } else {
        topResultDetails.title = searchResults[0].payload?.title || searchResults[0].payload?.name || 'No title';
        topResultDetails.contentPreview = truncateString(searchResults[0].payload?.content || searchResults[0].payload?.text || '', 100);
      }
      
      logStep('CS30_TOP_RESULT', topResultDetails);
    }
    
    debugData.cs30.searchResults = searchResults.map(result => ({
      id: result.id,
      score: result.score,
      payload: VERBOSE ? result.payload : {
        title: result.payload?.title || result.payload?.name || 'No title',
        contentPreview: truncateString(result.payload?.content || result.payload?.text || '', 200),
        source: result.payload?.source || 'Unknown',
        type: result.payload?.type || 'Unknown'
      }
    }));
    
    debugData.cs30.searchScores = searchResults.map(r => r.score);
    
    return searchResults;
  } catch (error) {
    logStep('CS30_SEARCH_ERROR', { error: error.message });
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
    const chat = model.startChat({
      generationConfig: { temperature: 0.2 }
    });
    
    const expansionPrompt = `Als Assistent für die Energiewirtschaft und speziell für die Schleupen CS/30 Software, 
erweitere die folgende Suchanfrage mit relevanten Fachbegriffen, ohne die Bedeutung zu verändern.
Füge Schleupen-spezifische Menüpfade, Modulnamen und typische Arbeitsprozesse hinzu, die für diese Anfrage relevant sein könnten.
Formuliere keine neue Frage, sondern gib nur die erweiterte Suchanfrage zurück (maximal 200 Zeichen).

Originalanfrage: "${query}"`;

    const result = await chat.sendMessage(expansionPrompt);
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
 * Extracts context from CS30 search results
 */
function extractCs30Context(searchResults) {
  logStep('CS30_CONTEXT_EXTRACTION_START', { resultsCount: searchResults.length });
  
  const context = searchResults.map(result => {
    return result.payload?.content || result.payload?.text || '';
  }).join('\n\n');
  
  debugData.cs30.contextUsed = context;
  
  logStep('CS30_CONTEXT_EXTRACTION_COMPLETE', { 
    contextLength: context.length,
    contextPreview: context.substring(0, 200) + '...'
  });
  
  return context;
}

/**
 * Generates a response using Gemini with the provided context
 */
async function generateResponse(userQuery, context = '', isCs30Response = false) {
  const responseType = isCs30Response ? 'CS30_RESPONSE_GENERATION' : 'STANDARD_RESPONSE_GENERATION';
  logStep(`${responseType}_START`, { 
    contextLength: context.length,
    isCs30Response
  });
  
  const startTime = Date.now();

  // Enhanced system prompt with more specific instructions for CS30
  const systemPrompt = isCs30Response 
    ? `Du bist Willi, ein Experte für die Schleupen CS/30 Software für die Energiewirtschaft. Du hilfst Nutzern bei Fragen zur Bedienung und zu Features der Software.
       Basiere deine Antworten auf dem folgenden Schleupen CS/30 Kontext. Wenn der Kontext keine klare Antwort bietet, erkläre, wo in der Software der Nutzer die Funktion finden kann.
       Sei präzise und nenne konkrete Menüpfade, Eingabefelder und Aktionen.`
    : `Du bist Willi, ein freundlicher und hilfreicher Assistent für die Energiewirtschaft. Du hilfst Nutzern bei allgemeinen Fragen.`;
  
  try {
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: 'Wer bist du?' }] },
        { role: 'model', parts: [{ text: 'Ich bin Willi, ein Assistent für die Energiewirtschaft und die Marktkommunikation.' }] }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    });

    // Create message with context instructions
    let message = userQuery;
    if (context) {
      message = `${systemPrompt}\n\nKONTEXT:\n${context}\n\nFRAGE: ${userQuery}\n\nGib eine detaillierte und hilfreiche Antwort.`;
    }

    const result = await chat.sendMessage(message);
    const response = result.response.text();
    
    const endTime = Date.now();
    if (isCs30Response) {
      debugData.metrics.cs30GenerationTime = endTime - startTime;
    }
    
    logStep(`${responseType}_COMPLETE`, { 
      timeMs: endTime - startTime,
      responsePreview: response.substring(0, 200) + '...'
    });
    
    return response;
  } catch (error) {
    logStep(`${responseType}_ERROR`, { error: error.message });
    return `Fehler bei der Generierung der Antwort: ${error.message}`;
  }
}

/**
 * Main debug flow simulation
 */
async function simulateChatFlow(userQuery) {
  const startTime = Date.now();
  
  debugData.query = userQuery;
  logStep('FLOW_START', { query: userQuery });
  
  // 1. Check CS30 availability
  const isCs30Available = await checkCs30Availability();
  
  // 2. Generate standard response (without CS30 context)
  const standardResponse = await generateResponse(userQuery);
  debugData.response.withoutCs30 = standardResponse;
  
  // 3. If CS30 is available, try generating a CS30-specific response
  if (isCs30Available) {
    // 3.1. Search CS30 collection
    const cs30Results = await searchCs30(userQuery);
    
    if (cs30Results.length > 0) {
      // 3.2. Extract context from CS30 results
      const cs30Context = extractCs30Context(cs30Results);
      
      // 3.3. Generate CS30-specific response
      const cs30Response = await generateResponse(userQuery, cs30Context, true);
      debugData.response.onlyCs30 = cs30Response;
      
      // 3.4. Combine responses - this is a simple concatenation for debugging
      // In the real app, this would be determined by UI settings
      debugData.response.final = `STANDARD RESPONSE:\n${standardResponse}\n\nCS30 RESPONSE:\n${cs30Response}`;
      
      // Add comparison analysis
      const responseAnalysis = await compareResponses(standardResponse, cs30Response, userQuery);
      debugData.response.analysis = responseAnalysis;
    } else {
      logStep('CS30_NO_RELEVANT_RESULTS', 'No relevant CS30 results found');
      debugData.response.final = standardResponse;
      
      // Try with lower threshold as a fallback if we didn't already
      if (!LOWER_THRESHOLD) {
        logStep('CS30_FALLBACK_SEARCH', 'Trying with lower threshold (0.3)');
        const fallbackResults = await searchCs30(userQuery, 5, 0.3);
        
        if (fallbackResults.length > 0) {
          logStep('CS30_FALLBACK_SEARCH_SUCCESS', 
            `Found ${fallbackResults.length} results with lower threshold`);
          
          debugData.cs30.fallbackResults = fallbackResults.map(result => ({
            id: result.id,
            score: result.score,
            payload: VERBOSE ? result.payload : {
              title: result.payload?.title || result.payload?.name || 'No title',
              contentPreview: truncateString(result.payload?.content || result.payload?.text || '', 200)
            }
          }));
          
          debugData.cs30.fallbackScores = fallbackResults.map(r => r.score);
        }
      }
    }
  } else {
    debugData.response.final = standardResponse;
  }
  
  const endTime = Date.now();
  debugData.metrics.totalProcessingTime = endTime - startTime;
  
  logStep('FLOW_COMPLETE', { 
    timeMs: debugData.metrics.totalProcessingTime,
    hasCs30Response: !!debugData.response.onlyCs30
  });
  
  return debugData;
}

/**
 * Analyzes and compares the standard and CS30 responses
 */
async function compareResponses(standardResponse, cs30Response, userQuery) {
  logStep('RESPONSE_COMPARISON_START', {
    standardLength: standardResponse.length,
    cs30Length: cs30Response.length
  });
  
  try {
    const chat = model.startChat({
      generationConfig: { temperature: 0.2 }
    });
    
    const analysisPrompt = `Analysiere diese zwei Antworten auf die Frage: "${userQuery}"

STANDARD ANTWORT:
${standardResponse}

CS30 ANTWORT:
${cs30Response}

Vergleiche die Antworten und bewerte:
1. Welche Antwort ist spezifischer und informativer für einen Mitarbeiter eines Energieversorgers?
2. Enthält die CS30-Antwort konkrete Informationen über Schleupen CS/30 Software, die in der Standard-Antwort fehlen?
3. Welche spezifischen Schleupen CS/30 Funktionen, Menüpfade oder Schritte werden genannt, falls vorhanden?
4. Ist die CS30-Antwort für die Frage relevant oder scheint sie unpassend?

Analysiere objektiv in maximal 300 Wörtern.`;

    const result = await chat.sendMessage(analysisPrompt);
    const analysis = result.response.text();
    
    logStep('RESPONSE_COMPARISON_COMPLETE', {
      analysisLength: analysis.length
    });
    
    return analysis;
  } catch (error) {
    logStep('RESPONSE_COMPARISON_ERROR', { error: error.message });
    return "Fehler bei der Vergleichsanalyse: " + error.message;
  }
}

/**
 * Saves debug data to a file
 */
function saveDebugData(data, filename = 'debug.json') {
  const debugDir = path.join(__dirname, 'debug-logs');
  
  // Create debug directory if it doesn't exist
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const fullPath = path.join(debugDir, `cs30-${timestamp}-${filename}`);
  
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
  console.log(`Debug data saved to ${fullPath}`);
  
  return fullPath;
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  // Filter out option flags from the query
  const optionFlags = ['--verbose', '-v', '--inspect-only', '--lower-threshold', '-l', 
                      '--expand-query', '-e', '--sample-points', '-s'];
  const queryArgs = args.filter(arg => !optionFlags.includes(arg));
  
  const defaultQuery = "Ich arbeite beim Lieferanten und muss den Einzug eines Kunden anlegen mit einem Sondertarif. Was muss ich machen?";
  
  let query = defaultQuery;
  if (queryArgs.length > 0) {
    query = queryArgs.join(' ');
  }
  
  console.log('==================================================');
  console.log('CS30 Chat Flow Debug Tool');
  console.log('==================================================');
  console.log(`Query: "${query}"`);
  
  if (VERBOSE) console.log('Mode: VERBOSE');
  if (INSPECT_ONLY) console.log('Mode: INSPECT_ONLY (only examining collection)');
  if (LOWER_THRESHOLD) console.log('Mode: LOWER_THRESHOLD (using 0.3 instead of 0.6)');
  if (EXPAND_QUERY) console.log('Mode: EXPAND_QUERY (using query expansion)');
  if (SAMPLE_POINTS) console.log('Mode: SAMPLE_POINTS (extracting sample points)');
  
  console.log('--------------------------------------------------');
  
  try {
    // If inspect-only mode, just get collection info and sample points
    if (INSPECT_ONLY) {
      const isCs30Available = await checkCs30Availability();
      
      if (isCs30Available) {
        console.log('\n==================================================');
        console.log('CS30 Collection Inspection:');
        console.log('==================================================');
        console.log('Collection exists and is available');
        
        if (debugData.cs30.collectionInfo.vectorCount) {
          console.log(`Vector count: ${debugData.cs30.collectionInfo.vectorCount}`);
          console.log(`Dimensions: ${debugData.cs30.collectionInfo.dimensions}`);
          console.log(`Distance metric: ${debugData.cs30.collectionInfo.distanceMetric}`);
        }
        
        if (debugData.cs30.samplePoints.length > 0) {
          console.log('\nSample Points:');
          debugData.cs30.samplePoints.forEach((point, i) => {
            console.log(`\nPoint ${i+1}:`);
            console.log(`  ID: ${point.id}`);
            console.log(`  Payload keys: ${point.payloadKeys.join(', ')}`);
            if (point.payload.title) console.log(`  Title: ${point.payload.title}`);
            if (point.payload.content_preview) console.log(`  Content: ${point.payload.content_preview}`);
            if (point.payload.source) console.log(`  Source: ${point.payload.source}`);
            if (point.payload.type) console.log(`  Type: ${point.payload.type}`);
          });
        }
        
        if (Object.keys(debugData.cs30.payloadStructure).length > 0) {
          console.log('\nPayload Structure:');
          for (const [key, details] of Object.entries(debugData.cs30.payloadStructure)) {
            console.log(`  ${key}: ${details.type}${details.length ? ` (length: ${details.length})` : ''}`);
            if (details.sample) console.log(`    Sample: ${details.sample}`);
          }
        }
        
        // Save debug data even in inspect-only mode
        saveDebugData(debugData, 'inspection.json');
      } else {
        console.log('CS30 collection is not available');
      }
      
      return;
    }
    
    // Normal flow simulation
    const result = await simulateChatFlow(query);
    const outputPath = saveDebugData(result);
    
    console.log('\n==================================================');
    console.log('Debug Summary:');
    console.log('==================================================');
    console.log(`- Total processing time: ${result.metrics.totalProcessingTime}ms`);
    console.log(`- CS30 available: ${result.cs30.isAvailable}`);
    console.log(`- CS30 search results: ${result.cs30.searchResults.length}`);
    
    if (result.cs30.searchResults.length > 0) {
      console.log(`- Top CS30 result score: ${result.cs30.searchScores[0].toFixed(4)}`);
      console.log(`- All scores: ${result.cs30.searchScores.map(s => s.toFixed(4)).join(', ')}`);
    }
    
    if (EXPAND_QUERY && result.expandedQuery) {
      console.log(`- Original query: "${query}"`);
      console.log(`- Expanded query: "${result.expandedQuery}"`);
    }
    
    console.log(`- Debug data saved to: ${outputPath}`);
    console.log('==================================================');
    
  } catch (error) {
    console.error('Error during chat flow simulation:', error);
  }
}

/**
 * Shows help information
 */
function showHelp() {
  console.log(`
CS30 Chat Flow Debug Tool
=========================

Usage: node debug-cs30-chat-flow.js [options] [query]

Options:
  -h, --help            Show this help message
  -v, --verbose         Show detailed debug information
  --inspect-only        Only inspect the CS30 collection (no query processing)
  -l, --lower-threshold Use a lower score threshold (0.3 instead of 0.6)
  -e, --expand-query    Use query expansion to improve search results
  -s, --sample-points   Extract sample points from the CS30 collection

Examples:
  node debug-cs30-chat-flow.js
    Run with default query
    
  node debug-cs30-chat-flow.js -l -e "Wie lege ich einen Vertrag an?"
    Run with custom query, lower threshold and query expansion
    
  node debug-cs30-chat-flow.js --inspect-only -s
    Only inspect the CS30 collection and show sample points
`);
}

// Run the main function
main().catch(console.error);
