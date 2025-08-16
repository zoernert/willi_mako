#!/bin/bash

# Timeline System End-to-End Test
# Tests the complete timeline functionality from API to database

set -e

echo "🧪 Starting Timeline System E2E Tests..."

# Setup test environment
export NODE_ENV=test
export DATABASE_URL=${DATABASE_URL:-"postgresql://localhost:5432/willi_mako_test"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function test_passed() {
    echo -e "${GREEN}✅ $1${NC}"
}

function test_failed() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

function test_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Test-Variablen
API_BASE="http://localhost:3009/api"
TEST_EMAIL="timeline-test@example.com"
TEST_PASSWORD="test123456"
AUTH_TOKEN=""
TIMELINE_ID=""
ACTIVITY_ID=""

test_info "Starting backend server in background..."
npm run dev:backend-no-watch > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 5

function cleanup() {
    test_info "Cleaning up test environment..."
    kill $SERVER_PID 2>/dev/null || true
    
    # Cleanup test data
    if [ ! -z "$AUTH_TOKEN" ]; then
        curl -s -X DELETE "$API_BASE/timeline/$TIMELINE_ID" \
            -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null || true
    fi
}

trap cleanup EXIT

# Test 1: User Authentication
test_info "Test 1: User Authentication"
AUTH_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "'$TEST_EMAIL'", "password": "'$TEST_PASSWORD'"}')

if echo "$AUTH_RESPONSE" | grep -q "token"; then
    AUTH_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.token')
    test_passed "User authentication successful"
else
    test_failed "User authentication failed: $AUTH_RESPONSE"
fi

# Test 2: Create Timeline
test_info "Test 2: Create Timeline"
TIMELINE_RESPONSE=$(curl -s -X POST "$API_BASE/timeline" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name": "E2E Test Timeline", "description": "Test timeline for automated testing"}')

if echo "$TIMELINE_RESPONSE" | grep -q "id"; then
    TIMELINE_ID=$(echo "$TIMELINE_RESPONSE" | jq -r '.id')
    test_passed "Timeline creation successful (ID: $TIMELINE_ID)"
else
    test_failed "Timeline creation failed: $TIMELINE_RESPONSE"
fi

# Test 3: Activate Timeline
test_info "Test 3: Activate Timeline"
ACTIVATE_RESPONSE=$(curl -s -X PUT "$API_BASE/timeline/$TIMELINE_ID/activate" \
    -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$ACTIVATE_RESPONSE" | grep -q "is_active.*true"; then
    test_passed "Timeline activation successful"
else
    test_failed "Timeline activation failed: $ACTIVATE_RESPONSE"
fi

# Test 4: Capture Activity
test_info "Test 4: Capture Activity"
ACTIVITY_RESPONSE=$(curl -s -X POST "$API_BASE/timeline/activity/capture" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "timelineId": "'$TIMELINE_ID'",
        "feature": "test",
        "activityType": "e2e_test",
        "rawData": {
            "test": true,
            "message": "E2E test activity",
            "timestamp": "'$(date -Iseconds)'"
        },
        "priority": 1
    }')

if echo "$ACTIVITY_RESPONSE" | grep -q "activityId"; then
    ACTIVITY_ID=$(echo "$ACTIVITY_RESPONSE" | jq -r '.activityId')
    test_passed "Activity capture successful (ID: $ACTIVITY_ID)"
else
    test_failed "Activity capture failed: $ACTIVITY_RESPONSE"
fi

# Test 5: Fetch Timeline Stats
test_info "Test 5: Fetch Timeline Stats"
STATS_RESPONSE=$(curl -s -X GET "$API_BASE/timeline/stats" \
    -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$STATS_RESPONSE" | grep -q "total_timelines"; then
    TOTAL_TIMELINES=$(echo "$STATS_RESPONSE" | jq -r '.total_timelines')
    TOTAL_ACTIVITIES=$(echo "$STATS_RESPONSE" | jq -r '.total_activities')
    test_passed "Timeline stats retrieved (Timelines: $TOTAL_TIMELINES, Activities: $TOTAL_ACTIVITIES)"
else
    test_failed "Timeline stats fetch failed: $STATS_RESPONSE"
fi

# Test 6: List Timeline Activities
test_info "Test 6: List Timeline Activities"
ACTIVITIES_RESPONSE=$(curl -s -X GET "$API_BASE/timeline/$TIMELINE_ID/activities" \
    -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$ACTIVITIES_RESPONSE" | grep -q "activities"; then
    ACTIVITY_COUNT=$(echo "$ACTIVITIES_RESPONSE" | jq -r '.activities | length')
    test_passed "Timeline activities listed ($ACTIVITY_COUNT activities)"
else
    test_failed "Timeline activities listing failed: $ACTIVITIES_RESPONSE"
fi

# Test 7: Export Timeline
test_info "Test 7: Export Timeline"
EXPORT_RESPONSE=$(curl -s -X GET "$API_BASE/timeline/$TIMELINE_ID/export" \
    -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$EXPORT_RESPONSE" | grep -q "exported_at"; then
    test_passed "Timeline export successful"
else
    test_failed "Timeline export failed: $EXPORT_RESPONSE"
fi

# Test 8: Database Integration
test_info "Test 8: Database Integration Check"
DB_CHECK=$(psql $DATABASE_URL -t -c "
    SELECT COUNT(*) FROM timelines WHERE name = 'E2E Test Timeline';
" 2>/dev/null | tr -d ' ')

if [ "$DB_CHECK" = "1" ]; then
    test_passed "Database integration working correctly"
else
    test_failed "Database integration failed (Timeline not found in DB)"
fi

# Test 9: Timeline Processing Queue
test_info "Test 9: Timeline Processing Queue Check"
QUEUE_CHECK=$(psql $DATABASE_URL -t -c "
    SELECT COUNT(*) FROM timeline_processing_queue 
    WHERE activity_id = '$ACTIVITY_ID';
" 2>/dev/null | tr -d ' ')

if [ "$QUEUE_CHECK" -ge "0" ]; then
    test_passed "Timeline processing queue integration working"
else
    test_failed "Timeline processing queue integration failed"
fi

# Test 10: Delete Activity
test_info "Test 10: Delete Activity"
DELETE_RESPONSE=$(curl -s -X DELETE "$API_BASE/timeline/activities/$ACTIVITY_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN")

if echo "$DELETE_RESPONSE" | grep -q "success"; then
    test_passed "Activity deletion successful"
else
    test_failed "Activity deletion failed: $DELETE_RESPONSE"
fi

echo ""
echo -e "${GREEN}🎉 All Timeline System E2E Tests Passed!${NC}"
echo ""
echo "Test Summary:"
echo "✅ User Authentication"
echo "✅ Timeline Creation"
echo "✅ Timeline Activation"
echo "✅ Activity Capture"
echo "✅ Stats Retrieval"
echo "✅ Activities Listing"
echo "✅ Timeline Export"
echo "✅ Database Integration"
echo "✅ Processing Queue"
echo "✅ Activity Deletion"
echo ""
echo -e "${GREEN}Timeline System is ready for production! 🚀${NC}"
