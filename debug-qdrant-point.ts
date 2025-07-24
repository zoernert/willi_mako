import { QdrantService } from './src/services/qdrant';
import dotenv from 'dotenv';

dotenv.config();

async function debugQdrantPoint() {
  console.log('🔍 Debug Specific Qdrant Point');
  console.log('================================');
  
  const documentId = '4c15b4f3-4964-4ef1-b67b-7fd585a3a0f6';
  
  try {
    const qdrantService = new QdrantService();
    const client = (qdrantService as any).client;
    const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'ewilli';
    
    console.log(`Looking for document ID: ${documentId}`);
    console.log(`In collection: ${QDRANT_COLLECTION}`);
    
    // Get the specific point
    const point = await client.retrieve(QDRANT_COLLECTION, {
      ids: [documentId],
      with_payload: true,
      with_vector: false
    });
    
    if (point.length > 0) {
      console.log('\n✅ Found document in Qdrant:');
      console.log('ID:', point[0].id);
      console.log('Payload:', JSON.stringify(point[0].payload, null, 2));
    } else {
      console.log('❌ Document not found in Qdrant');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugQdrantPoint().catch(console.error);
