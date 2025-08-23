#!/bin/bash
# Willi-Mako Chat Test Suite
# 
# This script runs the entire test suite and analyzes the results.
# It includes installation of dependencies, running tests, and analyzing logs.

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Banner
echo -e "${YELLOW}"
echo "=============================================="
echo "Willi-Mako Chat Test Suite"
echo "=============================================="
echo -e "${NC}"

# Step 1: Check if dependencies are installed
echo -e "${YELLOW}Step 1: Checking dependencies...${NC}"

# Check if node and npm are installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js and try again.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js and npm are installed.${NC}"

# Check if required npm packages are installed
echo -e "${YELLOW}Installing required npm packages...${NC}"
npm install --save-dev axios commander dotenv

echo -e "${GREEN}✓ Dependencies installed successfully.${NC}"

# Step 2: Check if credentials are valid
echo -e "\n${YELLOW}Step 2: Validating API credentials...${NC}"
echo -e "Using default credentials:"
echo -e "  Email: kontakt+demo@stromdao.com"
echo -e "  Password: willi.mako"
echo -e "  API URL: https://stromhaltig.de/api"

# Simple API test
TOKEN_RESPONSE=$(curl -s -X POST https://stromhaltig.de/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"kontakt+demo@stromdao.com","password":"willi.mako"}')

# Check if token was received
if echo "$TOKEN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✓ API credentials are valid.${NC}"
    # Extract the token
    TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
    echo -e "${GREEN}✓ Bearer token obtained successfully.${NC}"
else
    echo -e "${RED}✗ API credentials are invalid or the API is unavailable.${NC}"
    echo "$TOKEN_RESPONSE"
    read -p "Do you want to continue with the test suite? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 3: Check if test-queries.json exists
echo -e "\n${YELLOW}Step 3: Checking test queries...${NC}"

if [ ! -f ./test-queries.json ]; then
    echo -e "${YELLOW}test-queries.json not found. Creating a sample file...${NC}"
    cat > test-queries.json << EOL
[
  "Wie lege ich einen neuen Vertrag in CS30 an?",
  "Was bedeutet GPKE?",
  "Wie melde ich einen Zählerwechsel?",
  "Was bedeutet die Fehlermeldung E225?",
  "Erkläre mir den Prozess des Lieferantenwechsels",
  "Was sind die Fristen bei der Marktkommunikation?",
  "Wie funktioniert die Bilanzkreisabrechnung?",
  "Was ist ein OBIS-Code?",
  "Erkläre den UTILMD-Prozess",
  "Was bedeutet der MaKo 2022?",
  "Welche Informationen enthält eine Z01-Nachricht?",
  "Wie funktioniert die Fallgruppe 1a?",
  "Was ist ein MSB?",
  "Wie erfolgt die Meldung eines Einzugs?",
  "Was sind die Aufgaben eines Netzbetreibers?"
]
EOL
    echo -e "${GREEN}✓ Sample test-queries.json created.${NC}"
else
    echo -e "${GREEN}✓ test-queries.json found.${NC}"
    # Count the number of queries
    NUM_QUERIES=$(grep -o '"' ./test-queries.json | wc -l)
    NUM_QUERIES=$((NUM_QUERIES / 2))
    echo -e "${GREEN}✓ Found ${NUM_QUERIES} queries to test.${NC}"
fi

# Step 4: Create logs directory if it doesn't exist
echo -e "\n${YELLOW}Step 4: Setting up log directory...${NC}"
mkdir -p logs
echo -e "${GREEN}✓ Log directory created.${NC}"

# Step 5: Run tests
echo -e "\n${YELLOW}Step 5: Running tests...${NC}"
echo -e "${YELLOW}This may take a while depending on the number of queries and API response time.${NC}"

# Run the script with the test queries
./willi-mako-chat-test.js --file test-queries.json --verbose

echo -e "\n${GREEN}✓ All tests completed successfully.${NC}"

# Step 6: Analyze logs
echo -e "\n${YELLOW}Step 6: Analyzing logs...${NC}"

# Run the log analyzer script
./analyze-chat-logs.js --latest

echo -e "\n${GREEN}✓ Log analysis completed.${NC}"

# Step 7: Summary
echo -e "\n${YELLOW}Step 7: Summary${NC}"
echo -e "${GREEN}The Willi-Mako Chat Test Suite has completed.${NC}"
echo -e "${YELLOW}Check the logs directory for detailed logs.${NC}"
echo -e "${YELLOW}You can use the following tools for further analysis:${NC}"
echo -e "  - ./analyze-chat-logs.js --all        # Analyze all log files"
echo -e "  - ./analyze-chat-logs.js --latest     # Analyze the latest log file"
echo -e "  - ./willi-mako-chat-test.js -i        # Run in interactive mode"
echo -e "  - ./willi-mako-chat-test.js --help    # Show all available options"
echo -e "\n${GREEN}Thank you for using the Willi-Mako Chat Test Suite!${NC}"
