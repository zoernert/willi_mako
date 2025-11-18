#!/usr/bin/env node

/**
 * Test Combined Search Functionality
 * Tests semanticSearchCombined() with "Tagungsband" query
 */

const { QdrantService } = require('./dist/services/qdrant');

async function testCombinedSearch() {
  console.log('🧪 Testing Combined Search with "Tagungsband"');
  console.log('================================================\n');

  try {
    // Test 1: Combined Search
    console.log('1️⃣ Testing semanticSearchCombined()...');
    const combinedResults = await QdrantService.semanticSearchCombined('Tagungsband', {
      limit: 10,
      alpha: 0.75,
      outlineScoping: true,
      excludeVisual: true
    });

    console.log(`\n✅ Combined Search returned ${combinedResults.length} results\n`);
    
    if (combinedResults.length > 0) {
      console.log('Top 5 Results:');
      combinedResults.slice(0, 5).forEach((result, i) => {
        const score = result.merged_score ?? result.score ?? 0;
        const source = result.sourceCollection || 'unknown';
        const title = result.payload?.title || result.payload?.document_base_name || 'No title';
        const text = (result.payload?.text || result.payload?.content || '').substring(0, 100);
        
        console.log(`\n${i + 1}. [${source}] Score: ${score.toFixed(4)}`);
        console.log(`   Title: ${title}`);
        console.log(`   Text: ${text}...`);
      });
    } else {
      console.log('❌ No results found!');
    }

    // Test 2: willi-netz only
    console.log('\n\n2️⃣ Testing willi-netz collection only...');
    const williNetzResults = await QdrantService.semanticSearchGuidedByCollection('Tagungsband', {
      limit: 10,
      alpha: 0.75,
      outlineScoping: true,
      excludeVisual: true
    }, 'willi-netz');

    console.log(`\n✅ willi-netz returned ${williNetzResults.length} results`);
    
    if (williNetzResults.length > 0) {
      const topResult = williNetzResults[0];
      const score = topResult.merged_score ?? topResult.score ?? 0;
      console.log(`   Top result score: ${score.toFixed(4)}`);
      console.log(`   Title: ${topResult.payload?.title || topResult.payload?.document_base_name || 'No title'}`);
    }

    // Test 3: willi_mako only
    console.log('\n\n3️⃣ Testing willi_mako collection only...');
    const williMakoResults = await QdrantService.semanticSearchGuidedByCollection('Tagungsband', {
      limit: 10,
      alpha: 0.75,
      outlineScoping: true,
      excludeVisual: true
    }, 'willi_mako');

    console.log(`\n✅ willi_mako returned ${williMakoResults.length} results`);
    
    if (williMakoResults.length > 0) {
      const topResult = williMakoResults[0];
      const score = topResult.merged_score ?? topResult.score ?? 0;
      console.log(`   Top result score: ${score.toFixed(4)}`);
    }

    console.log('\n\n================================================');
    console.log('📊 Summary:');
    console.log(`   Combined: ${combinedResults.length} results`);
    console.log(`   willi-netz: ${williNetzResults.length} results`);
    console.log(`   willi_mako: ${williMakoResults.length} results`);
    
    if (williNetzResults.length > 0 && combinedResults.length === 0) {
      console.log('\n⚠️  WARNING: willi-netz has results but combined search returned none!');
      console.log('   This indicates a bug in semanticSearchCombined()');
    } else if (williNetzResults.length > 0 && combinedResults.length > 0) {
      console.log('\n✅ Combined search is working correctly!');
    } else if (williNetzResults.length === 0) {
      console.log('\n❌ No results in willi-netz collection for "Tagungsband"');
      console.log('   The collection may not contain this content.');
    }

  } catch (error) {
    console.error('\n❌ Error during test:', error);
    process.exit(1);
  }
}

// Run the test
testCombinedSearch()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
