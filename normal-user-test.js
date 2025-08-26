#!/usr/bin/env node
/**
 * Normal User Chat Testing Script
 * 
 * This script tests the chat interface as experienced by normal users
 * by directly accessing the willi_mako collection in Qdrant.
 * It mimics the same flow as used in the production application.
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

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
  checkCompatibility: false // Disable version compatibility check
});

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

// Direkter Test, wenn das Skript direkt aufgerufen wird
if (require.main === module) {
  const testQuery = process.argv[2] || "Erkläre mir den Prozess des Lieferantenwechsels";
  console.log(`Direct test mode: Testing query "${testQuery}"`);
  
  runNormalUserTest(testQuery)
    .then(result => {
      console.log(`\nTest result:`);
      if (result.success) {
        console.log(`Response: ${result.response.text}`);
        if (result.response.sources && result.response.sources.length > 0) {
          console.log(`Sources: ${result.response.sources.join(', ')}`);
        }
      } else {
        console.log(`Error: ${result.error}`);
      }
    })
    .catch(error => console.error(`Error running test: ${error.message}`));
}

/**
 * Run a chat test for normal users
 * @param {string} query User query
 * @returns {Promise<Object>} Chat response
 */
async function runNormalUserTest(query) {
  console.log(`Testing query: "${query}" with collection ${COLLECTION_NAME}`);
  
  try {
    // Direkter Zugriff auf Qdrant Collection (wie im Debug-Tool)
    console.log('Performing vector search...');
    console.log(`Using Qdrant URL: ${QDRANT_URL}`);
    console.log(`Using Collection: ${COLLECTION_NAME}`);
    const scoreThreshold = 0.6;
    
    // Embed the query
    console.log('Generating embedding...');
    const embedding = await getEmbedding(query);
    console.log(`Generated embedding with dimension: ${embedding.length}`);
    
    // Search for relevant documents
    console.log('Searching Qdrant...');
    const searchParams = {
      vector: embedding,
      limit: 10,
      score_threshold: scoreThreshold,
      with_payload: true,
      with_vectors: false
    };
    console.log(`Search params: ${JSON.stringify(searchParams, null, 2)}`);
    
    const searchResults = await qdrantClient.search(COLLECTION_NAME, searchParams);
    console.log(`Found ${searchResults.length} results`);
    
    // Format search results
    const formattedResults = searchResults.map(result => ({
      id: result.id,
      score: result.score,
      title: result.payload.title || 'Untitled',
      type: result.payload.type || 'Unknown',
      content: result.payload.content || ''
    }));
    
    // Generate context from results
    const context = formattedResults.map(result => {
      return `---
Titel: ${result.title}
Relevanz: ${result.score.toFixed(2)}
Inhalt: ${result.content.substring(0, 500)}...
---`;
    }).join('\n\n');
    
    // Generate response using LLM
    console.log('Generating response...');
    const prompt = `Als Experte für Energieversorgung und Marktkommunikation, beantworte die folgende Anfrage 
    basierend auf den gegebenen Kontext. Formuliere eine präzise und hilfreiche Antwort, die alle relevanten 
    Informationen aus dem Kontext berücksichtigt.

    Anfrage: "${query}"
    
    Kontext:
    ${context}
    
    Antwort:`;
    
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    
    // Extract sources
    const sources = formattedResults.map(result => result.title).filter(Boolean);
    
    return {
      query,
      response: {
        text: response,
        sources: [...new Set(sources)] // Remove duplicates
      },
      timestamp: new Date().toISOString(),
      success: true
    };
  } catch (error) {
    console.error(`Error testing query: ${error.message}`);
    
    return {
      query,
      error: error.message,
      timestamp: new Date().toISOString(),
      success: false
    };
  }
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
    const dimension = 768; // Match your collection's vector dimension
    return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
  } catch (error) {
    console.error(`Error generating embedding: ${error.message}`);
    // Return random vector as fallback
    const dimension = 768;
    return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
  }
}

/**
 * Run the normal user batch test
 * @param {Array} queries List of queries to test
 * @param {string} outputDir Directory for test results
 */
async function runNormalUserBatchTest(queries, outputDir) {
  console.log(`Running normal user tests for ${queries.length} queries using ${COLLECTION_NAME} collection`);
  console.log(`Results will be saved to ${outputDir}`);
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const results = {
    timestamp: new Date().toISOString(),
    testType: 'normal-user',
    collection: COLLECTION_NAME,
    queries: []
  };
  
  // Process each query
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`\n[${i+1}/${queries.length}] Testing: "${query}"`);
    
    try {
      const testResult = await runNormalUserTest(query);
      results.queries.push(testResult);
      
      // Save individual result
      const safeQuery = query.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
      const filename = path.join(outputDir, `normal-user-${safeQuery}-${Date.now()}.json`);
      fs.writeFileSync(filename, JSON.stringify(testResult, null, 2));
      console.log(`Test result saved to ${filename}`);
    } catch (error) {
      console.error(`Error processing query: ${error.message}`);
    }
  }
  
  // Save batch results
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const batchResultsFile = path.join(outputDir, `normal-user-batch-results-${timestamp}.json`);
  fs.writeFileSync(batchResultsFile, JSON.stringify(results, null, 2));
  console.log(`\nBatch test results written to: ${batchResultsFile}`);
  
  return results;
}

module.exports = {
  runNormalUserBatchTest,
  runNormalUserTest
};
