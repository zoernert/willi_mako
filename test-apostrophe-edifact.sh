#!/bin/bash

# Test script for EDIFACT messages with apostrophe separators

API_URL="http://localhost:3009/api/v2/message-analyzer"
TOKEN=""

echo "🧪 Testing EDIFACT Message Analyzer with Apostrophe Separators"
echo "=============================================================="

# Get authentication token
echo ""
echo "📋 Step 1: Login and get token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3009/api/v2/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "thorsten.zoerner@stromdao.com",
    "password": "test123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken // .accessToken // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed. Response:"
  echo $LOGIN_RESPONSE | jq '.'
  exit 1
fi

echo "✅ Token received: ${TOKEN:0:20}..."

# Test EDIFACT message with apostrophe separators
echo ""
echo "📋 Step 2: Validate EDIFACT message with apostrophe separators..."
EDIFACT_MESSAGE="UNA:+.? 'UNB+UNOC:3+9905766000008:500+9903756000004:500+250905:1217+004028004889++VL'UNH+004027997159+MSCONS:D:04B:UN:2.4c'BGM+7+004027997159+9'DTM+137:202509051213?+00:303'RFF+Z13:13017'NAD+MS+9905766000008::293'NAD+MR+9903756000004::293'UNS+D'NAD+DP'LOC+172+DE0071373163400000E000A0014996748'RFF+MG:1LGZ0056829358'LIN+1'PIA+5+1-1?:1.8.0:SRW'QTY+67:2729.000'DTM+7:202505312200?+00:303'STS+Z32++Z92'STS+Z40++Z74'UNT+17+004027997159'UNH+004027997100+MSCONS:D:04B:UN:2.4c'BGM+7+004027997100+1'DTM+137:202509051212?+00:303'RFF+ACW:003964097417'RFF+Z13:13006'NAD+MS+9905766000008::293'NAD+MR+9903756000004::293'UNS+D'NAD+DP'LOC+172'UNT+11+004027997100'UNZ+2+004028004889'"

VALIDATE_RESPONSE=$(curl -s -X POST "${API_URL}/validate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\": $(echo "$EDIFACT_MESSAGE" | jq -R -s '.')}")

echo "Validation Response:"
echo $VALIDATE_RESPONSE | jq '.'

# Check if validation passed
IS_VALID=$(echo $VALIDATE_RESPONSE | jq -r '.data.isValid // .isValid // false')
SEGMENT_COUNT=$(echo $VALIDATE_RESPONSE | jq -r '.data.segmentCount // .segmentCount // 0')
MESSAGE_TYPE=$(echo $VALIDATE_RESPONSE | jq -r '.data.messageType // .messageType // "unknown"')

echo ""
if [ "$IS_VALID" = "true" ]; then
  echo "✅ Validation PASSED"
  echo "   - Message Type: $MESSAGE_TYPE"
  echo "   - Segment Count: $SEGMENT_COUNT"
else
  echo "❌ Validation FAILED"
  ERRORS=$(echo $VALIDATE_RESPONSE | jq -r '.data.errors // .errors // []')
  echo "   Errors: $ERRORS"
fi

# Test Analysis
echo ""
echo "📋 Step 3: Analyze EDIFACT message..."
ANALYZE_RESPONSE=$(curl -s -X POST "${API_URL}/analyze" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\": $(echo "$EDIFACT_MESSAGE" | jq -R -s '.')}")

echo "Analysis Response (summary only):"
echo $ANALYZE_RESPONSE | jq -r '.data.summary // .summary // "No summary"' | head -20

echo ""
echo "=============================================================="
echo "🎉 Test completed!"
