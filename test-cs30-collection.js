// CS30 Test Script
// Testet die cs30-Funktionalität ohne Frontend

const { QdrantClient } = require('@qdrant/js-client-rest');
require('dotenv').config();

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const CS30_COLLECTION_NAME = process.env.CS30_COLLECTION || 'cs30';

async function testCs30Collection() {
  console.log('🧪 CS30 Collection Test');
  console.log('========================');
  
  const client = new QdrantClient({ 
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
    checkCompatibility: false
  });

  try {
    // 1. Check if cs30 collection exists
    const collections = await client.getCollections();
    const hasCs30 = collections.collections.some(c => c.name === CS30_COLLECTION_NAME);
    
    console.log(`✅ CS30 Collection '${CS30_COLLECTION_NAME}' exists: ${hasCs30}`);
    
    if (!hasCs30) {
      console.log('❌ CS30 collection not found. Available collections:');
      collections.collections.forEach(c => console.log(`   - ${c.name}`));
      return;
    }

    // 2. Get collection info
    const collectionInfo = await client.getCollection(CS30_COLLECTION_NAME);
    console.log(`📊 CS30 Collection stats:`);
    console.log(`   - Vectors: ${collectionInfo.vectors_count || 0}`);
    console.log(`   - Points: ${collectionInfo.points_count || 0}`);

    // 3. Test search with various queries
    const testQueries = [
      'Schleupen System',
      'cs30',
      'Energieversorgung',
      'Marktpartner',
      'Netznutzungsabrechnung'
    ];

    for (const query of testQueries) {
      console.log(`\n🔍 Testing query: "${query}"`);
      
      // Get some random points first to see structure
      const scrollResult = await client.scroll(CS30_COLLECTION_NAME, {
        limit: 2,
        with_payload: true,
        with_vector: false
      });
      
      if (scrollResult.points && scrollResult.points.length > 0) {
        console.log(`   Found ${scrollResult.points.length} sample points:`);
        scrollResult.points.forEach((point, i) => {
          console.log(`   ${i + 1}. ID: ${point.id}`);
          console.log(`      Text sample: ${JSON.stringify(point.payload?.text || '').substring(0, 100)}...`);
          console.log(`      Score: N/A (scroll result)`);
        });
      }
      
      break; // Only test first query for structure
    }

  } catch (error) {
    console.error('❌ Error testing CS30 collection:', error);
  }
}

testCs30Collection().catch(console.error);
