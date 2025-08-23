#!/usr/bin/env node
/**
 * Willi Mako Chat Flow Debug Script
 * 
 * This script simulates the chat flow of the Willi Mako application,
 * specifically focusing on analyzing the regular user experience with the willi_mako collection.
 * It captures all reasoning steps, contexts, and responses in a debug.json file.
 * 
 * Based on the CS30 debug script, adapted for the willi_mako collection.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuration
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'willi_mako';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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
  collection: COLLECTION_NAME,
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
    compareMethods: COMPARE_METHODS,
    showQuery: SHOW_QUERY
  },
  vectorSearch: {
    standardResults: [],
    optimizedResults: [],
    hydeResults: []
  },
  responseGeneration: {
    context: '',
    response: '',
    sources: []
  },
  timings: {
    start: Date.now(),
    queryExpansion: 0,
    hydeGeneration: 0,
    vectorSearch: 0,
    responseGeneration: 0,
    total: 0
  }
};

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
  checkCompatibility: false // Disable version compatibility check
});

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

/**
 * Main function to process a query and generate a response
 */
async function processQuery(query) {
  console.log(`Processing query: "${query}"`);
  console.log(`Using Qdrant URL: ${QDRANT_URL}`);
  console.log(`Using Collection: ${COLLECTION_NAME}`);
  debugData.query = query;
  
  // Get the query
  const rawQuery = process.argv.slice(2).find(arg => !arg.startsWith('-'));
  debugData.query = rawQuery || query;
  
  try {
    // 1. Collect collection information if requested
    if (INSPECT_ONLY || SAMPLE_POINTS) {
      await inspectCollection();
      if (INSPECT_ONLY) {
        saveDebugData();
        return;
      }
    }
    
    // 2. Query expansion
    if (EXPAND_QUERY) {
      console.log('Performing query expansion...');
      const startQueryExpansion = Date.now();
      const expandedQuery = await expandQuery(query);
      debugData.expandedQuery = expandedQuery;
      debugData.timings.queryExpansion = Date.now() - startQueryExpansion;
      console.log(`Expanded query: "${expandedQuery}"`);
    }
    
    // 3. HyDE (Hypothetical Document Embeddings)
    if (USE_HYDE) {
      console.log('Generating hypothetical answer (HyDE)...');
      const startHyde = Date.now();
      const hypotheticalAnswer = await generateHypotheticalAnswer(query);
      debugData.hypotheticalAnswer = hypotheticalAnswer;
      debugData.timings.hydeGeneration = Date.now() - startHyde;
      console.log(`Generated hypothetical answer.`);
      if (VERBOSE) {
        console.log(`Hypothetical answer: "${hypotheticalAnswer}"`);
      }
    }
    
    // 4. Vector search
    console.log('Performing vector search...');
    const startVectorSearch = Date.now();
    await performVectorSearch(query);
    debugData.timings.vectorSearch = Date.now() - startVectorSearch;
    
    // 5. Generate response
    console.log('Generating response...');
    const startResponseGeneration = Date.now();
    await generateResponse(query);
    debugData.timings.responseGeneration = Date.now() - startResponseGeneration;
    
    // 6. Complete
    debugData.timings.total = Date.now() - debugData.timings.start;
    console.log(`\nResponse generated in ${debugData.timings.total}ms`);
    console.log(`\n${debugData.responseGeneration.response}`);
    
    // 7. Save debug data
    saveDebugData();
    
  } catch (error) {
    console.error(`Error processing query: ${error.message}`);
    debugData.error = error.message;
    saveDebugData();
  }
}

/**
 * Inspect the collection and get sample points
 */
async function inspectCollection() {
  console.log(`Inspecting collection "${COLLECTION_NAME}"...`);
  
  try {
    // Get collection info
    const collectionInfo = await qdrantClient.getCollection(COLLECTION_NAME);
    debugData.collectionInfo = collectionInfo;
    console.log(`Collection size: ${collectionInfo.points_count} points`);
    console.log(`Vector dimension: ${collectionInfo.config.params.vectors.size}`);
    
    // Get sample points if requested
    if (SAMPLE_POINTS) {
      console.log('Retrieving sample points...');
      const samplePoints = await qdrantClient.scroll(COLLECTION_NAME, {
        limit: 5,
        with_payload: true,
        with_vectors: false
      });
      
      debugData.samplePoints = samplePoints.points;
      
      console.log(`Retrieved ${samplePoints.points.length} sample points:`);
      for (const point of samplePoints.points) {
        console.log(`- ID: ${point.id}`);
        console.log(`  Title: ${point.payload.title || 'N/A'}`);
        console.log(`  Type: ${point.payload.type || 'N/A'}`);
        console.log(`  Content (preview): ${(point.payload.content || '').substring(0, 100)}...`);
        console.log('');
      }
    }
  } catch (error) {
    console.error(`Error inspecting collection: ${error.message}`);
    debugData.collectionError = error.message;
  }
}

/**
 * Expand the query to improve search results
 */
async function expandQuery(query) {
  try {
    const prompt = `Als Experte für Energieversorgung und Marktkommunikation, erweitere die folgende Anfrage, 
    um relevante Facetten und Synonyme einzubeziehen. Die erweiterte Anfrage soll für eine Vektorsuche 
    optimiert sein und alle wichtigen Aspekte abdecken.
    
    Originale Anfrage: "${query}"
    
    Erweiterte Anfrage:`;
    
    const result = await model.generateContent(prompt);
    const expandedQuery = result.response.text().trim();
    return expandedQuery;
  } catch (error) {
    console.error(`Error expanding query: ${error.message}`);
    return query; // Return original query on error
  }
}

/**
 * Generate a hypothetical answer for HyDE approach
 */
async function generateHypotheticalAnswer(query) {
  try {
    const prompt = `Als Experte für Energieversorgung und Marktkommunikation, erstelle eine 
    fachlich präzise Antwort auf die folgende Anfrage. Die Antwort soll alle relevanten 
    Aspekte der Frage abdecken und fachspezifische Terminologie verwenden.
    
    Anfrage: "${query}"
    
    Hypothetische Antwort:`;
    
    const result = await model.generateContent(prompt);
    const hypotheticalAnswer = result.response.text().trim();
    return hypotheticalAnswer;
  } catch (error) {
    console.error(`Error generating hypothetical answer: ${error.message}`);
    return ''; // Return empty string on error
  }
}

/**
 * Perform vector search with different approaches
 */
async function performVectorSearch(query) {
  try {
    const scoreThreshold = LOWER_THRESHOLD ? 0.3 : 0.6;
    console.log(`Using score threshold: ${scoreThreshold}`);
    
    // 1. Standard search
    console.log('Performing standard vector search...');
    const standardResults = await qdrantClient.search(COLLECTION_NAME, {
      vector: await getEmbedding(query),
      limit: 10,
      score_threshold: scoreThreshold,
      with_payload: true,
      with_vectors: false
    });
    
    debugData.vectorSearch.standardResults = standardResults.map(formatSearchResult);
    console.log(`Found ${standardResults.length} standard results.`);
    
    // 2. Optimized search (if not disabled)
    if (!DISABLE_OPTIMIZATIONS) {
      console.log('Performing optimized vector search...');
      
      // Apply filters if not disabled
      const filter = !DISABLE_FILTERS ? buildIntelligentFilter(query) : {};
      
      const optimizedResults = await qdrantClient.search(COLLECTION_NAME, {
        vector: await getEmbedding(query),
        limit: 10,
        score_threshold: scoreThreshold,
        with_payload: true,
        with_vectors: false,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });
      
      debugData.vectorSearch.optimizedResults = optimizedResults.map(formatSearchResult);
      console.log(`Found ${optimizedResults.length} optimized results.`);
    }
    
    // 3. HyDE search (if enabled)
    if (USE_HYDE && debugData.hypotheticalAnswer) {
      console.log('Performing HyDE vector search...');
      const hydeResults = await qdrantClient.search(COLLECTION_NAME, {
        vector: await getEmbedding(debugData.hypotheticalAnswer),
        limit: 10,
        score_threshold: scoreThreshold,
        with_payload: true,
        with_vectors: false
      });
      
      debugData.vectorSearch.hydeResults = hydeResults.map(formatSearchResult);
      console.log(`Found ${hydeResults.length} HyDE results.`);
    }
    
  } catch (error) {
    console.error(`Error performing vector search: ${error.message}`);
    debugData.vectorSearch.error = error.message;
  }
}

/**
 * Build intelligent filter based on query analysis
 */
function buildIntelligentFilter(query) {
  const filter = {};
  const lowerQuery = query.toLowerCase();
  
  // Simple keyword-based filtering logic
  if (lowerQuery.includes('vertrag') || lowerQuery.includes('kunde')) {
    filter.must = [
      {
        key: 'type',
        match: {
          value: 'vertrag'
        }
      }
    ];
  } else if (lowerQuery.includes('marktkommunikation') || lowerQuery.includes('prozess') || 
             lowerQuery.includes('lieferant') || lowerQuery.includes('wechsel')) {
    filter.must = [
      {
        key: 'type',
        match: {
          value: 'marktkommunikation'
        }
      }
    ];
  } else if (lowerQuery.includes('zähler') || lowerQuery.includes('messung')) {
    filter.must = [
      {
        key: 'type',
        match: {
          value: 'messung'
        }
      }
    ];
  }
  
  return filter;
}

/**
 * Format search result for debugging
 */
function formatSearchResult(result) {
  return {
    id: result.id,
    score: result.score,
    title: result.payload.title || 'Untitled',
    type: result.payload.type || 'Unknown',
    contentPreview: (result.payload.content || '').substring(0, 200) + '...'
  };
}

/**
 * Generate embedding for a text
 */
async function getEmbedding(text) {
  try {
    const embeddingPrompt = `Erzeuge ein Embedding für folgenden Text für die Vektorsuche in Energiemarktkommunikation:
    "${text}"`;
    
    const embeddingGeneration = await model.generateContent([
      embeddingPrompt,
      "Gib mir jetzt das Embedding als Vektor zurück."
    ]);
    
    // This is a simplified embedding approach - in production, you'd use a proper embedding API
    // For simulation purposes, we're creating a random vector
    const dimension = 1536; // Match your collection's vector dimension
    return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
  } catch (error) {
    console.error(`Error generating embedding: ${error.message}`);
    // Return random vector as fallback
    const dimension = 1536;
    return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
  }
}

/**
 * Generate the final response based on search results
 */
async function generateResponse(query) {
  try {
    // Select the search results to use
    let selectedResults = [];
    if (USE_HYDE && debugData.vectorSearch.hydeResults.length > 0) {
      selectedResults = debugData.vectorSearch.hydeResults;
    } else if (!DISABLE_OPTIMIZATIONS && debugData.vectorSearch.optimizedResults.length > 0) {
      selectedResults = debugData.vectorSearch.optimizedResults;
    } else {
      selectedResults = debugData.vectorSearch.standardResults;
    }
    
    // Extract content from results
    const context = selectedResults.map(result => {
      return `---
Titel: ${result.title}
Relevanz: ${result.score.toFixed(2)}
Inhalt: ${result.contentPreview}
---`;
    }).join('\n\n');
    
    debugData.responseGeneration.context = context;
    
    // Generate response
    const prompt = `Als Experte für Energieversorgung und Marktkommunikation, beantworte die folgende Anfrage 
    basierend auf den gegebenen Kontext. Formuliere eine präzise und hilfreiche Antwort, die alle relevanten 
    Informationen aus dem Kontext berücksichtigt.

    Anfrage: "${query}"
    
    Kontext:
    ${context}
    
    Antwort:`;
    
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    debugData.responseGeneration.response = response;
    
    // Extract sources
    const sources = selectedResults.map(result => result.title).filter(Boolean);
    debugData.responseGeneration.sources = [...new Set(sources)]; // Remove duplicates
    
  } catch (error) {
    console.error(`Error generating response: ${error.message}`);
    debugData.responseGeneration.error = error.message;
    debugData.responseGeneration.response = `Entschuldigung, ich konnte keine Antwort generieren. Fehler: ${error.message}`;
  }
}

/**
 * Save debug data to file
 */
function saveDebugData() {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const safeQuery = (debugData.query || 'inspect')
    .replace(/[^a-z0-9]/gi, '_')
    .substring(0, 30);
  
  const filename = `debug-logs/willi-mako-${safeQuery}-${timestamp}.json`;
  
  // Create debug-logs directory if it doesn't exist
  if (!fs.existsSync('debug-logs')) {
    fs.mkdirSync('debug-logs', { recursive: true });
  }
  
  fs.writeFileSync(filename, JSON.stringify(debugData, null, 2));
  console.log(`Debug data written to ${filename}`);
}

/**
 * Main function
 */
async function main() {
  const query = process.argv.slice(2).find(arg => !arg.startsWith('-')) || 
                'Erkläre mir den Prozess des Lieferantenwechsels';
  
  await processQuery(query);
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
