#!/bin/bash
# Start-Script für den Willi-Mako-Light API Service

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Willi-Mako-Light API Service ===${NC}"
echo -e "${YELLOW}Starte den Service auf Port 3719...${NC}"

# Prüfen, ob die erforderlichen Pakete installiert sind
if ! npm list express >/dev/null 2>&1 || ! npm list morgan >/dev/null 2>&1; then
  echo -e "${YELLOW}Installiere erforderliche Abhängigkeiten...${NC}"
  npm install --save express morgan body-parser axios dotenv
fi

# Prüfen, ob die .env.light-api Datei existiert
if [ ! -f .env.light-api ]; then
  echo -e "${YELLOW}Erstelle .env.light-api Datei...${NC}"
  cat > .env.light-api << EOL
# Willi-Mako-Light API Konfiguration
PORT=3719
API_BASE_URL=https://stromhaltig.de/api
EMAIL=kontakt+demo@stromdao.com
PASSWORD=willi.mako
VERBOSE=true
EOL
  echo -e "${GREEN}.env.light-api wurde erstellt${NC}"
fi

# Prüfen, ob der logs Ordner existiert
if [ ! -d "logs" ]; then
  echo -e "${YELLOW}Erstelle logs Verzeichnis...${NC}"
  mkdir -p logs
fi

# Script ausführbar machen
chmod +x willi-mako-light-api.js

echo -e "${GREEN}Alle Voraussetzungen erfüllt. Starte den Service...${NC}"

# Service im Hintergrund starten
NODE_ENV=production DOTENV_CONFIG_PATH=.env.light-api node willi-mako-light-api.js
