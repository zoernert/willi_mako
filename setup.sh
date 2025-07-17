#!/bin/bash

# Stromhaltig Setup Script
echo "🚀 Stromhaltig - Digital Energy Infrastructure Setup"
echo "===================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js ist nicht installiert. Bitte installieren Sie Node.js 18+ und versuchen Sie es erneut."
    exit 1
fi

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL ist nicht installiert oder nicht im PATH."
    echo "   Bitte installieren Sie PostgreSQL und erstellen Sie eine Datenbank 'stromhaltig'."
fi

# Install dependencies
echo "📦 Installiere Backend-Abhängigkeiten..."
npm install

echo "📦 Installiere Frontend-Abhängigkeiten..."
cd client && npm install && cd ..

# Create environment file if not exists
if [ ! -f .env ]; then
    echo "📄 Erstelle .env Datei..."
    cp .env.example .env
    echo "✅ .env Datei erstellt. Bitte konfigurieren Sie Ihre Umgebungsvariablen."
fi

# Create uploads directory
mkdir -p uploads

# Build TypeScript
echo "🔨 Kompiliere TypeScript..."
npm run build

# Initialize database and vector store
echo "🗄️  Initialisiere Datenbank und Vector Store..."
node dist/init.js

echo ""
echo "✅ Setup abgeschlossen!"
echo ""
echo "🌟 Um die Anwendung zu starten:"
echo "   npm run dev    # Startet Backend und Frontend"
echo ""
echo "🔧 Einzeln starten:"
echo "   npm run server:dev  # Backend (Port 3001)"
echo "   npm run client:dev  # Frontend (Port 3000)"
echo ""
echo "🔑 Standard Admin-Login:"
echo "   E-Mail: admin@willi-mako.com"
echo "   Passwort: admin123"
echo ""
echo "📋 Wichtige Hinweise:"
echo "   - Konfigurieren Sie Ihre .env Datei mit den richtigen Werten"
echo "   - Stellen Sie sicher, dass PostgreSQL läuft"
echo "   - Stellen Sie sicher, dass Qdrant auf 10.0.0.2:6333 erreichbar ist"
echo "   - Fügen Sie Ihren Gemini API Key hinzu"
echo ""
