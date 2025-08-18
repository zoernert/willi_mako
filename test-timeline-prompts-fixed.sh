#!/bin/bash

# Test der verbesserten Timeline-Prompts mit echten Login-Daten
echo "🧪 Test: Verbesserte Timeline-Zusammenfassungen"
echo "=============================================="

# Login mit echten Daten
echo "🔐 Login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3009/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"thorsten.zoerner@stromdao.com","password":"Maus12Rad"}')

echo "Login Response: $LOGIN_RESPONSE"

USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.id')
SESSION_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

echo "User ID: $USER_ID"
echo "Session Token: ${SESSION_TOKEN:0:50}..."

# Hole bestehende Timeline oder erstelle neue
echo ""
echo "📊 Timeline abrufen..."
TIMELINE_RESPONSE=$(curl -s http://localhost:3009/api/timelines \
    -H "Authorization: Bearer $SESSION_TOKEN")

echo "Timeline Response: $TIMELINE_RESPONSE"

TIMELINE_ID=$(echo "$TIMELINE_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$TIMELINE_ID" ] || [ "$TIMELINE_ID" = "null" ]; then
    echo "📝 Erstelle neue Timeline..."
    TIMELINE_CREATE=$(curl -s -X POST http://localhost:3009/api/timelines \
        -H "Authorization: Bearer $SESSION_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"Test Timeline für verbesserte Prompts","description":"Test der neuen LLM-Integration"}')
    
    echo "Timeline Create Response: $TIMELINE_CREATE"
    TIMELINE_ID=$(echo "$TIMELINE_CREATE" | jq -r '.id // empty')
fi

echo "📊 Timeline ID: $TIMELINE_ID"

# Test: Chat-Nachricht über Marktkommunikation erfassen
echo ""
echo "🧪 Test: Chat über Marktkommunikation erfassen"
echo "----------------------------------------------"

CHAT_DATA='{
    "timelineId":"'$TIMELINE_ID'",
    "feature":"chat",
    "activityType":"message",
    "rawData":{
        "chatId":"test-chat-improved",
        "chatTitle":"Messwertclearing: Vorgehen für Lieferanten", 
        "userMessage":"Es geht um Marktkommunikation",
        "assistantMessage":"Okay, im Kontext der Marktkommunikation in der Energiewirtschaft sind folgende Nachrichtenformate besonders wichtig:\n\n1. **MSCONS (Metered Services Consumption):** Dies ist die wichtigste Nachricht für den Austausch von Messwerten. Sie beinhaltet Zählerstände, Lastgänge und andere Verbrauchsdaten. MSCONS-Nachrichten werden zwischen Lieferanten, Netzbetreibern und Messstellenbetreibern ausgetauscht.\n2. **UTILMD (Utility Master Data):** Diese Nachricht dient dem Austausch von Stammdaten, wie z.B. Informationen zu Zählpunkten, Marktlokationen oder Geschäftspartnern. Sie ist entscheidend für die korrekte Zuordnung von Messwerten und die reibungslose Abwicklung von Geschäftsprozessen.\n3. **APERAK (Application Error and Acknowledgement):** APERAK-Nachrichten werden verwendet, um den Empfang und die formale Korrektheit von Nachrichten zu bestätigen oder abzulehnen. Sie dienen der Fehlerbehandlung und stellen sicher, dass Nachrichten korrekt verarbeitet wurden.",
        "messageType":"normal",
        "hasCs30Additional":true,
        "contextSettings":{
            "useWorkspaceOnly":false,
            "workspacePriority":"medium",
            "includeUserDocuments":true,
            "includeUserNotes":true,
            "includeSystemKnowledge":true,
            "includeM2CRoles":true
        },
        "timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
    },
    "priority":5
}'

echo "Chat Data zu senden:"
echo "$CHAT_DATA" | jq '.'

ACTIVITY_RESPONSE=$(curl -s -X POST http://localhost:3009/api/timeline-activity/capture \
    -H "Authorization: Bearer $SESSION_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$CHAT_DATA")

echo ""
echo "Activity Response: $ACTIVITY_RESPONSE"

ACTIVITY_ID=$(echo "$ACTIVITY_RESPONSE" | jq -r '.activityId // empty')
echo "📝 Timeline-Aktivität erstellt: $ACTIVITY_ID"

# Warten auf LLM-Verarbeitung
echo ""
echo "⏳ Warte 30 Sekunden auf LLM-Verarbeitung..."
sleep 30

# Ergebnisse abrufen
echo ""
echo "📊 Timeline-Ergebnisse abrufen..."
echo "================================"

TIMELINE_ACTIVITIES=$(curl -s "http://localhost:3009/api/timelines/$TIMELINE_ID/activities" \
    -H "Authorization: Bearer $SESSION_TOKEN")

echo "Timeline Activities Response:"
echo "$TIMELINE_ACTIVITIES" | jq '.'

echo ""
echo "🔍 Spezifische Aktivität suchen:"
echo "$TIMELINE_ACTIVITIES" | jq --arg id "$ACTIVITY_ID" '.[] | select(.id == $id)'

echo ""
echo "✅ Test abgeschlossen!"
echo ""
echo "🔍 Erwartete Verbesserungen:"
echo "- Titel sollte aussagekräftiger sein (Chat-Titel oder User-Message)"
echo "- Zusammenfassung sollte EDIFACT-Formate spezifisch erwähnen"
echo "- Kontext der Marktkommunikation sollte erkennbar sein"
