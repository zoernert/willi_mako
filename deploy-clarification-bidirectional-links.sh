#!/bin/bash
# Deploy-Skript für die Anzeige verknüpfter Klärfälle in Chats und Notizen
# Erstellt: 20. August 2025

echo "Starting deployment of bilateral clarifications bidirectional linking feature"

# Änderung ins Hauptverzeichnis
cd "$(dirname "$0")"

# Server neustarten
echo "Restarting server to apply backend changes..."
pm2 restart server.js

# Frontend-Build
echo "Building frontend..."
cd app-legacy
npm run build

echo "Deployment completed successfully"
echo "Please follow the integration guide in docs/integration-linked-clarifications.md to complete the integration."
