#!/bin/bash
# Flow-Debug Wrapper Script
# Provides a convenient way to use the flow-debug.js tool to visualize CS30 chat flow debug data

# Make script executable
chmod +x flow-debug.js

# Function to display help
function show_help {
  echo "CS30 Flow Debug Visualization Tool"
  echo ""
  echo "Usage: ./flow-debug.sh [options] [debug-file.json]"
  echo ""
  echo "Optionen:"
  echo "  -h, --help           Zeigt diese Hilfeseite an"
  echo "  -f, --format FORMAT  Ausgabeformat: html, markdown oder json (Standard: html)"
  echo "  -n, --no-timing      Deaktiviert die Anzeige von Timing-Metriken"
  echo "  -d, --no-diagram     Deaktiviert die Generierung des Flow-Diagramms"
  echo "  -c, --compare FILE   Vergleicht mit einer Baseline-Datei"
  echo "  -m, --no-metrics     Deaktiviert die Einbettung von Performance-Metriken"
  echo "  -l, --latest         Verwendet die neueste Debug-Datei (Standard)"
  echo ""
  echo "Beispiele:"
  echo "  ./flow-debug.sh                            # Verwendet die neueste Debug-Datei"
  echo "  ./flow-debug.sh -f markdown                # Ausgabe als Markdown"
  echo "  ./flow-debug.sh -c debug-logs/baseline.json debug-logs/test.json"
  echo "  ./flow-debug.sh -n -d                      # Ohne Timing und Diagramm"
}

# Parse options
OPTIONS=""
DEBUG_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -f|--format)
      if [ -z "$2" ] || [[ "$2" == -* ]]; then
        echo "Fehler: Format muss angegeben werden"
        exit 1
      fi
      OPTIONS="$OPTIONS --format $2"
      shift 2
      ;;
    -n|--no-timing)
      OPTIONS="$OPTIONS --no-timing"
      shift
      ;;
    -d|--no-diagram)
      OPTIONS="$OPTIONS --no-diagram"
      shift
      ;;
    -c|--compare)
      if [ -z "$2" ] || [[ "$2" == -* ]]; then
        OPTIONS="$OPTIONS --compare"
        shift
      else
        OPTIONS="$OPTIONS --compare $2"
        shift 2
      fi
      ;;
    -m|--no-metrics)
      OPTIONS="$OPTIONS --no-metrics"
      shift
      ;;
    -l|--latest)
      # Latest is default behavior
      shift
      ;;
    *)
      # If not an option, it must be the debug file
      DEBUG_FILE="$1"
      shift
      ;;
  esac
done

# Run the tool
echo "Starte Flow-Debug-Tool mit folgenden Optionen: $OPTIONS"
if [ -n "$DEBUG_FILE" ]; then
  echo "Debug-Datei: $DEBUG_FILE"
  node flow-debug.js $OPTIONS "$DEBUG_FILE"
else
  echo "Verwende die neueste Debug-Datei"
  node flow-debug.js $OPTIONS
fi
