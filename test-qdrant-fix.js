// test-qdrant-fix.js
// Run with: npx tsx test-qdrant-fix.js
import { QdrantService } from './src/services/qdrant';
import { QueryAnalysisService } from './src/services/queryAnalysisService';
import dotenv from 'dotenv';

dotenv.config();

async function testQdrantFilters() {
  console.log('Testing QDrant filter fixes...');
  
  // Create test filter with array values
  const analysisResult = {
    intentType: 'SEARCH',
    confidence: 0.9,
    documentReference: null,
    expandedQuery: 'test query',
    filterCriteria: {
      chunkTypes: ['section', 'paragraph'],
      temporal: {
        requireLatest: true
      }
    }
  };

  // Mock latest document versions
  const latestVersions = ['doc1', 'doc2', 'doc3'];
  
  // Generate filter
  const filter = QueryAnalysisService.createQdrantFilter(analysisResult, latestVersions);
  
  console.log('Generated filter:');
  console.log(JSON.stringify(filter, null, 2));
  
  // Test with QDrant service
  try {
    const qdrantService = new QdrantService();
    console.log('QDrant service initialized.');
    
    // Generate a simple embedding vector for testing
    const vector = Array(768).fill(0.1);
    
    // Try searching with the filter
    console.log('Testing search with filter...');
    const results = await qdrantService.client.search(
      process.env.QDRANT_COLLECTION || 'ewilli', 
      {
        vector: vector,
        filter: filter,
        limit: 5
      }
    );
    
    console.log(`Search successful! Found ${results.length} results.`);
    
  } catch (error) {
    console.error('Error testing QDrant search:', error.message);
    if (error.data && error.data.status && error.data.status.error) {
      console.error('QDrant error details:', error.data.status.error);
    }
  }
}

testQdrantFilters().catch(console.error);
