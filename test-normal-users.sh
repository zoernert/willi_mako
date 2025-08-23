#!/bin/bash
# Testskript für normale Nutzer mit Fokus auf Lieferantenwechsel
# Führt Tests für normale Nutzer mit typischen Fragen zum Lieferantenwechsel durch

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Willi-Mako Normal User Test ===${NC}"
echo "Test für normale Nutzer ohne direkten CS30-Zugriff"
echo ""

# Prüfen, ob alle Skripte ausführbar sind
chmod +x batch-test.sh
chmod +x batch-test.js
chmod +x normal-user-test.js

# Testverzeichnis erstellen
TEST_DIR="user-test-results"
mkdir -p $TEST_DIR

# Prüfen, ob user-queries.json existiert, wenn nicht, erstellen wir es
if [ ! -f "user-queries.json" ]; then
  echo -e "${YELLOW}Erstelle user-queries.json mit Standardfragen...${NC}"
  echo '[
  "Erkläre mir den Prozess des Lieferantenwechsels",
  "Wie lange dauert ein Lieferantenwechsel?",
  "Was muss ich beim Lieferantenwechsel beachten?",
  "Welche Fristen gelten bei der Energieabrechnung?",
  "Wie funktioniert die Netznutzungsabrechnung?"
]' > user-queries.json
fi

# Speziellen Test nur für die Lieferantenwechsel-Frage erstellen
echo -e "${YELLOW}Erstelle Testdatei nur für Lieferantenwechsel...${NC}"
echo '[
  "Erkläre mir den Prozess des Lieferantenwechsels"
]' > lieferantenwechsel-test.json

# Führe den Test mit der Lieferantenwechsel-Frage durch
echo -e "${YELLOW}Führe Test mit der Lieferantenwechsel-Frage durch...${NC}"
./batch-test.sh -n -q lieferantenwechsel-test.json -o $TEST_DIR

# Führe den vollständigen Test mit allen Nutzeranfragen durch
echo -e "${YELLOW}Führe vollständigen Test mit allen Nutzeranfragen durch...${NC}"
./batch-test.sh -n -q user-queries.json -o $TEST_DIR

echo -e "${GREEN}=== Tests abgeschlossen ===${NC}"
echo "Die Testergebnisse wurden im Verzeichnis '$TEST_DIR' gespeichert."
echo ""
echo -e "${YELLOW}Tipps zur Analyse:${NC}"
echo "1. Überprüfen Sie die Genauigkeit der Antwort zum Lieferantenwechsel"
echo "2. Vergleichen Sie die Antwortzeiten mit den CS30-Debug-Tests"
echo "3. Analysieren Sie die Konsistenz der Antworten über mehrere ähnliche Fragen hinweg"
