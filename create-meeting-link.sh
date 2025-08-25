#!/bin/bash

# Farben für die Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Willi-Mako Meeting Link Generator${NC}"
echo -e "${BLUE}==================================${NC}\n"

# Prüfen, ob Google Meet ID als Parameter übergeben wurde
if [ $# -eq 1 ]; then
  MEETING_ID=$1
  echo -e "${GREEN}✅ Meeting-ID aus Parameter: ${MEETING_ID}${NC}"
else
  # Aufforderung zur Eingabe einer Google Meet ID
  echo -e "${YELLOW}Bitte geben Sie eine Google Meet ID ein (Format: xxx-xxxx-xxx):${NC}"
  read -p "> " MEETING_ID
fi

# Validieren der Meeting-ID
if [[ ! $MEETING_ID =~ ^[a-z]{3}-[a-z]{4}-[a-z]{3}$ ]]; then
  echo -e "${RED}❌ Ungültiges Google Meet ID-Format!${NC}"
  echo -e "${YELLOW}Eine gültige Google Meet ID hat das Format: xxx-xxxx-xxx (z.B. abc-defg-hij)${NC}"
  echo -e "${YELLOW}Sie können eine neue ID erstellen auf: https://meet.google.com/new${NC}"
  exit 1
fi

# Ermitteln der Basis-URL je nach Umgebung
BASE_URL="https://stromhaltig.de"

# Wenn es eine lokale Entwicklungsumgebung ist, verwende localhost
if [[ -f ".env.local" ]] || [[ -f ".env.development" ]]; then
  BASE_URL="http://localhost:3000"
  
  # Prüfen, ob Dev-Server läuft
  if ! nc -z localhost 3000 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Lokaler Entwicklungsserver scheint nicht zu laufen.${NC}"
    echo -e "${YELLOW}   Sie können ihn mit 'npm run dev' starten.${NC}\n"
  fi
fi

# Generiere den vollständigen Meeting-Link
MEETING_URL="${BASE_URL}/meeting/${MEETING_ID}"
GOOGLE_MEET_URL="https://meet.google.com/${MEETING_ID}"

# Ausgabe des Links
echo -e "\n${GREEN}✅ Meeting-Link generiert!${NC}"
echo -e "${BLUE}Willi-Mako Doorway URL:${NC} ${MEETING_URL}"
echo -e "${BLUE}Direkter Google Meet URL:${NC} ${GOOGLE_MEET_URL}\n"

# Text für E-Mail-Vorlage
echo -e "${BLUE}📧 E-Mail-Vorlage:${NC}"
cat << EOF
Sehr geehrte/r [Kundenname],

vielen Dank für Ihre Beratungsanfrage. Wir haben einen Termin für Ihr Beratungsgespräch eingerichtet.

Bitte nutzen Sie folgenden Link, um am vereinbarten Termin teilzunehmen:
${MEETING_URL}

Bitte beachten Sie, dass für diese Beratung Kosten in Höhe von [Betrag] entstehen können. 
Die genauen Konditionen wurden in unserem Vorgespräch vereinbart.

Mit freundlichen Grüßen,
Ihr Willi-Mako Team
EOF

# QR-Code generieren, wenn qrencode installiert ist
if command -v qrencode &> /dev/null; then
  TEMP_QR=$(mktemp)
  qrencode -o ${TEMP_QR} "${MEETING_URL}"
  echo -e "\n${BLUE}🔍 QR-Code für Meeting erstellt:${NC} ${TEMP_QR}"
  echo -e "${YELLOW}   Sie können diesen QR-Code in Kalenderereignisse oder E-Mails einfügen.${NC}"
else
  echo -e "\n${YELLOW}ℹ️  Tipp: Installieren Sie 'qrencode' für die automatische QR-Code-Generierung.${NC}"
fi

echo -e "\n${GREEN}✨ Fertig! Sie können diesen Link nun teilen.${NC}"
