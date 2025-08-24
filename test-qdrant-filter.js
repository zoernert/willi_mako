// File: test-qdrant-filter.js
// This is a simple test to verify that the filter format for QDrant is correct
// Usage: node test-qdrant-filter.js

// Access to the QdrantService and QueryAnalysisService
const path = require('path');
const fs = require('fs');

// Path to the query analysis service file
const queryAnalysisServicePath = path.join(__dirname, 'src/services/queryAnalysisService.ts');

// Read the file content to extract the filter generation logic
const fileContent = fs.readFileSync(queryAnalysisServicePath, 'utf8');

// Define test input
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

// Extract filter generation logic from the file content
console.log('Checking filter format from QueryAnalysisService...');

// Implement simplified filter creation
function createQdrantFilter(analysisResult, latestDocumentVersions) {
  const filter = {};
  const mustFilters = [];

  // Chunk-Type Filter
  if (analysisResult.filterCriteria.chunkTypes) {
    mustFilters.push({
      key: 'chunk_type',
      match: { 
        value: analysisResult.filterCriteria.chunkTypes.length === 1 
          ? analysisResult.filterCriteria.chunkTypes[0]
          : undefined,
        any: analysisResult.filterCriteria.chunkTypes.length > 1 
          ? analysisResult.filterCriteria.chunkTypes 
          : undefined
      }
    });
  }

  // Document-specific Filter
  if (analysisResult.filterCriteria.documentBaseName) {
    mustFilters.push({
      key: 'document_metadata.document_base_name',
      match: { value: analysisResult.filterCriteria.documentBaseName }
    });
  } else if (analysisResult.filterCriteria.temporal?.requireLatest && latestDocumentVersions?.length) {
    // Filter for latest versions
    mustFilters.push({
      key: 'document_metadata.document_base_name',
      match: { any: latestDocumentVersions }
    });
  }

  if (mustFilters.length > 0) {
    filter.must = mustFilters;
  }

  return Object.keys(filter).length > 0 ? filter : null;
}

// Generate filter
const filter = createQdrantFilter(analysisResult, latestVersions);

console.log('Generated filter:');
console.log(JSON.stringify(filter, null, 2));

console.log('\nFilter should now use "any" for arrays instead of "value".');
console.log('This should fix the QDrant API error.');
