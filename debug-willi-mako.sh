#!/bin/bash
# Debug-Willi-Mako Wrapper Script
# Provides a convenient way to use the debug-willi-mako-chat-flow.js tool

# Make script executable
chmod +x debug-willi-mako-chat-flow.js

# Function to display help
function show_help {
  echo "Willi Mako Chat Flow Debug Tool"
  echo ""
  echo "Usage: ./debug-willi-mako.sh [options] [\"Anfrage\"]"
  echo ""
  echo "Optionen:"
  echo "  -h, --help           Zeigt diese Hilfeseite an"
  echo "  -v, --verbose        Zeigt detaillierte Debug-Informationen"
  echo "  -i, --inspect        Nur willi_mako Collection inspizieren (keine Anfrageverarbeitung)"
  echo "  -l, --lower-threshold  Niedrigeren Score-Threshold verwenden (0.3 statt 0.6)"
  echo "  -e, --expand-query   Query-Expansion zur Verbesserung der Suchergebnisse nutzen"
  echo "  -s, --sample-points  Beispielpunkte aus der willi_mako Collection extrahieren"
  echo "  -y, --hyde           HyDE (Hypothetical Document Embeddings) für die Suche verwenden"
  echo "  -f, --no-filters     Intelligente Filter deaktivieren"
  echo "  -o, --no-optimizations  Optimierte Suche deaktivieren und Standard-Suche verwenden"
  echo "  -c, --compare        Beide Suchmethoden ausführen und vergleichen"
  echo "  -q, --show-query     Vollständige generierte Anfragen in den Logs anzeigen"
  echo "  -a, --all            Alle Optimierungstechniken verwenden (-l -e -s -y -c -v)"
  echo ""
  echo "Beispiele:"
  echo "  ./debug-willi-mako.sh"
  echo "  ./debug-willi-mako.sh -l -e \"Wie funktioniert der Lieferantenwechsel?\""
  echo "  ./debug-willi-mako.sh -i -s"
  echo "  ./debug-willi-mako.sh -a \"Was ist GPKE?\""
  echo "  ./debug-willi-mako.sh -y -c \"Wie sind die Fristen beim Lieferantenwechsel?\""
}

# Default query if none is provided
DEFAULT_QUERY="Erkläre mir den Prozess des Lieferantenwechsels"

# Parse options
OPTIONS=""
QUERY=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -v|--verbose)
      OPTIONS="$OPTIONS --verbose"
      shift
      ;;
    -i|--inspect)
      OPTIONS="$OPTIONS --inspect-only"
      shift
      ;;
    -l|--lower-threshold)
      OPTIONS="$OPTIONS --lower-threshold"
      shift
      ;;
    -e|--expand-query)
      OPTIONS="$OPTIONS --expand-query"
      shift
      ;;
    -s|--sample-points)
      OPTIONS="$OPTIONS --sample-points"
      shift
      ;;
    -y|--hyde)
      OPTIONS="$OPTIONS --hyde"
      shift
      ;;
    -f|--no-filters)
      OPTIONS="$OPTIONS --no-filters"
      shift
      ;;
    -o|--no-optimizations)
      OPTIONS="$OPTIONS --no-optimizations"
      shift
      ;;
    -c|--compare)
      OPTIONS="$OPTIONS --compare"
      shift
      ;;
    -q|--show-query)
      OPTIONS="$OPTIONS --show-query"
      shift
      ;;
    -a|--all)
      OPTIONS="$OPTIONS --verbose --lower-threshold --expand-query --sample-points --hyde --compare --show-query"
      shift
      ;;
    *)
      QUERY="$1"
      shift
      ;;
  esac
done

# Get query from command line
if [ -z "$QUERY" ] && [[ $OPTIONS != *"--inspect-only"* ]]; then
  QUERY="$DEFAULT_QUERY"
  echo "Keine Anfrage angegeben, verwende Standard-Anfrage: \"$DEFAULT_QUERY\""
fi

# Run the tool
echo "Starte Debug-Tool mit folgenden Optionen: $OPTIONS"
if [ -n "$QUERY" ]; then
  echo "Anfrage: \"$QUERY\""
  node debug-willi-mako-chat-flow.js $OPTIONS "$QUERY"
else
  node debug-willi-mako-chat-flow.js $OPTIONS
fi
