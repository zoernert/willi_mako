#!/bin/bash
# Test script for market role filter in market partner search

BASE_URL="${BASE_URL:-http://localhost:3003}"
API_V2_URL="${BASE_URL}/api/v2/market-partners/search"
API_PUBLIC_URL="${BASE_URL}/api/public/market-partners/search"
API_V1_URL="${BASE_URL}/api/v1/codes/search"

echo "=== Testing Market Role Filter ==="
echo ""

# Test 1: Search for all Verteilnetzbetreiber (VNB) via API v2
echo "Test 1: Search for all Verteilnetzbetreiber (VNB) via API v2"
echo "Request: GET ${API_V2_URL}?q=&role=VNB&limit=5"
curl -s "${API_V2_URL}?q=&role=VNB&limit=5" | jq '.' || echo "Failed"
echo ""
echo "---"
echo ""

# Test 2: Search for Verteilnetzbetreiber with keyword via API v2
echo "Test 2: Search for 'Stadtwerke' with role=VNB via API v2"
echo "Request: GET ${API_V2_URL}?q=Stadtwerke&role=VNB&limit=5"
curl -s "${API_V2_URL}?q=Stadtwerke&role=VNB&limit=5" | jq '.' || echo "Failed"
echo ""
echo "---"
echo ""

# Test 3: Search for Lieferanten (LF) via API v2
echo "Test 3: Search for all Lieferanten (LF) via API v2"
echo "Request: GET ${API_V2_URL}?q=&role=LF&limit=5"
curl -s "${API_V2_URL}?q=&role=LF&limit=5" | jq '.' || echo "Failed"
echo ""
echo "---"
echo ""

# Test 4: Search for Messstellenbetreiber (MSB) via API v2
echo "Test 4: Search for all Messstellenbetreiber (MSB) via API v2"
echo "Request: GET ${API_V2_URL}?q=&role=MSB&limit=5"
curl -s "${API_V2_URL}?q=&role=MSB&limit=5" | jq '.' || echo "Failed"
echo ""
echo "---"
echo ""

# Test 5: Search via public API with role filter
echo "Test 5: Search via public API with role=VNB"
echo "Request: GET ${API_PUBLIC_URL}?q=Netz&role=VNB&limit=5"
curl -s "${API_PUBLIC_URL}?q=Netz&role=VNB&limit=5" | jq '.' || echo "Failed"
echo ""
echo "---"
echo ""

# Test 6: Search via v1 API with role filter (authenticated endpoint - may need auth)
echo "Test 6: Search via v1 API with role=VNB (may require authentication)"
echo "Request: GET ${API_V1_URL}?q=Energie&role=VNB&limit=5"
echo "Note: This endpoint requires authentication, will likely fail without token"
curl -s "${API_V1_URL}?q=Energie&role=VNB&limit=5" | jq '.' || echo "Failed (expected without auth token)"
echo ""
echo "---"
echo ""

# Test 7: Check OpenAPI documentation
echo "Test 7: Check OpenAPI documentation for new parameter"
echo "Request: GET ${BASE_URL}/api/v2/openapi"
curl -s "${BASE_URL}/api/v2/openapi" | jq '.paths["/market-partners/search"].get.parameters[] | select(.name == "role")' || echo "Failed"
echo ""

echo "=== Tests completed ==="
