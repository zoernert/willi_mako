#!/bin/bash
# Script to run the CS30 chat flow debug tool

# Set executable permission if not already set
chmod +x debug-cs30-chat-flow.js

# Function to display help
show_help() {
  echo "CS30 Chat Flow Debug Tool"
  echo "========================="
  echo ""
  echo "Usage: ./debug-cs30.sh [options] [query]"
  echo ""
  echo "Options:"
  echo "  -h, --help            Show this help message"
  echo "  -v, --verbose         Show detailed debug information"
  echo "  -i, --inspect         Only inspect the CS30 collection (no query processing)"
  echo "  -l, --lower-threshold Use a lower score threshold (0.3 instead of 0.6)"
  echo "  -e, --expand-query    Use query expansion to improve search results"
  echo "  -s, --sample-points   Extract sample points from the CS30 collection"
  echo "  -a, --all             Use all optimization techniques (-l -e -s)"
  echo ""
  echo "Examples:"
  echo "  ./debug-cs30.sh"
  echo "    Run with default query"
  echo ""
  echo "  ./debug-cs30.sh -l -e \"Wie lege ich einen Vertrag an?\""
  echo "    Run with custom query, lower threshold and query expansion"
  echo ""
  echo "  ./debug-cs30.sh -i -s"
  echo "    Only inspect the CS30 collection and show sample points"
  echo ""
  echo "  ./debug-cs30.sh -a \"Wo finde ich den Menüpunkt für Vertragsanlagen?\""
  echo "    Run with all optimization techniques"
}

# Process arguments
OPTIONS=""
QUERY=""
INSPECT_MODE=false

for arg in "$@"; do
  case $arg in
    -h|--help)
      show_help
      exit 0
      ;;
    -v|--verbose)
      OPTIONS="$OPTIONS --verbose"
      ;;
    -i|--inspect)
      OPTIONS="$OPTIONS --inspect-only"
      INSPECT_MODE=true
      ;;
    -l|--lower-threshold)
      OPTIONS="$OPTIONS --lower-threshold"
      ;;
    -e|--expand-query)
      OPTIONS="$OPTIONS --expand-query"
      ;;
    -s|--sample-points)
      OPTIONS="$OPTIONS --sample-points"
      ;;
    -a|--all)
      OPTIONS="$OPTIONS --lower-threshold --expand-query --sample-points --verbose"
      ;;
    -*)
      echo "Unknown option: $arg"
      show_help
      exit 1
      ;;
    *)
      QUERY="$QUERY $arg"
      ;;
  esac
done

# Run the debug script
if [ "$INSPECT_MODE" = true ]; then
  echo "Running in inspection mode..."
  node debug-cs30-chat-flow.js $OPTIONS
else
  if [ -z "$QUERY" ]; then
    echo "Using default query..."
  else
    echo "Using custom query: $QUERY"
  fi
  node debug-cs30-chat-flow.js $OPTIONS $QUERY
fi

# Display the most recent debug file
if [ "$INSPECT_MODE" = true ]; then
  LATEST_DEBUG=$(ls -t debug-logs/cs30-*-inspection.json 2>/dev/null | head -n 1)
else
  LATEST_DEBUG=$(ls -t debug-logs/cs30-*-debug.json 2>/dev/null | head -n 1)
fi

if [ -n "$LATEST_DEBUG" ]; then
  echo ""
  echo "View the latest debug file with:"
  echo "cat $LATEST_DEBUG | jq"
  echo ""
  echo "Or open it in your editor with:"
  echo "code $LATEST_DEBUG"
fi
