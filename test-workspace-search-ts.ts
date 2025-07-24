import { QdrantService } from './src/services/qdrant';
import { WorkspaceService } from './src/services/workspaceService';
import dotenv from 'dotenv';

dotenv.config();

async function testWorkspaceSearch() {
  console.log('🔍 Testing Workspace Search with Qdrant Integration');
  console.log('======================================================');
  
  const userId = '3a851622-0858-4eb0-b1ea-13c354c87bbe'; // From the DB query above
  const query = 'STROMDAO Dienstleistung';
  
  console.log(`\n📋 Testing search for user: ${userId}`);
  console.log(`🔎 Query: "${query}"`);
  
  try {
    // Test direct Qdrant search first
    console.log('\n1. Testing direct QdrantService.search:');
    const qdrantService = new QdrantService();
    const qdrantResults = await qdrantService.search(userId, query, 5);
    
    console.log(`   Found ${qdrantResults.length} Qdrant results:`);
    qdrantResults.forEach((result, index) => {
      console.log(`   ${index + 1}. Score: ${result.score}`);
      console.log(`      Document ID: ${result.payload?.document_id}`);
      console.log(`      User ID: ${result.payload?.user_id}`);
      console.log(`      Title: ${result.payload?.title || 'No title'}`);
      console.log(`      Text: ${String(result.payload?.text).substring(0, 150) || 'No text'}...`);
    });
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testWorkspaceSearch().catch(console.error);
