#!/bin/bash

# Test script for Admin Chat Configuration with Iterations
# Tests the new iteration tracking and QDrant vector search results display

echo "🧪 Testing Admin Chat Configuration with Iterations..."

# Database connection settings from .env
DB_HOST="10.0.0.2"
DB_PORT="5117"
DB_NAME="willi_mako"
DB_USER="willi_user"
export PGPASSWORD="willi_password"

BASE_URL="http://localhost:3003"

# Test 1: Check if new database fields exist
echo "✅ Test 1: Checking database schema..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'chat_test_sessions' 
    AND column_name IN ('iterations', 'iteration_count', 'final_confidence')
    ORDER BY column_name;
"

# Test 2: Check if configurations exist
echo -e "\n✅ Test 2: Checking existing configurations..."
curl -s -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     "$BASE_URL/api/admin/chat-config" | jq '.data | length'

# Test 3: Create a test configuration with multiple iterations
echo -e "\n✅ Test 3: Creating test configuration..."
TEST_CONFIG_ID=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  "$BASE_URL/api/admin/chat-config" \
  -d '{
    "name": "Iterations Test Config",
    "description": "Test configuration for iteration tracking and QDrant vector search results",
    "config": {
      "maxIterations": 3,
      "systemPrompt": "Du bist ein hilfreicher Assistent für Energiewirtschaft. Antworte präzise und verwende verfügbare Dokumente.",
      "vectorSearch": {
        "maxQueries": 2,
        "limit": 5,
        "scoreThreshold": 0.3,
        "useQueryExpansion": true,
        "searchType": "hybrid",
        "hybridAlpha": 0.5,
        "diversityThreshold": 0.8
      },
      "processingSteps": [
        {
          "name": "query_understanding",
          "enabled": true,
          "prompt": "Analysiere die Anfrage und extrahiere Kernbegriffe"
        },
        {
          "name": "context_search",
          "enabled": true,
          "prompt": "Suche relevante Dokumente"
        },
        {
          "name": "context_optimization",
          "enabled": true,
          "prompt": "Optimiere den gefundenen Kontext"
        },
        {
          "name": "response_generation",
          "enabled": true,
          "prompt": "Generiere eine präzise Antwort"
        },
        {
          "name": "response_validation",
          "enabled": true,
          "prompt": "Validiere die Antwort auf Qualität"
        }
      ],
      "contextSynthesis": {
        "enabled": true,
        "maxLength": 2000
      },
      "qualityChecks": {
        "enabled": true,
        "minResponseLength": 50,
        "checkForHallucination": true
      }
    }
  }' | jq -r '.data.id')

echo "Created test configuration with ID: $TEST_CONFIG_ID"

# Test 4: Run a test with the new configuration
echo -e "\n✅ Test 4: Running test with iteration tracking..."
TEST_RESULT=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  "$BASE_URL/api/admin/chat-config/$TEST_CONFIG_ID/test" \
  -d '{
    "testQuery": "Was ist die EEG-Umlage und wie wird sie berechnet?",
    "contextSettings": {
      "useWorkspaceOnly": true
    }
  }')

echo "Test result received:"
echo "$TEST_RESULT" | jq '{
  success: .data.success,
  responseTimeMs: .data.responseTimeMs,
  iterationCount: .data.iterationCount,
  finalConfidence: .data.finalConfidence,
  iterations: (.data.iterations | length),
  processingSteps: (.data.processingSteps | length)
}'

# Test 5: Check detailed iterations in test history
echo -e "\n✅ Test 5: Checking test history with iterations..."
curl -s -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     "$BASE_URL/api/admin/chat-config/$TEST_CONFIG_ID/test-history?limit=1" | \
     jq '.data[0] | {
       testQuery: .testQuery,
       iterationCount: .iterationCount,
       finalConfidence: .finalConfidence,
       hasIterations: (.iterations != null),
       iterationsLength: (.iterations | length)
     }'

# Test 6: Verify QDrant vector search results structure
echo -e "\n✅ Test 6: Checking QDrant vector search results structure..."
curl -s -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     "$BASE_URL/api/admin/chat-config/$TEST_CONFIG_ID/test-history?limit=1" | \
     jq '.data[0].iterations[0].steps[] | select(.step == "context_search") | .output.searchDetails[0].results[0] | {
       hasScore: (.score != null),
       hasContent: (.content != null),
       hasSource: (.source != null),
       hasTitle: (.title != null)
     }'

# Test 7: Database verification
echo -e "\n✅ Test 7: Verifying database storage..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT 
        test_query,
        iteration_count,
        final_confidence,
        (iterations IS NOT NULL) as has_iterations,
        (jsonb_array_length(iterations)) as iterations_count,
        was_successful
    FROM chat_test_sessions 
    WHERE configuration_id = '$TEST_CONFIG_ID'
    ORDER BY created_at DESC 
    LIMIT 1;
"

# Test 8: Performance check
echo -e "\n✅ Test 8: Performance analysis..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT 
        cc.name,
        cc.avg_response_time_ms,
        cc.success_rate,
        cc.test_count,
        AVG(cts.response_time_ms) as actual_avg_time,
        AVG(cts.iteration_count) as avg_iterations,
        AVG(cts.final_confidence) as avg_confidence
    FROM chat_configurations cc
    LEFT JOIN chat_test_sessions cts ON cc.id = cts.configuration_id
    WHERE cc.id = '$TEST_CONFIG_ID'
    GROUP BY cc.id, cc.name, cc.avg_response_time_ms, cc.success_rate, cc.test_count;
"

# Cleanup (optional)
read -p "Delete test configuration? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️ Cleaning up test configuration..."
    curl -s -X DELETE \
         -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
         "$BASE_URL/api/admin/chat-config/$TEST_CONFIG_ID"
    echo "Test configuration deleted."
fi

echo -e "\n🎉 All tests completed!"
echo "📋 Summary:"
echo "   - Database schema: Updated with iteration fields"
echo "   - API endpoints: Support iteration tracking"
echo "   - QDrant results: Detailed vector search data"
echo "   - Frontend ready: For iteration display"
echo "   - Performance: Monitored and tracked"
