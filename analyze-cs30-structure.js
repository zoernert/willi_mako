// CS30 Payload Structure Analysis
const { QdrantClient } = require('@qdrant/js-client-rest');
require('dotenv').config();

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const CS30_COLLECTION_NAME = process.env.CS30_COLLECTION || 'cs30';

async function analyzeCs30Structure() {
  console.log('🔍 CS30 Payload Structure Analysis');
  console.log('===================================');
  
  const client = new QdrantClient({ 
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
    checkCompatibility: false
  });

  try {
    // Get sample points
    const scrollResult = await client.scroll(CS30_COLLECTION_NAME, {
      limit: 5,
      with_payload: true,
      with_vector: false
    });

    if (scrollResult.points && scrollResult.points.length > 0) {
      console.log(`📊 Found ${scrollResult.points.length} sample points:\n`);
      
      scrollResult.points.forEach((point, i) => {
        console.log(`Point ${i + 1}:`);
        console.log(`  ID: ${point.id}`);
        console.log(`  Payload keys:`, Object.keys(point.payload || {}));
        console.log(`  Payload:`, JSON.stringify(point.payload, null, 2));
        console.log('  ---');
      });
    }

  } catch (error) {
    console.error('❌ Error analyzing CS30 structure:', error);
  }
}

analyzeCs30Structure().catch(console.error);
