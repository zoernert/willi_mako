#!/bin/bash

echo "🧪 Quick Test: API v2 Documents Endpoint Availability"
echo ""

BASE_URL="http://10.0.0.2:4101"

echo "1. Testing if server responds..."
curl -s -w "HTTP Status: %{http_code}\n" "$BASE_URL/api/v2/openapi.json" > /dev/null
echo ""

echo "2. Checking OpenAPI spec for /documents endpoints..."
DOCS_ENDPOINTS=$(curl -s "$BASE_URL/api/v2/openapi.json" | jq -r '.paths | keys[]' | grep '/documents')

if [ -z "$DOCS_ENDPOINTS" ]; then
  echo "❌ No /documents endpoints found in OpenAPI spec"
  echo ""
  echo "Available v2 endpoints:"
  curl -s "$BASE_URL/api/v2/openapi.json" | jq -r '.paths | keys[]'
else
  echo "✅ Found documents endpoints:"
  echo "$DOCS_ENDPOINTS"
fi
echo ""

echo "3. Testing GET /api/v2/documents (should return 401 without auth)..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/api/v2/documents")
STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Status: $STATUS"
echo "Response: $BODY"

if [ "$STATUS" = "401" ]; then
  echo "✅ Endpoint exists and requires authentication (as expected)"
elif [ "$STATUS" = "404" ]; then
  echo "❌ Endpoint not found - route not registered"
else
  echo "⚠️  Unexpected status code"
fi
