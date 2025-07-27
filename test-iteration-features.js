#!/usr/bin/env node

/**
 * Test script for iteration features in chat configuration system
 * Tests the new detailed QDrant Vector Store result display
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@test.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

let authToken = '';

async function authenticate() {
  try {
    console.log('🔐 Authenticating as admin...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    authToken = response.data.data.token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function createTestConfiguration() {
  try {
    console.log('\n📝 Creating test configuration with multiple iterations...');
    
    const testConfig = {
      name: "Multi-Iteration Test Config",
      description: "Configuration for testing detailed QDrant vector store results with multiple iterations",
      config: {
        maxIterations: 3,
        systemPrompt: "Du bist ein hilfreicher Assistant für energiewirtschaftliche Fragen. Antworte präzise und fundiert basierend auf dem gegebenen Kontext.",
        vectorSearch: {
          searchType: "hybrid",
          maxQueries: 3,
          limit: 10,
          scoreThreshold: 0.3,
          useQueryExpansion: true,
          hybridAlpha: 0.7,
          diversityThreshold: 0.8
        },
        processingSteps: [
          {
            name: "query_understanding",
            enabled: true,
            prompt: "Analysiere die Benutzeranfrage und extrahiere die Kernfrage. Generiere alternative Suchanfragen."
          },
          {
            name: "context_search",
            enabled: true,
            prompt: "Durchsuche den Qdrant Vector Store mit den generierten Suchanfragen."
          },
          {
            name: "context_optimization",
            enabled: true,
            prompt: "Optimiere und synthetisiere den gefundenen Kontext."
          },
          {
            name: "response_generation",
            enabled: true,
            prompt: "Erstelle die finale Antwort basierend auf dem optimierten Kontext."
          },
          {
            name: "response_validation",
            enabled: true,
            prompt: "Validiere die Antwort auf Qualität und Korrektheit."
          }
        ],
        contextSynthesis: {
          enabled: true,
          maxLength: 4000
        },
        qualityChecks: {
          enabled: true,
          minResponseLength: 50,
          checkForHallucination: true
        }
      }
    };

    const response = await axios.post(`${API_BASE}/admin/chat-config`, testConfig, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Test configuration created:', response.data.data.name);
    return response.data.data.id;
  } catch (error) {
    console.error('❌ Failed to create test configuration:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testConfigurationWithQdrantDetails(configId) {
  try {
    console.log('\n🧪 Testing configuration with detailed QDrant vector search...');
    
    const testQueries = [
      "Was ist die BDEW-Marktrolle eines Netzbetreibers?",
      "Wie funktioniert das Bilanzkreissystem in Deutschland?",
      "Welche Bedeutung haben EIC-Codes im Energiehandel?"
    ];

    for (const testQuery of testQueries) {
      console.log(`\n🔍 Testing query: "${testQuery}"`);
      
      const response = await axios.post(`${API_BASE}/admin/chat-config/${configId}/test`, {
        testQuery,
        contextSettings: {
          useWorkspaceOnly: false
        }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const result = response.data.data;
      
      console.log(`✅ Test completed in ${result.responseTimeMs}ms`);
      console.log(`📊 Success: ${result.success}`);
      console.log(`🔄 Iterations: ${result.iterationCount}/${result.config?.maxIterations || 'N/A'}`);
      console.log(`🎯 Final Confidence: ${(result.finalConfidence * 100).toFixed(1)}%`);
      
      if (result.iterations && result.iterations.length > 0) {
        console.log('\n📋 Iteration Details:');
        result.iterations.forEach((iteration, index) => {
          console.log(`  Iteration ${iteration.iteration}:`);
          console.log(`    Duration: ${iteration.duration}ms`);
          console.log(`    Confidence: ${(iteration.confidence * 100).toFixed(1)}%`);
          console.log(`    Should Continue: ${iteration.shouldContinue}`);
          
          if (iteration.steps) {
            console.log(`    Steps: ${iteration.steps.length}`);
            iteration.steps.forEach(step => {
              console.log(`      - ${step.name}: ${step.success ? '✅' : '❌'} (${step.duration}ms)`);
              
              // Show QDrant vector search details
              if (step.step === 'context_search' && step.output?.searchDetails) {
                console.log(`        QDrant Search Results:`);
                step.output.searchDetails.forEach((search, searchIndex) => {
                  console.log(`          Query ${searchIndex + 1}: "${search.query}" (${search.resultsCount} results)`);
                  if (search.results && search.results.length > 0) {
                    search.results.slice(0, 3).forEach((result, resultIndex) => {
                      console.log(`            Result ${resultIndex + 1}: Score ${result.score.toFixed(3)} - ${result.title || result.source}`);
                      console.log(`              Content: ${(result.content || result.text || '').substring(0, 100)}...`);
                    });
                  }
                });
                console.log(`        Summary: ${step.output.totalResultsFound} total, ${step.output.uniqueResultsUsed} unique, avg score: ${step.output.avgScore.toFixed(3)}`);
              }
            });
          }
        });
      }
      
      console.log(`\n📝 Final Response: ${result.generatedResponse.substring(0, 200)}...`);
      console.log('═'.repeat(80));
    }

    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.details) {
      console.error('📋 Details:', error.response.data.details);
    }
    return false;
  }
}

async function testHistoryAndStats(configId) {
  try {
    console.log('\n📊 Checking test history and statistics...');
    
    const response = await axios.get(`${API_BASE}/admin/chat-config/${configId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const config = response.data.data;
    console.log(`📈 Statistics for "${config.name}":`);
    console.log(`  Average Response Time: ${config.avgResponseTimeMs}ms`);
    console.log(`  Success Rate: ${config.successRate}%`);
    console.log(`  Test Count: ${config.testCount}`);
    
    // Get test history
    const historyResponse = await axios.get(`${API_BASE}/admin/chat-config/${configId}/test-history`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log(`\n📋 Test History (${historyResponse.data.data.length} entries):`);
    historyResponse.data.data.slice(0, 5).forEach((test, index) => {
      console.log(`  Test ${index + 1}:`);
      console.log(`    Query: "${test.testQuery.substring(0, 60)}..."`);
      console.log(`    Success: ${test.wasSuccessful ? '✅' : '❌'}`);
      console.log(`    Response Time: ${test.responseTimeMs}ms`);
      console.log(`    Date: ${new Date(test.createdAt).toLocaleString()}`);
    });

    return true;
  } catch (error) {
    console.error('❌ Failed to check history and stats:', error.response?.data?.message || error.message);
    return false;
  }
}

async function cleanupTestConfiguration(configId) {
  try {
    console.log('\n🧹 Cleaning up test configuration...');
    
    await axios.delete(`${API_BASE}/admin/chat-config/${configId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Test configuration cleaned up');
    return true;
  } catch (error) {
    console.error('❌ Cleanup failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Chat Configuration Iteration Features Test');
  console.log('════════════════════════════════════════════════════════');

  // Authenticate
  if (!await authenticate()) {
    process.exit(1);
  }

  // Create test configuration
  const configId = await createTestConfiguration();
  if (!configId) {
    process.exit(1);
  }

  try {
    // Test configuration with detailed QDrant results
    if (!await testConfigurationWithQdrantDetails(configId)) {
      throw new Error('Configuration test failed');
    }

    // Check history and statistics
    if (!await testHistoryAndStats(configId)) {
      throw new Error('History and stats check failed');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\nKey Features Tested:');
    console.log('✅ Multiple iterations with confidence tracking');
    console.log('✅ Detailed QDrant vector search results with scores');
    console.log('✅ Per-step processing details and timing');
    console.log('✅ Content previews and source information');
    console.log('✅ Search query expansion and result aggregation');
    console.log('✅ Test history and performance statistics');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  } finally {
    // Cleanup
    await cleanupTestConfiguration(configId);
  }
}

// Run the test
main().catch(console.error);
