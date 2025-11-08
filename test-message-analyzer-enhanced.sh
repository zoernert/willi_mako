#!/bin/bash

# Test-Skript für Message Analyzer Enhanced
# Testet die API-Endpunkte mit Beispiel-EDIFACT-Nachrichten

API_BASE="http://localhost:3009/api/message-analyzer"
TOKEN=""  # TODO: Hier ein gültiges Auth-Token einfügen

# Beispiel MSCONS-Nachricht (verkürzt)
MSCONS_MESSAGE='UNH+00000000001111+MSCONS:D:11A:UN:2.6e'
MSCONS_MESSAGE+=$'\n''BGM+E01+1234567890+9'
MSCONS_MESSAGE+=$'\n''DTM+137:20251107:102'
MSCONS_MESSAGE+=$'\n''NAD+MS+++9900123456789::293'
MSCONS_MESSAGE+=$'\n''NAD+MR+++9900987654321::293'
MSCONS_MESSAGE+=$'\n''LIN+1++DE0001234567890123456789012345::Z25'
MSCONS_MESSAGE+=$'\n''QTY+220:1234.567:KWH'
MSCONS_MESSAGE+=$'\n''DTM+163:202511010000:303'
MSCONS_MESSAGE+=$'\n''DTM+164:202511010015:303'
MSCONS_MESSAGE+=$'\n''UNT+9+00000000001111'

echo "==================================="
echo "Message Analyzer Enhanced - Tests"
echo "==================================="
echo ""

# Test 1: Initial Analysis
echo "Test 1: Initiale Analyse"
echo "-------------------------"
curl -X POST "$API_BASE/ai-explanation" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"message\": \"$MSCONS_MESSAGE\"}" \
  | jq '.data.explanation' || echo "❌ Fehler bei initialer Analyse"

echo ""
echo ""

# Test 2: Validation
echo "Test 2: Validierung"
echo "-------------------"
curl -X POST "$API_BASE/validate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"message\": \"$MSCONS_MESSAGE\"}" \
  | jq '.' || echo "❌ Fehler bei Validierung"

echo ""
echo ""

# Test 3: Chat - Frage stellen
echo "Test 3: Chat - Frage stellen"
echo "-----------------------------"
curl -X POST "$API_BASE/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"message\": \"Welche Marktpartner sind in dieser Nachricht beteiligt?\",
    \"chatHistory\": [],
    \"currentEdifactMessage\": \"$MSCONS_MESSAGE\"
  }" \
  | jq '.data.response' || echo "❌ Fehler bei Chat"

echo ""
echo ""

# Test 4: Modification
echo "Test 4: Modifikation"
echo "--------------------"
curl -X POST "$API_BASE/modify" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"instruction\": \"Erhöhe den Verbrauchswert um 10%\",
    \"currentMessage\": \"$MSCONS_MESSAGE\"
  }" \
  | jq '.data.modifiedMessage' || echo "❌ Fehler bei Modifikation"

echo ""
echo ""
echo "==================================="
echo "Tests abgeschlossen"
echo "==================================="
