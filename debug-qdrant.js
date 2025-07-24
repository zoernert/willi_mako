const { QdrantClient } = require('@qdrant/js-client-rest');
require('dotenv').config();

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'ewilli';

async function debugQdrant() {
  console.log('🔍 Debug Qdrant Status');
  console.log('========================');
  console.log(`QDRANT_URL: ${QDRANT_URL}`);
  console.log(`QDRANT_COLLECTION: ${QDRANT_COLLECTION_NAME}`);
  
  const client = new QdrantClient({ 
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
    checkCompatibility: false
  });

  try {
    // 1. Test connection
    const collections = await client.getCollections();
    console.log(`\n✅ Qdrant connection successful`);
    console.log(`📚 Collections found: ${collections.collections.length}`);
    collections.collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // 2. Check our collection
    const hasOurCollection = collections.collections.some(c => c.name === QDRANT_COLLECTION_NAME);
    console.log(`\n📖 Our collection "${QDRANT_COLLECTION_NAME}" exists: ${hasOurCollection}`);

    if (hasOurCollection) {
      // 3. Get collection info
      const collectionInfo = await client.getCollection(QDRANT_COLLECTION_NAME);
      console.log(`   - Vector count: ${collectionInfo.vectors_count || 'unknown'}`);
      console.log(`   - Config:`, collectionInfo.config);

      // 4. Try to scroll some points
      console.log(`\n🔎 Sample points in collection:`);
      const scrollResult = await client.scroll(QDRANT_COLLECTION_NAME, {
        limit: 5,
        with_payload: true,
        with_vector: false
      });
      
      if (scrollResult.points && scrollResult.points.length > 0) {
        console.log(`   Found ${scrollResult.points.length} points:`);
        scrollResult.points.forEach((point, index) => {
          console.log(`   ${index + 1}. ID: ${point.id}`);
          if (point.payload) {
            console.log(`      Title: ${point.payload.title || 'No title'}`);
            console.log(`      User ID: ${point.payload.user_id || 'No user_id'}`);
            console.log(`      Text sample: ${(point.payload.text_content_sample || '').substring(0, 100)}...`);
          }
        });
      } else {
        console.log(`   ❌ No points found in collection!`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugQdrant().catch(console.error);
