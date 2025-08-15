// CS30 Search Test
const { QdrantClient } = require('@qdrant/js-client-rest');
require('dotenv').config();

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const CS30_COLLECTION_NAME = process.env.CS30_COLLECTION || 'cs30';

async function testCs30Search() {
  console.log('🔍 CS30 Search Test');
  console.log('===================');
  
  const client = new QdrantClient({ 
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
    checkCompatibility: false
  });

  // For testing, we need to use a dummy embedding
  // In real implementation, this would come from geminiService.generateEmbedding()
  const testQueries = [
    'Schleupen System',
    'Vertrag beenden',
    'Marktlokation',
    'Abschlag ändern'
  ];

  try {
    for (const query of testQueries) {
      console.log(`\n🔍 Testing search for: "${query}"`);
      
      // For this test, we'll use a simple text search approach  
      // In production, this would use vector search with embeddings
      const searchResult = await client.search(CS30_COLLECTION_NAME, {
        vector: new Array(768).fill(0.1), // Correct 768 dimensions for cs30
        limit: 3,
        score_threshold: 0.1 // Very low threshold for testing
      });

      console.log(`   Found ${searchResult.length} results:`);
      searchResult.forEach((result, i) => {
        console.log(`   ${i + 1}. Score: ${result.score.toFixed(4)}`);
        console.log(`      Source: ${result.payload?.source || 'N/A'}`);
        console.log(`      Type: ${result.payload?.type || 'N/A'}`);
        console.log(`      Content: ${(result.payload?.content || '').substring(0, 100)}...`);
      });
      
      break; // Only test first query
    }

  } catch (error) {
    console.error('❌ Error testing CS30 search:', error);
  }
}

testCs30Search().catch(console.error);
