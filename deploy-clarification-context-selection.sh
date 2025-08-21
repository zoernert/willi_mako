#!/bin/bash
# Deploy-Skript für bilaterale Klärfälle: Kontextauswahl für Chats und Notizen
# Erstellt: 20. August 2025

echo "Starting deployment of bilateral clarifications context selection feature"

# Änderung ins Hauptverzeichnis
cd "$(dirname "$0")"

# Migrationen ausführen
echo "Running database migrations..."
psql -f migration-add-reference-functions.sql

# Server neustarten
echo "Restarting server..."
pm2 restart server.js

# Frontend-Build
echo "Building frontend..."
cd app-legacy
npm run build

echo "Deployment completed successfully"
