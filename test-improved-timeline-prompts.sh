#!/bin/bash

# Test verbesserter Timeline-Prompts für Chat-Nachrichten
# Mit realistischen Marktkommunikations-Daten und echten Login-Daten

echo "🧪 Test: Verbesserte Timeline-Zusammenfassungen für Chat-Nachrichten"
echo "====================================================================="

# Echte Login-Daten
LOGIN_EMAIL="thorsten.zoerner@stromdao.com"
LOGIN_PASSWORD="Maus12Rad"

# Warte auf Backend-Start
echo "⏳ Warte auf Backend-Start..."
for i in {1..30}; do
    if curl -s http://localhost:3009/health >/dev/null 2>&1; then
        echo "✅ Backend ist verfügbar"
        break
    fi
    sleep 2
    if [ $i -eq 30 ]; then
        echo "❌ Backend nicht verfügbar nach 60 Sekunden"
        exit 1
    fi
done

# Login und Timeline-ID holen
echo "🔐 Login und Timeline-Setup..."
USER_RESPONSE=$(curl -s -X POST http://localhost:3009/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$LOGIN_EMAIL\",\"password\":\"$LOGIN_PASSWORD\"}")

USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
SESSION_TOKEN=$(echo "$USER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$USER_ID" ] || [ -z "$SESSION_TOKEN" ]; then
    echo "❌ Login fehlgeschlagen"
    exit 1
fi

# Hole bestehende Timeline oder erstelle neue
TIMELINE_RESPONSE=$(curl -s http://localhost:3009/api/timelines \
    -H "Authorization: Bearer $SESSION_TOKEN")

TIMELINE_ID=$(echo "$TIMELINE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TIMELINE_ID" ]; then
    echo "📝 Erstelle neue Timeline..."
    TIMELINE_CREATE=$(curl -s -X POST http://localhost:3009/api/timelines \
        -H "Authorization: Bearer $SESSION_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"Test Timeline für Chat-Verbesserungen","description":"Test der verbesserten Chat-Zusammenfassungen"}')
    
    TIMELINE_ID=$(echo "$TIMELINE_CREATE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
fi

echo "📊 Timeline ID: $TIMELINE_ID"

# Test 1: Einfache Chat-Nachricht über Marktkommunikation
echo ""
echo "🧪 Test 1: Chat über EDIFACT-Nachrichtenformate"
echo "------------------------------------------------"

CHAT_DATA='{
    "timelineId":"'$TIMELINE_ID'",
    "feature":"chat",
    "activityType":"message",
    "rawData":{
        "chatId":"test-chat-1",
        "chatTitle":"Messwertclearing: Vorgehen für Lieferanten", 
        "userMessage":"Es geht um Marktkommunikation",
        "assistantMessage":"Okay, im Kontext der Marktkommunikation in der Energiewirtschaft sind folgende Nachrichtenformate besonders wichtig:\n\n1. **MSCONS (Metered Services Consumption):** Dies ist die wichtigste Nachricht für den Austausch von Messwerten. Sie beinhaltet Zählerstände, Lastgänge und andere Verbrauchsdaten. MSCONS-Nachrichten werden zwischen Lieferanten, Netzbetreibern und Messstellenbetreibern ausgetauscht.\n2. **UTILMD (Utility Master Data):** Diese Nachricht dient dem Austausch von Stammdaten, wie z.B. Informationen zu Zählpunkten, Marktlokationen oder Geschäftspartnern. Sie ist entscheidend für die korrekte Zuordnung von Messwerten und die reibungslose Abwicklung von Geschäftsprozessen.\n3. **APERAK (Application Error and Acknowledgement):** APERAK-Nachrichten werden verwendet, um den Empfang und die formale Korrektheit von Nachrichten zu bestätigen oder abzulehnen. Sie dienen der Fehlerbehandlung und stellen sicher, dass Nachrichten korrekt verarbeitet wurden.\n4. **CONTRL (Control Report):** Diese Nachricht wird eingesetzt, um Fehler inhaltlicher Art in empfangenen Nachrichten zu melden. Im Gegensatz zu APERAK, das formale Fehler meldet, werden mit CONTRL inhaltliche Fehler (z.B. unplausible Werte, fehlende Informationen) kommuniziert.\n5. **IFTSTA (International Forwarding and Transport Status Message):** Diese Nachricht wird im Kontext von Lieferantenwechselprozessen verwendet, um den Status des Wechsels zu übermitteln. Sie informiert über den Fortschritt des Prozesses und dient der Koordination zwischen den beteiligten Marktpartnern.\n6. **REMADV (Remittance Advice Message):** Diese Nachricht wird für den Austausch von Zahlungsinformationen verwendet, insbesondere im Rahmen der Abrechnung von Netznutzungsentgelten oder anderen Dienstleistungen.\n7. **ORDERS/ORDRSP (Purchase Order/Purchase Order Response):** Diese Nachrichten werden für die Bestellung von Dienstleistungen oder Produkten verwendet, z.B. für die Anforderung von Messwerten oder Stammdaten.\n\nDiese Nachrichtenformate bilden das Rückgrat der Marktkommunikation in der Energiewirtschaft und ermöglichen den standardisierten und automatisierten Datenaustausch zwischen den Marktpartnern. Die korrekte Anwendung und Interpretation dieser Nachrichten ist entscheidend für eine effiziente und fehlerfreie Abwicklung der Geschäftsprozesse.",
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

ACTIVITY_RESPONSE=$(curl -s -X POST http://localhost:3009/api/timeline-activity/capture \
    -H "Authorization: Bearer $SESSION_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$CHAT_DATA")

ACTIVITY_ID=$(echo "$ACTIVITY_RESPONSE" | grep -o '"activityId":"[^"]*"' | cut -d'"' -f4)
echo "📝 Timeline-Aktivität erstellt: $ACTIVITY_ID"

# Test 2: Komplexere Chat-Session über Lieferantenwechsel
echo ""
echo "🧪 Test 2: Chat über Lieferantenwechsel-Prozess" 
echo "-----------------------------------------------"

CHAT_DATA_2='{
    "timelineId":"'$TIMELINE_ID'",
    "feature":"chat", 
    "activityType":"message",
    "rawData":{
        "chatId":"test-chat-2",
        "chatTitle":"Lieferantenwechsel: GPKE-Ablauf bei Problemen",
        "userMessage":"Was mache ich, wenn der Lieferantenwechsel seit 3 Wochen hängt und der neue Lieferant nicht antwortet?",
        "assistantMessage":"Bei einem hängenden Lieferantenwechsel nach 3 Wochen sollten Sie folgende Schritte unternehmen:\n\n**1. Sofortige Prüfungen:**\n- Status im MaKo-System prüfen (IFTSTA-Nachrichten)\n- Letzten Prozessschritt identifizieren\n- Prüfung auf eingegangene APERAK/CONTRL-Meldungen\n\n**2. Kontaktaufnahme:**\n- Direkter Kontakt zum abgebenden Lieferanten\n- Bei Bedarf: Netzbetreiber informieren\n- Dokumentation aller Kommunikation\n\n**3. Eskalation nach GPKE:**\n- Nach 6 Wochen: Formelle Beschwerde möglich\n- BNetzA als letzte Instanz\n- Parallele Prüfung von Schadensersatzansprüchen\n\n**4. Technische Maßnahmen:**\n- IFTSTA-Status erneut senden\n- Wechselauftrag-Duplikat prüfen\n- Bei Systemfehlern: IT-Support einbeziehen\n\n**Wichtig:** Dokumentieren Sie alle Schritte für eventuelle Nachweise bei der Bundesnetzagentur.",
        "messageType":"detailed",
        "contextSettings":{
            "useWorkspaceOnly":true,
            "workspacePriority":"high", 
            "includeUserDocuments":true,
            "includeM2CRoles":true
        },
        "timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
    },
    "priority":3
}'

ACTIVITY_RESPONSE_2=$(curl -s -X POST http://localhost:3009/api/timeline-activity/capture \
    -H "Authorization: Bearer $SESSION_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$CHAT_DATA_2")

ACTIVITY_ID_2=$(echo "$ACTIVITY_RESPONSE_2" | grep -o '"activityId":"[^"]*"' | cut -d'"' -f4)
echo "📝 Timeline-Aktivität 2 erstellt: $ACTIVITY_ID_2"

# Warten auf LLM-Verarbeitung
echo ""
echo "⏳ Warte auf LLM-Verarbeitung (45 Sekunden)..."
sleep 45

# Ergebnisse abrufen
echo ""
echo "📊 Abrufen der Timeline-Ergebnisse..."
echo "===================================="

TIMELINE_ACTIVITIES=$(curl -s "http://localhost:3009/api/timelines/$TIMELINE_ID/activities" \
    -H "Authorization: Bearer $SESSION_TOKEN")

# Zeige die Ergebnisse strukturiert an
echo "$TIMELINE_ACTIVITIES" | jq -r '.[] | select(.id == "'$ACTIVITY_ID'" or .id == "'$ACTIVITY_ID_2'") | 
"
=== TIMELINE-EINTRAG ===
ID: " + .id + "
Titel: " + .title + "
Status: " + .processing_status + "
Erstellt: " + .created_at + "
Verarbeitet: " + (.processed_at // "noch nicht verarbeitet") + "

ZUSAMMENFASSUNG:
" + .content + "
=========================="'

# Final status
echo ""
echo "✅ Test abgeschlossen!"
echo ""
echo "🔍 Verbesserungen erwarten:"
echo "- Titel sollten nun den Chat-Titel oder User-Message enthalten"
echo "- Zusammenfassungen sollten spezifische EDIFACT-Formate erwähnen"
echo "- Kontext der Marktkommunikation sollte besser erfasst werden"
echo "- Handlungsempfehlungen sollten erkennbar sein"
