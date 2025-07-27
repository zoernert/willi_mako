#!/usr/bin/env node

/**
 * Test script to create a proper configuration with all steps enabled
 * to see QDrant Vector Store results
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

async function createFullConfiguration() {
  try {
    console.log('\n📝 Creating complete configuration with all steps enabled...');
    
    const fullConfig = {
      name: "Complete Vector Store Test Config",
      description: "Configuration with all processing steps enabled to show QDrant Vector Store results",
      config: {
        maxIterations: 2,
        systemPrompt: "Du bist Mako Willi, ein AI-Coach für die Energiewirtschaft und Marktkommunikation. Deine Antworten basieren auf dem gegebenen Kontext und sind präzise sowie fundiert.",
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
            prompt: "Analysiere die Benutzeranfrage und extrahiere die Kernfrage. Generiere alternative Suchanfragen bei aktivierter Query-Expansion."
          },
          {
            name: "context_search",
            enabled: true,
            prompt: "Durchsuche den Qdrant Vector Store mit den generierten Suchanfragen. Sammle relevante Dokumente und Kontextinformationen."
          },
          {
            name: "context_optimization",
            enabled: true,
            prompt: "Optimiere und synthetisiere den gefundenen Kontext. Entferne Duplikate und priorisiere relevante Informationen."
          },
          {
            name: "response_generation",
            enabled: true,
            prompt: "Erstelle die finale Antwort basierend auf dem optimierten Kontext. Verwende den System-Prompt als Grundlage."
          },
          {
            name: "response_validation",
            enabled: true,
            prompt: "Validiere die Antwort auf Qualität und Korrektheit. Prüfe Mindestlänge und potenzielle Halluzinationen."
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

    const response = await axios.post(`${API_BASE}/admin/chat-config`, fullConfig, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Complete configuration created:', response.data.data.name);
    return response.data.data.id;
  } catch (error) {
    console.error('❌ Failed to create complete configuration:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testWithVectorStoreResults(configId) {
  try {
    console.log('\n🧪 Testing configuration to show QDrant Vector Store results...');
    
    const testQueries = [
      "Was ist eine BDEW-Marktrolle?",
      "Wie funktioniert ein Bilanzkreis?",
      "Was bedeutet EIC Code in der Energiewirtschaft?"
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
      console.log(`🔄 Iterations: ${result.iterationCount}`);
      console.log(`🎯 Final Confidence: ${(result.finalConfidence * 100).toFixed(1)}%`);
      
      if (result.iterations && result.iterations.length > 0) {
        console.log('\n📋 Vector Store Results Analysis:');
        
        result.iterations.forEach((iteration, index) => {
          console.log(`\n  Iteration ${iteration.iteration}:`);
          
          const contextSearchStep = iteration.steps.find(step => step.step === 'context_search');
          if (contextSearchStep && contextSearchStep.output?.searchDetails) {
            console.log(`    🔍 Vector Store Search Results:`);
            
            contextSearchStep.output.searchDetails.forEach((search, searchIndex) => {
              console.log(`      Query ${searchIndex + 1}: "${search.query}"`);
              console.log(`        Results found: ${search.resultsCount}`);
              
              if (search.results && search.results.length > 0) {
                search.results.slice(0, 3).forEach((result, resultIndex) => {
                  console.log(`        📄 Result ${resultIndex + 1}:`);
                  console.log(`          Score: ${result.score.toFixed(3)}`);
                  console.log(`          Title: ${result.title || result.source}`);
                  console.log(`          Source: ${result.source}`);
                  console.log(`          Chunk: ${result.chunk_index}`);
                  console.log(`          Content: ${(result.content || '').substring(0, 150)}...`);
                  console.log('');
                });
              } else {
                console.log(`        ❌ No results found for this query`);
              }
            });
            
            const summary = contextSearchStep.output;
            console.log(`    📊 Search Summary:`);
            console.log(`      Total results: ${summary.totalResultsFound}`);
            console.log(`      Unique results: ${summary.uniqueResultsUsed}`);
            console.log(`      Score threshold: ${summary.scoreThreshold}`);
            console.log(`      Average score: ${summary.avgScore.toFixed(3)}`);
          } else {
            console.log(`    ❌ No context search step found in this iteration`);
          }
        });
      }
      
      console.log(`\n📝 Final Response: ${result.generatedResponse.substring(0, 200)}...`);
      console.log('═'.repeat(100));
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

async function activateConfiguration(configId) {
  try {
    console.log('\n🎯 Activating the complete configuration...');
    
    await axios.post(`${API_BASE}/admin/chat-config/${configId}/activate`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Configuration activated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to activate configuration:', error.response?.data?.message || error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Complete Configuration Test with Vector Store Results');
  console.log('═'.repeat(80));

  // Authenticate
  if (!await authenticate()) {
    process.exit(1);
  }

  // Create complete configuration
  const configId = await createFullConfiguration();
  if (!configId) {
    process.exit(1);
  }

  try {
    // Test configuration with vector store results
    if (!await testWithVectorStoreResults(configId)) {
      throw new Error('Configuration test failed');
    }

    // Activate configuration
    if (!await activateConfiguration(configId)) {
      throw new Error('Configuration activation failed');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\nKey Results:');
    console.log('✅ Complete configuration created with all processing steps');
    console.log('✅ QDrant Vector Store results displayed with scores and content');
    console.log('✅ Multiple iterations tracked with detailed step information');
    console.log('✅ Configuration activated as the new default');
    console.log('\n💡 You should now see detailed Vector Store results in the admin interface!');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.log(`\n🧹 Configuration created with ID: ${configId}`);
    console.log('You can manually test it in the admin interface.');
  }
}

// Run the test
main().catch(console.error);
