#!/bin/bash
# Batch-Test Wrapper Script
# Provides a convenient way to test chat flows with both CS30 and willi_mako collections

# Make script executable
chmod +x batch-test.js

# Function to display help
function show_help {
  echo "Willi Mako Chat Flow Batch Testing Tool"
  echo ""
  echo "Usage: ./batch-test.sh [optionen]"
  echo ""
  echo "Optionen:"
  echo "  -h, --help             Zeigt diese Hilfeseite an"
  echo "  -q, --queries FILE     JSON-Datei mit Testanfragen (Standard: test-queries.json)"
  echo "  -o, --output DIR       Ausgabeverzeichnis für Debug-Logs (Standard: debug-logs)"
  echo "  -c, --create-queries   Erstellt eine Standard-Testanfragen-Datei"
  echo "  -n, --normal-user      Direkter Test mit der willi_mako Collection (statt cs30)"
  echo ""
  echo "Beispiele:"
  echo "  ./batch-test.sh                      # Direkter Test mit CS30 Collection"
  echo "  ./batch-test.sh -q custom-queries.json"
  echo "  ./batch-test.sh -c                   # Erstellt test-queries.json"
  echo "  ./batch-test.sh -n                   # Direkter Test mit Willi Mako Collection"
  echo "  ./batch-test.sh -n -q user-queries.json"
}

# Parse options
OPTIONS=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -q|--queries)
      if [ -z "$2" ] || [[ "$2" == -* ]]; then
        echo "Fehler: Anfragedatei muss angegeben werden"
        exit 1
      fi
      OPTIONS="$OPTIONS --queries $2"
      shift 2
      ;;
    -o|--output)
      if [ -z "$2" ] || [[ "$2" == -* ]]; then
        echo "Fehler: Ausgabeverzeichnis muss angegeben werden"
        exit 1
      fi
      OPTIONS="$OPTIONS --output $2"
      shift 2
      ;;
    -n|--normal-user)
      OPTIONS="$OPTIONS --normal-user"
      shift
      ;;
    -c|--create-queries)
      # Just create the queries file
      node batch-test.js --help > /dev/null
      echo "Standard-Testanfragen wurden erstellt"
      exit 0
      ;;
    *)
      echo "Unbekannte Option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Run the tool
echo "Starte Batch-Test mit folgenden Optionen: $OPTIONS"
node batch-test.js $OPTIONS
