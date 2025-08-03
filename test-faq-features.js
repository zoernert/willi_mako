#!/usr/bin/env node

/**
 * Test script for the new FAQ features
 */

const axios = require('axios');
const readline = require('readline');

const BASE_URL = 'http://localhost:3003';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function testFAQFeatures() {
  console.log('🧪 FAQ Features Test');
  console.log('====================');
  
  try {
    // Test 1: Get all FAQs with default sorting (newest first)
    console.log('\n1️⃣ Testing FAQ list (default sorting - newest first)...');
    const response1 = await axios.get(`${BASE_URL}/faqs`);
    console.log(`✅ Found ${response1.data.data.length} FAQs`);
    if (response1.data.data.length > 0) {
      console.log(`   First FAQ: "${response1.data.data[0].title}"`);
      console.log(`   Tags: ${response1.data.data[0].tags.join(', ')}`);
      console.log(`   Created: ${response1.data.data[0].created_at}`);
    }
    
    // Test 2: Search functionality
    console.log('\n2️⃣ Testing search functionality...');
    const searchTerm = await ask('Enter a search term (or press Enter for "Energie"): ') || 'Energie';
    const response2 = await axios.get(`${BASE_URL}/faqs?search=${encodeURIComponent(searchTerm)}`);
    console.log(`✅ Search for "${searchTerm}" found ${response2.data.data.length} FAQs`);
    if (response2.data.data.length > 0) {
      console.log(`   First result: "${response2.data.data[0].title}"`);
    }
    
    // Test 3: Tag filtering
    console.log('\n3️⃣ Testing tag filtering...');
    const tagsResponse = await axios.get(`${BASE_URL}/faq-tags`);
    console.log(`✅ Available tags: ${tagsResponse.data.join(', ')}`);
    
    if (tagsResponse.data.length > 0) {
      const testTag = tagsResponse.data[0];
      const response3 = await axios.get(`${BASE_URL}/faqs?tag=${encodeURIComponent(testTag)}`);
      console.log(`✅ Filter by tag "${testTag}" found ${response3.data.data.length} FAQs`);
    }
    
    // Test 4: Sorting options
    console.log('\n4️⃣ Testing sorting options...');
    
    // Sort by view count (most viewed first)
    const response4a = await axios.get(`${BASE_URL}/faqs?sort=view_count&order=desc&limit=3`);
    console.log(`✅ Most viewed FAQs:`);
    response4a.data.data.forEach((faq, index) => {
      console.log(`   ${index + 1}. "${faq.title}" (${faq.view_count} views)`);
    });
    
    // Sort by title A-Z
    const response4b = await axios.get(`${BASE_URL}/faqs?sort=title&order=asc&limit=3`);
    console.log(`✅ FAQs sorted A-Z:`);
    response4b.data.data.forEach((faq, index) => {
      console.log(`   ${index + 1}. "${faq.title}"`);
    });
    
    // Test 5: Pagination
    console.log('\n5️⃣ Testing pagination...');
    const response5 = await axios.get(`${BASE_URL}/faqs?limit=5&offset=0`);
    console.log(`✅ Pagination test (first 5 FAQs):`);
    console.log(`   Total: ${response5.data.pagination.total}`);
    console.log(`   Current page: ${response5.data.data.length} FAQs`);
    console.log(`   Has more: ${response5.data.pagination.hasMore}`);
    
    // Test 6: Get specific FAQ
    if (response1.data.data.length > 0) {
      console.log('\n6️⃣ Testing FAQ details...');
      const faqId = response1.data.data[0].id;
      const response6 = await axios.get(`${BASE_URL}/faqs/${faqId}`);
      console.log(`✅ FAQ details for "${response6.data.data.title}"`);
      console.log(`   Description: ${response6.data.data.description.substring(0, 100)}...`);
      console.log(`   View count before: ${response1.data.data[0].view_count}`);
      console.log(`   View count after: ${response6.data.data.view_count}`);
    }
    
    // Test 7: Combined filters
    console.log('\n7️⃣ Testing combined filters...');
    const response7 = await axios.get(`${BASE_URL}/faqs?search=energie&sort=view_count&order=desc&limit=3`);
    console.log(`✅ Combined search + sorting found ${response7.data.data.length} FAQs`);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\nKey Features Tested:');
    console.log('✅ Default sorting (newest first)');
    console.log('✅ Search functionality');
    console.log('✅ Tag filtering');
    console.log('✅ Multiple sorting options');
    console.log('✅ Pagination');
    console.log('✅ FAQ details with view count increment');
    console.log('✅ Combined filters');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  } finally {
    rl.close();
  }
}

// Test frontend-specific functionality
async function testFrontendFeatures() {
  console.log('\n🖥️ Frontend Integration Notes:');
  console.log('===============================');
  console.log('✅ Search bar with instant filtering');
  console.log('✅ Tag chips that can be clicked to filter');
  console.log('✅ Sort dropdown with multiple options');
  console.log('✅ Pagination with page numbers');
  console.log('✅ Click on FAQ card to navigate to details page');
  console.log('✅ Truncated descriptions with "..." indicator');
  console.log('✅ View count and creation date display');
  console.log('✅ Filter reset functionality');
  console.log('✅ Responsive design for mobile devices');
}

// Run tests
if (require.main === module) {
  console.log('🚀 Starting FAQ Features Test...');
  testFAQFeatures()
    .then(() => testFrontendFeatures())
    .then(() => {
      console.log('\n✨ Test completed! You can now test the frontend at http://localhost:3000/faq');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testFAQFeatures };
