#!/bin/bash
# Run all test queries and generate a comprehensive debug log

echo "Running all test queries from test-queries.json..."

# Check if the script and file exist
if [ ! -f ./willi-mako-chat-test.js ]; then
  echo "Error: willi-mako-chat-test.js not found."
  echo "Please run the install script first: ./install-chat-test.sh"
  exit 1
fi

if [ ! -f ./test-queries.json ]; then
  echo "Error: test-queries.json not found."
  echo "Creating a sample test-queries.json file..."
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
  "Was bedeutet der MaKo 2022?"
]
EOL
  echo "Sample test-queries.json created."
fi

# Run the test script with verbose output
./willi-mako-chat-test.js --file test-queries.json --verbose

echo ""
echo "Test completed. Debug logs are available in the logs directory."
echo "You can view the logs to analyze system performance and response quality."
