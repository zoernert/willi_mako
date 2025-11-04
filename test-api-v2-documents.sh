#!/bin/bash

# Test ob API v2 documents Route verfügbar ist

echo "Testing API v2 documents endpoint..."
echo ""

# Test 1: Check if /api/v2/openapi.json lists documents
echo "1. Checking OpenAPI spec for documents endpoints..."
curl -s http://localhost:3009/api/v2/openapi.json | jq -r '.paths | keys | .[]' | grep documents || echo "❌ No documents endpoints in OpenAPI"

echo ""
echo "2. Testing GET /api/v2/documents (should require auth)..."
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:3009/api/v2/documents

echo ""
echo "3. Testing POST /api/v2/documents/upload (should require auth)..."
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST http://localhost:3009/api/v2/documents/upload

echo ""
echo "Done!"
