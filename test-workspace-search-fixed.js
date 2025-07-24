const { QdrantService } = require('./src/services/qdrant');
const { WorkspaceService } = require('./src/services/workspaceService');
require('dotenv').config();

async function testWorkspaceSearch() {
  console.log('🔍 Testing Workspace Search with Qdrant Integration');
  console.log('======================================================');
  
  const userId = '3a851622-0858-4eb0-b1ea-13c354c87bbe'; // From the DB query above
  const query = 'STROMDAO Dienstleistung';
  
  console.log(`\n📋 Testing search for user: ${userId}`);
  console.log(`🔎 Query: "${query}"`);
  
  try {
    // Test WorkspaceService search
    console.log('\n1. Testing WorkspaceService.searchWorkspaceContent:');
    const workspaceService = new WorkspaceService();
    const searchResults = await workspaceService.searchWorkspaceContent(userId, query, 'documents', 5);
    
    console.log(`   Found ${searchResults.length} results:`);
    searchResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.title} (score: ${result.score})`);
      console.log(`      Type: ${result.type}`);
      console.log(`      Content: ${result.content?.substring(0, 150)}...`);
      console.log(`      Created: ${result.metadata?.created_at}`);
    });
    
    // Test direct Qdrant search
    console.log('\n2. Testing direct QdrantService.search:');
    const qdrantService = new QdrantService();
    const qdrantResults = await qdrantService.search(userId, query, 5);
    
    console.log(`   Found ${qdrantResults.length} Qdrant results:`);
    qdrantResults.forEach((result, index) => {
      console.log(`   ${index + 1}. Score: ${result.score}`);
      console.log(`      Document ID: ${result.payload?.document_id}`);
      console.log(`      User ID: ${result.payload?.user_id}`);
      console.log(`      Title: ${result.payload?.title}`);
      console.log(`      Text: ${result.payload?.text?.substring(0, 150)}...`);
    });
    
    // Test with different query
    console.log('\n3. Testing with broader query:');
    const broadQuery = 'Rechnung';
    const broadResults = await workspaceService.searchWorkspaceContent(userId, broadQuery, 'documents', 3);
    
    console.log(`   Found ${broadResults.length} results for "${broadQuery}":`);
    broadResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.title} (score: ${result.score})`);
      console.log(`      Content: ${result.content?.substring(0, 100)}...`);
    });
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testWorkspaceSearch().catch(console.error);
