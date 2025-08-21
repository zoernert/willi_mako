#!/bin/bash
# Deploy-Skript für bilaterale Klärfälle: Bugfixes für Chat- und Notizauswahl
# Erstellt: 20. August 2025

echo "Starting deployment of bilateral clarifications selection bugfixes"

# Änderung ins Hauptverzeichnis
cd "$(dirname "$0")"

# Server neustarten
echo "Restarting server..."
pm2 restart server.js

# Frontend-Build
echo "Building frontend..."
cd app-legacy
npm run build

echo "Deployment completed successfully"
