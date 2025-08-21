#!/bin/bash

# Chat API Service Integration Fix
# Dieses Skript integriert den chatApi-Service in den ChatSelectorDialog

echo "🔄 Chat API Service Integration - Deployment Skript"
echo "---------------------------------------------"

# Backup erstellen
echo "📦 Erstelle Backup..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/chat-api-fix_$TIMESTAMP"
mkdir -p $BACKUP_DIR/app-legacy/src/components/BilateralClarifications
cp -f ./app-legacy/src/components/BilateralClarifications/ChatSelectorDialog.tsx $BACKUP_DIR/app-legacy/src/components/BilateralClarifications/
echo "✅ Backup erstellt unter $BACKUP_DIR"

# Prüfen, ob Änderungen korrekt sind
if grep -q "import { chatApi } from '../../services/chatApi';" ./app-legacy/src/components/BilateralClarifications/ChatSelectorDialog.tsx; then
    echo "✅ chatApi Service wurde korrekt importiert"
else
    echo "❌ chatApi Service wurde nicht korrekt importiert"
    exit 1
fi

if grep -q "const data = await chatApi.getChats();" ./app-legacy/src/components/BilateralClarifications/ChatSelectorDialog.tsx; then
    echo "✅ getChats Methode wird korrekt verwendet"
else
    echo "❌ getChats Methode wird nicht korrekt verwendet"
    exit 1
fi

# App neu bauen
echo "🔨 Baue App neu..."
cd app-legacy && npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build fehlgeschlagen"
    exit 1
fi
echo "✅ Build erfolgreich"

echo "✅ Chat API Service Integration erfolgreich angewendet"
echo "---------------------------------------------"
echo "Hinweis: Die Komponente verwendet nun den chatApi-Service zur Abfrage von Chats"
echo "Dieses Update nutzt:"
echo "1. Zentralisierte API-Endpunkte (apiEndpoints.ts)"
echo "2. Standard API-Client (apiClient.ts) mit Authentifizierung und Fehlerbehandlung"
echo "3. Typisierte Chat-API-Methoden"
echo ""
echo "Wenn die Chat-Auswahl jetzt nicht funktioniert, prüfen Sie bitte:"
echo "1. Ob der Benutzer angemeldet ist und ein gültiges Token hat"
echo "2. Ob die Backend-API korrekt läuft"
echo "3. Die Netzwerkanfragen in der Browser-Konsole für weitere Details"

exit 0
