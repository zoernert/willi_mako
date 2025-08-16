#!/bin/bash

# Test für Screenshot-Analyse API

echo "🧪 Testing Screenshot Analysis API..."

# Test 1: Next.js API Route
echo "📋 Testing Next.js API route..."
curl -X POST http://localhost:3003/api/analyze-screenshot \
  -H "Content-Type: multipart/form-data" \
  -F "image=@test-screenshot.png" \
  -w "\nResponse Status: %{http_code}\n"

echo ""

# Test 2: Express.js API Route
echo "📋 Testing Express.js API route..."
curl -X POST http://localhost:3009/api/analyze-screenshot \
  -H "Content-Type: multipart/form-data" \
  -F "image=@test-screenshot.png" \
  -w "\nResponse Status: %{http_code}\n"

echo ""

# Test 3: Fehlerfall ohne Bild
echo "📋 Testing error case (no image)..."
curl -X POST http://localhost:3003/api/analyze-screenshot \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nResponse Status: %{http_code}\n"

echo ""

echo "✅ Screenshot Analysis API tests completed"
