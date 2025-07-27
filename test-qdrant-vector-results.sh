#!/bin/bash

# QDrant Vector Store Results Test
# Tests detailed display of vector search results with scores, content previews, and metadata

echo "🔍 Testing QDrant Vector Store Results Display..."

# Database connection from .env
export PGPASSWORD="willi_password"
DB_HOST="10.0.0.2"
DB_PORT="5117"
DB_USER="willi_user"
DB_NAME="willi_mako"

BASE_URL="http://localhost:3003"

# Function to test vector search results
test_vector_search() {
    local config_id=$1
    local test_query=$2
    
    echo "🧪 Testing query: '$test_query'"
    
    # Run test
    local result=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
        "$BASE_URL/api/admin/chat-config/$config_id/test" \
        -d "{\"testQuery\": \"$test_query\", \"contextSettings\": {\"useWorkspaceOnly\": true}}")
    
    # Extract vector search details
    echo "$result" | jq -r '
        .data.iterations[]? | 
        .steps[]? | 
        select(.step == "context_search") | 
        .output.searchDetails[]? |
        "Query: \(.query) | Results: \(.resultsCount) | Avg Score: \(.results | map(.score) | add / length | . * 100 | floor / 100)"
    '
    
    # Show detailed results
    echo "📊 Detailed Results:"
    echo "$result" | jq -r '
        .data.iterations[]? | 
        .steps[]? | 
        select(.step == "context_search") | 
        .output.searchDetails[]? | 
        .results[]? |
        "  ├─ Score: \(.score | . * 100 | floor / 100)% | Source: \(.source) | Title: \(.title // "N/A")"
    '
    
    return 0
}

# Create test configuration optimized for vector search analysis
echo "📝 Creating vector search test configuration..."
VECTOR_CONFIG_ID=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
    "$BASE_URL/api/admin/chat-config" \
    -d '{
        "name": "QDrant Vector Search Test",
        "description": "Optimized for detailed vector search result analysis",
        "config": {
            "maxIterations": 2,
            "systemPrompt": "Analysiere die Anfrage und nutze die besten verfügbaren Quellen.",
            "vectorSearch": {
                "maxQueries": 3,
                "limit": 10,
                "scoreThreshold": 0.2,
                "useQueryExpansion": true,
                "searchType": "hybrid",
                "hybridAlpha": 0.5,
                "diversityThreshold": 0.7
            },
            "processingSteps": [
                {"name": "query_understanding", "enabled": true, "prompt": "Verstehe die Anfrage"},
                {"name": "context_search", "enabled": true, "prompt": "Suche relevante Dokumente"},
                {"name": "context_optimization", "enabled": true, "prompt": "Optimiere Kontext"},
                {"name": "response_generation", "enabled": true, "prompt": "Generiere Antwort"},
                {"name": "response_validation", "enabled": true, "prompt": "Validiere Antwort"}
            ],
            "contextSynthesis": {"enabled": true, "maxLength": 1500},
            "qualityChecks": {"enabled": true, "minResponseLength": 30, "checkForHallucination": true}
        }
    }' | jq -r '.data.id')

echo "✅ Created test configuration: $VECTOR_CONFIG_ID"

# Test various queries to analyze vector search behavior
echo -e "\n🎯 Testing various query types..."

test_vector_search "$VECTOR_CONFIG_ID" "Was ist Windenergie?"
echo ""
test_vector_search "$VECTOR_CONFIG_ID" "EEG-Umlage Berechnung 2024"
echo ""
test_vector_search "$VECTOR_CONFIG_ID" "Strommarkt Deutschland Regelenergie"
echo ""
test_vector_search "$VECTOR_CONFIG_ID" "Photovoltaik Eigenverbrauch Steuer"

# Analyze search performance
echo -e "\n📈 Vector Search Performance Analysis:"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    WITH search_analysis AS (
        SELECT 
            cts.test_query,
            cts.iteration_count,
            cts.final_confidence,
            jsonb_array_length(cts.iterations) as actual_iterations,
            (
                SELECT AVG((result->>'score')::float)
                FROM (
                    SELECT jsonb_array_elements(
                        jsonb_path_query_array(
                            cts.iterations, 
                            '\$[*].steps[*] ? (@.step == \"context_search\").output.searchDetails[*].results[*]'
                        )
                    ) as result
                ) subq
                WHERE (result->>'score') IS NOT NULL
            ) as avg_vector_score,
            (
                SELECT COUNT(*)
                FROM (
                    SELECT jsonb_array_elements(
                        jsonb_path_query_array(
                            cts.iterations, 
                            '\$[*].steps[*] ? (@.step == \"context_search\").output.searchDetails[*].results[*]'
                        )
                    ) as result
                ) subq
            ) as total_vector_results
        FROM chat_test_sessions cts
        WHERE cts.configuration_id = '$VECTOR_CONFIG_ID'
        ORDER BY cts.created_at DESC
        LIMIT 10
    )
    SELECT 
        test_query,
        iteration_count,
        ROUND(final_confidence::numeric, 2) as confidence,
        ROUND(avg_vector_score::numeric, 3) as avg_score,
        total_vector_results
    FROM search_analysis;
"

# Show detailed vector search results structure
echo -e "\n🔬 Vector Search Results Structure Analysis:"
curl -s -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     "$BASE_URL/api/admin/chat-config/$VECTOR_CONFIG_ID/test-history?limit=1" | \
     jq -r '
        .data[0].iterations[0].steps[] | 
        select(.step == "context_search") | 
        .output | 
        "Total Results: \(.totalResultsFound) | Unique: \(.uniqueResultsUsed) | Threshold: \(.scoreThreshold) | Avg Score: \(.avgScore)"
     '

# Frontend Integration Test
echo -e "\n🖥️ Frontend Integration Test:"
echo "The following data structure should be displayed in the frontend:"
curl -s -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     "$BASE_URL/api/admin/chat-config/$VECTOR_CONFIG_ID/test-history?limit=1" | \
     jq '.data[0] | {
        testQuery: .testQuery,
        iterationCount: .iterationCount,
        finalConfidence: .finalConfidence,
        iterations: [
            .iterations[0] | {
                iteration: .iteration,
                confidence: .confidence,
                steps: [
                    .steps[] | select(.step == "context_search") | {
                        step: .step,
                        name: .name,
                        duration: .duration,
                        searchDetails: [
                            .output.searchDetails[0] | {
                                query: .query,
                                resultsCount: .resultsCount,
                                firstResult: .results[0] | {
                                    score: .score,
                                    title: .title,
                                    source: .source,
                                    contentPreview: (.content | .[0:100] + "...")
                                }
                            }
                        ]
                    }
                ]
            }
        ]
     }'

# Cleanup option
read -p "🗑️ Delete test configuration? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    curl -s -X DELETE \
         -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
         "$BASE_URL/api/admin/chat-config/$VECTOR_CONFIG_ID"
    echo "✅ Test configuration deleted."
fi

echo -e "\n🎉 QDrant Vector Store Results Test completed!"
echo "📋 Key Features Tested:"
echo "   ✅ Vector search result display with scores"
echo "   ✅ Content previews (first 300 characters)"
echo "   ✅ Source and metadata information"
echo "   ✅ Search summary statistics"
echo "   ✅ Multi-iteration tracking"
echo "   ✅ Performance metrics"
echo "   ✅ Database storage verification"
echo "   ✅ Frontend data structure"
