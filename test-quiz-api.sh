#!/bin/bash

# Test script for Quiz API endpoints
# Run this after starting the server

BASE_URL="http://localhost:3003/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Testing Quiz API Endpoints${NC}"
echo "================================="

# Test 1: Health Check
echo -e "\n${YELLOW}1. Testing Health Check${NC}"
curl -s "$BASE_URL/health" | jq .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
fi

# Test 2: Get available quizzes (requires auth)
echo -e "\n${YELLOW}2. Testing Get Available Quizzes${NC}"
echo "Note: This requires authentication token"
echo "curl -H \"Authorization: Bearer <token>\" $BASE_URL/quiz/quizzes"

# Test 3: Generate quiz from FAQs (requires auth)
echo -e "\n${YELLOW}3. Testing Generate Quiz from FAQs${NC}"
echo "Note: This requires authentication token"
echo "curl -X POST -H \"Authorization: Bearer <token>\" -H \"Content-Type: application/json\" -d '{\"topicArea\": \"Energie\", \"difficulty\": \"medium\", \"questionCount\": 3}' $BASE_URL/quiz/quizzes/generate"

# Test 4: Get leaderboard (requires auth)
echo -e "\n${YELLOW}4. Testing Get Leaderboard${NC}"
echo "Note: This requires authentication token"
echo "curl -H \"Authorization: Bearer <token>\" $BASE_URL/quiz/leaderboard"

# Test 5: Database connectivity test
echo -e "\n${YELLOW}5. Testing Database Connectivity${NC}"
PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'quiz%';"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
fi

# Test 6: Check if quiz tables exist
echo -e "\n${YELLOW}6. Checking Quiz Tables${NC}"
PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "
SELECT 
    'quizzes' as table_name, 
    COUNT(*) as row_count 
FROM quizzes
UNION ALL
SELECT 
    'quiz_questions' as table_name, 
    COUNT(*) as row_count 
FROM quiz_questions
UNION ALL
SELECT 
    'user_quiz_attempts' as table_name, 
    COUNT(*) as row_count 
FROM user_quiz_attempts
UNION ALL
SELECT 
    'user_points' as table_name, 
    COUNT(*) as row_count 
FROM user_points
UNION ALL
SELECT 
    'user_expertise' as table_name, 
    COUNT(*) as row_count 
FROM user_expertise
UNION ALL
SELECT 
    'leaderboard' as table_name, 
    COUNT(*) as row_count 
FROM leaderboard;
"

echo -e "\n${GREEN}✅ Quiz system database schema ready!${NC}"
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "1. Start the server: npm run dev"
echo "2. Get an authentication token by logging in"
echo "3. Test the API endpoints with the token"
echo "4. Access the Quiz Dashboard at: http://localhost:3003/quiz"
