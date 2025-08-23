#!/bin/bash
# Test-Script für den Willi-Mako-Light API Service

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Service-URL
API_URL="http://localhost:3719"

echo -e "${GREEN}=== Willi-Mako-Light API Test ===${NC}"

# Funktion zum Ausführen eines Curl-Befehls und Formatieren der Ausgabe
function run_test() {
  local title=$1
  local command=$2
  
  echo -e "${YELLOW}=== $title ===${NC}"
  echo -e "${BLUE}Befehl: $command${NC}"
  echo -e "${YELLOW}Ergebnis:${NC}"
  
  # Befehl ausführen und Ausgabe speichern
  response=$(eval $command)
  
  # JSON formatieren, wenn jq installiert ist, ansonsten Rohdaten ausgeben
  if command -v jq >/dev/null 2>&1; then
    echo $response | jq
  else
    echo $response
  fi
  
  echo ""
}

# Test 1: API-Status abrufen
run_test "API-Status" "curl -s $API_URL"

# Test 2: Chat-Anfrage mit GET
run_test "Chat-Anfrage (GET)" "curl -s \"$API_URL/chat/query/Was%20bedeutet%20GPKE?\""

# Test 3: Chat-Anfrage mit POST
run_test "Chat-Anfrage (POST)" "curl -s -X POST -H \"Content-Type: application/json\" -d '{\"query\":\"Was bedeutet MaKo 2022?\"}' $API_URL/chat"

# Test 4: Chat-Anfrage mit POST im Frontend-Format
run_test "Chat-Anfrage (Frontend-Format)" "curl -s -X POST -H \"Content-Type: application/json\" -d '{\"content\":\"Was ist MSCONS?\",\"contextSettings\":{\"useWorkspaceOnly\":false,\"workspacePriority\":\"medium\",\"includeUserDocuments\":true,\"includeUserNotes\":true,\"includeSystemKnowledge\":true,\"includeM2CRoles\":true}}' $API_URL/chat"

# Test 5: Fehlerfall (leere Anfrage)
run_test "Fehlerfall (leere Anfrage)" "curl -s -X POST -H \"Content-Type: application/json\" -d '{}' $API_URL/chat"

# Test 5: Logs abrufen
run_test "Logs abrufen" "curl -s $API_URL/logs"

# Test 6: Logs eines Tages abrufen (aktueller Tag)
current_date=$(date +"%Y-%m-%d")
run_test "Logs des aktuellen Tages" "curl -s $API_URL/logs/$current_date"

echo -e "${GREEN}=== Tests abgeschlossen ===${NC}"
