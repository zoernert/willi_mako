#!/bin/bash

echo "🧪 Testing API v2 Documents Endpoints on Production..."
echo ""

BASE_URL="http://10.0.0.2:4101"

# First get a token
echo "1. Getting authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v2/auth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "thorsten.zoerner@stromdao.com",
    "password": "PASSWORD_HERE"
  }')

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.data.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token!"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi

echo "✅ Got token: ${TOKEN:0:20}..."
echo ""

# Test OpenAPI
echo "2. Checking OpenAPI spec for documents endpoints..."
OPENAPI_PATHS=$(curl -s "$BASE_URL/api/v2/openapi.json" | jq -r '.paths | keys[]' | grep documents)
if [ -z "$OPENAPI_PATHS" ]; then
  echo "❌ No documents endpoints in OpenAPI"
else
  echo "✅ Found documents endpoints:"
  echo "$OPENAPI_PATHS"
fi
echo ""

# Test GET /documents
echo "3. Testing GET /api/v2/documents..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/v2/documents" | jq '.'
echo ""

# Test POST /documents/upload (without file, should return error)
echo "4. Testing POST /api/v2/documents/upload (without file, expecting error)..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/v2/documents/upload"
echo ""

echo "✅ Tests completed!"
echo ""
echo "To test actual file upload, use:"
echo "  curl -X POST $BASE_URL/api/v2/documents/upload \\"
echo "    -H \"Authorization: Bearer YOUR_TOKEN\" \\"
echo "    -F \"file=@yourfile.pdf\" \\"
echo "    -F \"is_ai_context_enabled=true\""
