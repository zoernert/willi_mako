#!/bin/bash

# Test FAQ Linking Functionality
echo "=== FAQ Linking Test ==="

# Database connection parameters from .env
DB_HOST="10.0.0.2"
DB_PORT="5117"
DB_NAME="willi_mako"
DB_USER="willi_user"
export PGPASSWORD="willi_password"

echo "1. Testing FAQ Links Schema..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
  f1.title as source_faq,
  fl.term,
  fl.display_text,
  f2.title as target_faq,
  fl.is_automatic
FROM faq_links fl
JOIN faqs f1 ON fl.source_faq_id = f1.id
JOIN faqs f2 ON fl.target_faq_id = f2.id
LIMIT 10;
"

echo -e "\n2. Testing Public FAQs..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
  id,
  title,
  is_public,
  is_active,
  view_count
FROM faqs 
WHERE is_public = true 
ORDER BY view_count DESC 
LIMIT 5;
"

echo -e "\n3. Testing FAQ Linking Statistics..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
  'Total Links' as metric,
  COUNT(*) as value
FROM faq_links
UNION ALL
SELECT 
  'Automatic Links' as metric,
  COUNT(*) as value
FROM faq_links 
WHERE is_automatic = true
UNION ALL
SELECT 
  'Manual Links' as metric,
  COUNT(*) as value
FROM faq_links 
WHERE is_automatic = false;
"

echo -e "\n4. Testing API Endpoints..."
echo "Testing public FAQs endpoint..."
curl -s "http://localhost:3003/api/public/faqs?limit=3" | jq '.success, (.data | length)'

echo -e "\nTesting individual FAQ with links..."
FAQ_ID=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM faqs WHERE is_public = true LIMIT 1;")
FAQ_ID=$(echo $FAQ_ID | tr -d ' ')

if [ ! -z "$FAQ_ID" ]; then
  curl -s "http://localhost:3003/api/faqs/$FAQ_ID" | jq '.success, (.data.linked_terms | length)'
else
  echo "No public FAQs available for testing"
fi

echo -e "\n5. Testing FAQ Admin API..."
echo "Testing admin FAQ fields..."
PGPASSWORD="willi_password" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
  id,
  title,
  CASE WHEN description IS NOT NULL AND description != '' THEN 'HAS_VALUE' ELSE 'EMPTY' END as description_status,
  CASE WHEN context IS NOT NULL AND context != '' THEN 'HAS_VALUE' ELSE 'EMPTY' END as context_status,
  CASE WHEN answer IS NOT NULL AND answer != '' THEN 'HAS_VALUE' ELSE 'EMPTY' END as answer_status,
  CASE WHEN additional_info IS NOT NULL AND additional_info != '' THEN 'HAS_VALUE' ELSE 'EMPTY' END as additional_info_status
FROM faqs 
WHERE is_public = true 
LIMIT 3;
"

echo -e "\n6. Testing Admin API Response..."
echo "Testing if Admin API returns all fields correctly..."
FAQ_ID=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM faqs WHERE is_public = true LIMIT 1;")
FAQ_ID=$(echo $FAQ_ID | tr -d ' ')

if [ ! -z "$FAQ_ID" ]; then
  echo "Testing with FAQ ID: $FAQ_ID"
  # Test requires admin token - this would normally be done with a valid bearer token
  echo "Note: Admin API test requires valid Bearer token for authentication"
  echo "Expected format: curl -H 'Authorization: Bearer <token>' http://localhost:3003/api/admin/faqs"
else
  echo "No FAQs available for testing"
fi

echo -e "\n=== Test completed ==="

echo -e "\n6. Testing Admin API with Bearer Token..."
echo "Testing admin FAQ API authentication and response structure..."
# Note: This test requires a valid Bearer token
BEARER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjNhODUxNjIyLTA4NTgtNGViMC1iMWVhLTEzYzM1NGM4N2JiZSIsImVtYWlsIjoidGhvcnN0ZW4uem9lcm5lckBzdHJvbWRhby5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTM2MzgyOTQsImV4cCI6MTc1MzcyNDY5NH0.HlRak1NzmSePFLeS4yxK0y5wPJ29GKLul1yv6vQeWBY"

echo "Getting first FAQ from admin API..."
FIRST_FAQ=$(curl -H "Authorization: Bearer $BEARER_TOKEN" -s "http://localhost:3003/api/admin/faqs" | jq -r '.data[0]')
echo "Sample FAQ fields structure:"
echo $FIRST_FAQ | jq 'keys'

echo -e "\nChecking if all required fields are present..."
echo $FIRST_FAQ | jq -r 'if .description and .context and .answer and .additional_info then "✓ All fields present" else "✗ Missing fields" end'

echo -e "\n=== Test completed ==="
