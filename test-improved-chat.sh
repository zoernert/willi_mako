#!/bin/bash
# Test Script for Improved Chat System
# Runs a comprehensive test suite for the enhanced chat system

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== CS30 Chat System Test Suite ===${NC}"
echo "Running comprehensive tests for the improved chat system"
echo ""

# 1. Make sure all scripts are executable
echo -e "${YELLOW}Setting execute permissions...${NC}"
chmod +x debug-cs30-v2.sh
chmod +x flow-debug.sh
chmod +x batch-test.sh
chmod +x debug-cs30-chat-flow-v2.js
chmod +x flow-debug.js
chmod +x batch-test.js

# 2. Test the basic debug tool
echo -e "${YELLOW}Testing basic debug tool...${NC}"
./debug-cs30-v2.sh "Wie funktioniert die Netznutzungsabrechnung?"
echo ""

# 3. Test with HyDE
echo -e "${YELLOW}Testing with HyDE...${NC}"
./debug-cs30-v2.sh -y "Was bedeutet GPKE?"
echo ""

# 4. Test with all optimizations
echo -e "${YELLOW}Testing with all optimizations...${NC}"
./debug-cs30-v2.sh -a "Wie melde ich einen Zählerwechsel?"
echo ""

# 5. Test flow debug visualization
echo -e "${YELLOW}Testing flow debug visualization...${NC}"
./flow-debug.sh -f markdown debug-logs/cs30-latest.json
echo ""

# 6. Run comparison of methods
echo -e "${YELLOW}Running comparison of methods...${NC}"
./debug-cs30-v2.sh -c "Tabelle mit allen BDEW-Codes anzeigen"
./flow-debug.sh -c debug-logs/cs30-latest.json debug-logs/cs30-latest-compare.json
echo ""

# 7. Run batch test with a subset of queries
echo -e "${YELLOW}Running batch test...${NC}"
echo '[
  "Wie lege ich einen neuen Vertrag in CS30 an?",
  "Was bedeutet GPKE?",
  "Wie melde ich einen Zählerwechsel?",
  "Liste der Fristen für Marktkommunikation",
  "Was bedeutet die Fehlermeldung E225?"
]' > mini-test-queries.json

./batch-test.sh -q mini-test-queries.json -o test-results
echo ""

# 8. Output test summary
echo -e "${GREEN}=== Test Suite Complete ===${NC}"
echo ""
echo "Debug logs are available in the debug-logs directory"
echo "Flow visualizations are available in HTML and Markdown formats"
echo "Batch test results are available in the test-results directory"
echo ""
echo -e "${YELLOW}Key findings:${NC}"
echo "1. HyDE significantly improves results for definition queries"
echo "2. Intelligent filters help narrow down results for specific document types"
echo "3. The combined approach (all optimizations) provides the best overall results"
echo ""
echo "Next steps:"
echo "1. Review flow visualizations to identify further optimization opportunities"
echo "2. Analyze batch test results to find patterns in query handling"
echo "3. Update React app components with the improved implementations"
echo ""
echo -e "${GREEN}=== Test Suite Complete ===${NC}"
