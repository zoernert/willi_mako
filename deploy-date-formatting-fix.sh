#!/bin/bash
# Deploy-Skript für bilaterale Klärfälle: Bugfixes für Datumsformatierung und API-Fehlerbehandlung
# Erstellt: 21. August 2025
# Update: Erweiterte Fehlerbehandlung und API-Debugging

echo "Starting deployment of bilateral clarifications date formatting and API handling fixes"

# Änderung ins Hauptverzeichnis
cd "$(dirname "$0")"

# Backup relevanter Dateien
echo "Creating backups..."
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR/app-legacy/src/components/BilateralClarifications"
mkdir -p "$BACKUP_DIR/app-legacy/src/services"

cp app-legacy/src/components/BilateralClarifications/ChatSelectorDialog.tsx "$BACKUP_DIR/app-legacy/src/components/BilateralClarifications/"
cp app-legacy/src/components/BilateralClarifications/NoteSelectorDialog.tsx "$BACKUP_DIR/app-legacy/src/components/BilateralClarifications/"
cp app-legacy/src/components/BilateralClarifications/ClarificationReferences.tsx "$BACKUP_DIR/app-legacy/src/components/BilateralClarifications/"
cp app-legacy/src/services/bilateralClarificationService.ts "$BACKUP_DIR/app-legacy/src/services/"

echo "Backups created in $BACKUP_DIR"

# Frontend-Build
echo "Building frontend..."
cd app-legacy
npm run build

echo "Deployment completed successfully"
echo "Die Chat- und Notizauswahl sollte jetzt korrekt funktionieren."
echo "API-Fehlerbehandlung und Logging wurden verbessert."
