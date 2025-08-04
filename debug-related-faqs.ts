import { QdrantService } from './src/services/qdrant';
import { getRelatedFAQs } from './lib/faq-api';

async function debugRelatedFAQs() {
  console.log('=== Debug Related FAQs ===\n');
  
  try {
    // Test 1: Direct QdrantService call
    console.log('1. Testing QdrantService.searchByText directly...');
    const searchText = 'Energieversorgung Strommarkt';
    const results = await QdrantService.searchByText(searchText, 5, 0.3);
    
    console.log(`Search results for "${searchText}":`);
    console.log('Results length:', results.length);
    
    results.forEach((result, index) => {
      console.log(`\nResult ${index + 1}:`);
      console.log('  ID:', result.id);
      console.log('  Score:', result.score);
      console.log('  Payload:', JSON.stringify(result.payload, null, 2));
    });
    
    // Test 2: Test getRelatedFAQs function
    console.log('\n\n2. Testing getRelatedFAQs function...');
    if (results.length > 0) {
      const faqId = String(results[0].id);
      const content = (results[0] as any).payload?.text || 'Energieversorgung Test';
      
      console.log(`Getting related FAQs for ID: ${faqId}`);
      const relatedFAQs = await getRelatedFAQs(faqId, content, 3);
      
      console.log('Related FAQs result:');
      console.log('Length:', relatedFAQs.length);
      relatedFAQs.forEach((faq, index) => {
        console.log(`\nRelated FAQ ${index + 1}:`);
        console.log('  ID:', faq.id);
        console.log('  Title:', faq.title);
        console.log('  Slug:', faq.slug);
        console.log('  Similarity Score:', faq.similarity_score);
      });
    }
    
  } catch (error) {
    console.error('Error during debugging:', error);
  }
}

debugRelatedFAQs();
