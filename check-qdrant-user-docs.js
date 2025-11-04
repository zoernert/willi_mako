const { QdrantClient } = require('@qdrant/js-client-rest');
const { Pool } = require('pg');

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://10.0.0.2:6333',
});

const pool = new Pool({
  host: '10.0.0.2',
  port: 5117,
  database: 'willi_mako',
  user: 'willi_user',
  password: 'willi_password',
});

async function checkQdrantDocument() {
  try {
    const userId = '3a851622-0858-4eb0-b1ea-13c354c87bbe';
    const documentId = 'b98df8d2-03b9-429d-a695-24345ae521c0';
    
    console.log('Checking Qdrant for user documents...\n');
    
    // Search for the specific document
    const scrollResult = await qdrant.scroll('willi_mako', {
      filter: {
        must: [
          {
            key: 'user_id',
            match: { value: userId }
          },
          {
            key: 'is_user_document',
            match: { value: true }
          }
        ]
      },
      limit: 10,
      with_payload: true,
      with_vector: false
    });
    
    console.log(`Found ${scrollResult.points.length} user documents in Qdrant\n`);
    
    scrollResult.points.forEach((point, i) => {
      console.log(`--- Point ${i + 1} ---`);
      console.log('ID:', point.id);
      console.log('Payload:', JSON.stringify(point.payload, null, 2));
      console.log('');
    });
    
    // Check if our specific document is there
    const hasOurDoc = scrollResult.points.some(p => 
      p.payload.document_id === documentId || 
      p.payload.source_document_id === documentId ||
      p.id.toString().includes(documentId)
    );
    
    console.log(`\nSpecific document ${documentId} found:`, hasOurDoc);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkQdrantDocument();
