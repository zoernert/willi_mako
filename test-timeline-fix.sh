#!/bin/bash

echo "🔧 Testing Timeline System Fixes"
echo "================================"

# Basis-URL und Credentials
BASE_URL="http://localhost:3009"
EMAIL="test@stromhaltig.de"
PASSWORD="test123"

echo "1. Login und Session Token holen..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
  echo "✅ Login erfolgreich - Token erhalten"
else
  echo "❌ Login fehlgeschlagen:"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo ""
echo "2. Aktive Timeline abrufen..."
TIMELINES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/timelines" \
  -H "Authorization: Bearer $TOKEN")

TIMELINE_ID=$(echo "$TIMELINES_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$TIMELINE_ID" ]; then
  echo "⚠️ Keine aktive Timeline gefunden, erstelle neue..."
  
  CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/timelines" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Timeline JSON Fixes","description":"Test für JSON-Parsing-Fixes"}')
  
  TIMELINE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id')
  echo "✅ Neue Timeline erstellt: $TIMELINE_ID"
else
  echo "✅ Aktive Timeline gefunden: $TIMELINE_ID"
fi

echo ""
echo "3. Timeline-Activity-Capture testen..."
ACTIVITY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/timeline-activity/capture" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"timelineId\": \"$TIMELINE_ID\",
    \"feature\": \"chat\",
    \"activityType\": \"test_message\",
    \"rawData\": {
      \"message\": \"Dies ist eine Testnachricht für die Timeline\",
      \"response\": \"LLM-Antwort für JSON-Parsing-Test\",
      \"timestamp\": \"$(date -Iseconds)\"
    }
  }")

if echo "$ACTIVITY_RESPONSE" | grep -q '"success"'; then
  ACTIVITY_ID=$(echo "$ACTIVITY_RESPONSE" | jq -r '.activityId')
  echo "✅ Timeline-Activity erfolgreich erfasst: $ACTIVITY_ID"
else
  echo "❌ Timeline-Activity-Capture fehlgeschlagen:"
  echo "$ACTIVITY_RESPONSE"
fi

echo ""
echo "4. Warte 10 Sekunden auf Background-Processing..."
sleep 10

echo ""
echo "5. Timeline-Activities abrufen und Status prüfen..."
ACTIVITIES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/timelines/$TIMELINE_ID/activities" \
  -H "Authorization: Bearer $TOKEN")

echo "Letzte Activities:"
echo "$ACTIVITIES_RESPONSE" | jq '.[] | {id: .id, title: .title, status: .processing_status, created: .created_at}' | head -5

# Nach LLM-verarbeiteten Einträgen suchen
COMPLETED_COUNT=$(echo "$ACTIVITIES_RESPONSE" | jq '[.[] | select(.processing_status == "completed")] | length')
PENDING_COUNT=$(echo "$ACTIVITIES_RESPONSE" | jq '[.[] | select(.processing_status == "pending")] | length')
FAILED_COUNT=$(echo "$ACTIVITIES_RESPONSE" | jq '[.[] | select(.processing_status == "failed")] | length')

echo ""
echo "📊 Verarbeitungsstatus:"
echo "   ✅ Abgeschlossen: $COMPLETED_COUNT"
echo "   ⏳ Ausstehend: $PENDING_COUNT"
echo "   ❌ Fehlgeschlagen: $FAILED_COUNT"

echo ""
echo "6. Background Worker Logs prüfen..."
echo "Die letzten Timeline-relevanten Logs:"
tail -20 /config/Development/willi_mako/server.log | grep -i timeline || echo "Keine Timeline-Logs in server.log gefunden"

echo ""
echo "🎯 Test abgeschlossen!"
echo "Falls noch Fehler auftreten, prüfen Sie die Logs mit: tail -f server.log | grep timeline"
