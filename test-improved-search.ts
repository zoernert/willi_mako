import { WorkspaceService } from './src/services/workspaceService';
import dotenv from 'dotenv';

dotenv.config();

async function testImprovedWorkspaceSearch() {
  console.log('🔍 Testing Improved Workspace Search');
  console.log('=====================================');
  
  const userId = '3a851622-0858-4eb0-b1ea-13c354c87bbe';
  const query = 'STROMDAO Dienstleistung';
  
  console.log(`\n📋 Testing search for user: ${userId}`);
  console.log(`🔎 Query: "${query}"`);
  
  try {
    const workspaceService = new WorkspaceService();
    const searchResults = await workspaceService.searchWorkspaceContent(userId, query, 'documents', 5);
    
    console.log(`\n✅ Found ${searchResults.length} results:`);
    searchResults.forEach((result, index) => {
      console.log(`\n${index + 1}. Title: ${result.title}`);
      console.log(`   Score: ${result.score}`);
      console.log(`   Type: ${result.type}`);
      console.log(`   Content: ${result.content?.substring(0, 300)}...`);
      console.log(`   Created: ${result.metadata?.created_at}`);
    });
    
    // Test with a different query that should match the document content
    console.log('\n\n🔎 Testing with specific content query:');
    const specificQuery = 'Bestätigung Dienstleistungserbringung';
    const specificResults = await workspaceService.searchWorkspaceContent(userId, specificQuery, 'documents', 3);
    
    console.log(`Found ${specificResults.length} results for "${specificQuery}":`);
    specificResults.forEach((result, index) => {
      console.log(`\n${index + 1}. Title: ${result.title}`);
      console.log(`   Score: ${result.score}`);
      console.log(`   Content: ${result.content?.substring(0, 200)}...`);
    });
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testImprovedWorkspaceSearch().catch(console.error);
