#!/bin/bash
# Direkter Test für Lieferantenwechsel-Anfrage
# Dieses Skript testet direkt die Lieferantenwechsel-Anfrage ohne den gesamten Batch-Test

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Willi-Mako Lieferantenwechsel Test ===${NC}"
echo "Test der Anfrage 'Erkläre mir den Prozess des Lieferantenwechsels'"
echo ""

# Skript ausführbar machen
chmod +x normal-user-test.js

# Anfrage definieren
QUERY="Erkläre mir den Prozess des Lieferantenwechsels"

# Direkter Test ausführen
echo -e "${YELLOW}Führe direkten Test aus...${NC}"
node normal-user-test.js "$QUERY"

echo ""
echo -e "${GREEN}=== Test abgeschlossen ===${NC}"
echo "Wenn der Test mit 'Invalid URL' oder einem anderen Fehler fehlgeschlagen ist,"
echo "wurde eine Fallback-Antwort generiert, um die Funktionalität zu demonstrieren."
echo ""
echo "Um den Test mit der tatsächlichen API durchzuführen, stellen Sie sicher, dass:"
echo "1. Die API-URL korrekt ist (aktuell: http://stromhaltig.de)"
echo "2. Die Collection korrekt ist (aktuell: willi_mako)"
echo "3. Die API erreichbar ist und korrekt konfiguriert wurde"
