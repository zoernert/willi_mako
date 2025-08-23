#!/bin/bash
# Einfache Beispiele für die Verwendung der Willi-Mako-Light API mit curl

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Willi-Mako-Light API Beispiele ===${NC}"
echo ""

echo -e "${YELLOW}Beispiel 1: API-Status abrufen${NC}"
echo "curl http://localhost:3719/"
echo ""

echo -e "${YELLOW}Beispiel 2: Chat-Anfrage mit GET (URL-Pfad)${NC}"
echo "curl http://localhost:3719/chat/query/Was%20bedeutet%20GPKE?"
echo ""

echo -e "${YELLOW}Beispiel 3: Chat-Anfrage mit POST (JSON-Body)${NC}"
echo 'curl -X POST -H "Content-Type: application/json" -d '"'"'{"query":"Was bedeutet MaKo 2022?"}'"'"' http://localhost:3719/chat'
echo ""

echo -e "${YELLOW}Beispiel 4: Chat-Anfrage mit GET und Speichern in Datei${NC}"
echo "curl -s http://localhost:3719/chat/query/Was%20ist%20MSCONS? > antwort.json"
echo ""

echo -e "${YELLOW}Beispiel 5: Chat-Anfrage mit formatierter Ausgabe (jq erforderlich)${NC}"
echo 'curl -s http://localhost:3719/chat/query/Was%20ist%20ein%20MSB? | jq'
echo ""

echo -e "${GREEN}Um einen dieser Befehle auszuführen, kopieren Sie ihn einfach und fügen Sie ihn in die Kommandozeile ein.${NC}"
