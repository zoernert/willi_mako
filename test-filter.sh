#!/bin/bash

# Run the script with env vars
cd /config/Development/willi_mako

# Create a temporary test script
cat > test-filter.js << 'EOF'
const { QueryAnalysisService } = require('./src/services/queryAnalysisService');

// Test with multiple chunk types
const analysisResult = {
  intentType: 'SEARCH',
  confidence: 0.9,
  filterCriteria: {
    chunkTypes: ['section', 'paragraph'],
    temporal: {
      requireLatest: true
    }
  }
};

// Test with latest document versions
const latestVersions = ['doc1', 'doc2', 'doc3'];

// Generate filter
const filter = QueryAnalysisService.createQdrantFilter(analysisResult, latestVersions);

console.log('Generated filter:');
console.log(JSON.stringify(filter, null, 2));
EOF

# Run the test
echo "Running filter test..."
node test-filter.js

# Clean up
rm test-filter.js
