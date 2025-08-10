#!/usr/bin/env node

/**
 * Test Script für Community Initiatives API
 * Tests all implemented Community Initiative endpoints
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3009/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjNhODUxNjIyLTA4NTgtNGViMC1iMWVhLTEzYzM1NGM4N2JiZSIsImVtYWlsIjoidGhvcnN0ZW4uem9lcm5lckBzdHJvbWRhby5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTQ4MzI5MzMsImV4cCI6MTc1NDkxOTMzM30.p9I3IP1Hv6dgXCMBiZfeYimu75xR1noq06_jAw1VPy8';

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testEndpoint(method, url, data = null, expectedStatus = null) {
  try {
    console.log(`\n🔍 Testing ${method.toUpperCase()} ${url}`);
    
    const config = {
      method,
      url: `${API_BASE}${url}`,
      headers,
      ...(data && { data })
    };

    const response = await axios(config);
    
    const successStatuses = expectedStatus ? [expectedStatus] : [200, 201];
    if (successStatuses.includes(response.status)) {
      console.log(`✅ Success (${response.status})`);
      if (response.data) {
        console.log(`   Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
      }
      return response.data;
    } else {
      console.log(`❌ Unexpected status: ${response.status}`);
      return null;
    }
  } catch (error) {
    if (error.response) {
      console.log(`❌ Error ${error.response.status}: ${error.response.data?.message || 'Unknown error'}`);
      if (error.response.status === expectedStatus) {
        console.log(`✅ Expected error response`);
        return error.response.data;
      }
    } else {
      console.log(`❌ Network error: ${error.message}`);
    }
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Community Initiatives API Tests\n');
  
  // Test 1: Create a test thread first
  console.log('📋 Step 1: Create test thread');
  const threadData = await testEndpoint('post', '/community/threads', {
    title: 'Test Thread für Initiative API Tests',
    initialContent: {
      problem_description: 'Test Problem für Initiative',
      context: 'Test Kontext'
    }
  });
  
  if (!threadData?.data?.id) {
    console.log('❌ Failed to create test thread. Stopping tests.');
    return;
  }
  
  const threadId = threadData.data.id;
  console.log(`📌 Created thread: ${threadId}`);
  
  // Update thread to final status to enable initiative creation
  console.log('\n📋 Step 2: Add final solution to thread');
  await testEndpoint('patch', `/community/threads/${threadId}/document`, [
    {
      op: 'replace',
      path: '/final_solution',
      value: {
        content: 'Dies ist die finale Lösung für das Test-Problem. Eine umfassende Lösung die implementiert werden sollte.',
        approved_by: 'admin',
        approved_at: new Date().toISOString()
      }
    }
  ]);
  
  console.log('\n📋 Step 3: Update thread to final status');
  await testEndpoint('put', `/community/threads/${threadId}/status`, {
    status: 'final'
  });
  
  // Test 2: Create initiative for the thread
  console.log('\n📋 Step 4: Create initiative');
  const initiativeData = await testEndpoint('post', `/community/threads/${threadId}/initiatives`, {
    title: 'Test Initiative',
    target_audience: 'BDEW'
  });
  
  if (!initiativeData?.data?.id) {
    console.log('❌ Failed to create initiative. Skipping related tests.');
    return;
  }
  
  const initiativeId = initiativeData.data.id;
  console.log(`📌 Created initiative: ${initiativeId}`);
  
  // Test 3: Get initiatives for thread
  console.log('\n📋 Step 5: Get initiatives for thread');
  await testEndpoint('get', `/community/threads/${threadId}/initiatives`);
  
  // Test 4: Get all initiatives
  console.log('\n📋 Step 6: Get all initiatives');
  await testEndpoint('get', '/community/initiatives');
  
  // Test 5: Get specific initiative
  console.log('\n📋 Step 7: Get specific initiative');
  await testEndpoint('get', `/community/initiatives/${initiativeId}`);
  
  // Test 6: Update initiative
  console.log('\n📋 Step 8: Update initiative');
  await testEndpoint('patch', `/community/initiatives/${initiativeId}`, {
    title: 'Updated Test Initiative',
    target_audience: 'Regulierungsbehörde'
  });
  
  // Test 7: Update initiative status
  console.log('\n📋 Step 9: Update initiative status');
  await testEndpoint('put', `/community/initiatives/${initiativeId}/status`, {
    status: 'refining'
  });
  
  // Test 9: Try to delete initiative (should fail - not draft)
  console.log('\n📋 Step 10: Try to delete non-draft initiative (should fail)');
  await testEndpoint('delete', `/community/initiatives/${initiativeId}`, null, 400);
  
  // Test 10: Create another initiative for deletion test
  console.log('\n📋 Step 11: Create draft initiative for deletion test');
  const draftInitiativeData = await testEndpoint('post', `/community/threads/${threadId}/initiatives`, {
    title: 'Draft Initiative for Deletion',
    target_audience: 'Test'
  });
  
  if (draftInitiativeData?.data?.id) {
    const draftId = draftInitiativeData.data.id;
    console.log(`📌 Created draft initiative: ${draftId}`);
    
    // Test 11: Delete draft initiative (should succeed)
    console.log('\n📋 Step 12: Delete draft initiative');
    await testEndpoint('delete', `/community/initiatives/${draftId}`);
  }
  
  console.log('\n🎉 Community Initiatives API Tests Completed!');
}

// Set feature flag environment variable
process.env.FEATURE_COMMUNITY_HUB = 'true';

runTests().catch(console.error);
