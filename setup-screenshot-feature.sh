#!/bin/bash

# Setup-Skript für Screenshot-Feature Dependencies
# Installiert alle notwendigen NPM-Pakete und richtet die Umgebung ein

set -e

echo "🔧 Setup für Screenshot-Analyse-Feature"
echo "======================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Fehler: package.json nicht gefunden. Bitte führe das Skript im Projektverzeichnis aus."
    exit 1
fi

echo "📦 Installiere notwendige Dependencies..."

# Install screenshot-related dependencies
npm install @google/generative-ai
echo "✅ @google/generative-ai installiert"

npm install sharp
echo "✅ sharp installiert"

npm install multer
echo "✅ multer installiert"

npm install @types/multer --save-dev
echo "✅ @types/multer installiert (dev dependency)"

echo ""
echo "📁 Erstelle Upload-Verzeichnisse..."

# Create upload directories
mkdir -p uploads/screenshots
mkdir -p uploads/temp
echo "✅ Upload-Verzeichnisse erstellt"

# Set proper permissions
chmod 755 uploads uploads/screenshots uploads/temp
echo "✅ Berechtigungen gesetzt"

echo ""
echo "🔍 Überprüfe Environment-Konfiguration..."

# Check .env file
if [ ! -f ".env" ]; then
    echo "❌ .env Datei nicht gefunden"
    echo "📝 Erstelle .env Template..."
    cat > .env.template << 'ENVEOF'
# Google Gemini Configuration
GOOGLE_API_KEY=your_google_api_key_here
GEMINI_API_KEY=your_google_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_VISION_MODEL=gemini-1.5-flash

# Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=50MB

# Database Configuration (adjust as needed)
DATABASE_URL=postgresql://user:password@host:port/database
ENVEOF
    echo "📋 .env.template erstellt. Bitte kopiere zu .env und fülle die Werte aus."
else
    echo "✅ .env Datei gefunden"
    
    # Check for required environment variables
    if grep -q "GOOGLE_API_KEY" .env; then
        echo "✅ GOOGLE_API_KEY in .env gefunden"
    else
        echo "⚠️  GOOGLE_API_KEY fehlt in .env"
        echo "Füge hinzu: GOOGLE_API_KEY=your_api_key_here"
    fi
    
    if grep -q "GEMINI_VISION_MODEL" .env; then
        echo "✅ GEMINI_VISION_MODEL in .env gefunden"
    else
        echo "⚠️  GEMINI_VISION_MODEL fehlt in .env"
        echo "Füge hinzu: GEMINI_VISION_MODEL=gemini-1.5-flash"
        echo "GEMINI_VISION_MODEL=gemini-1.5-flash" >> .env
        echo "✅ GEMINI_VISION_MODEL zu .env hinzugefügt"
    fi
fi

echo ""
echo "🗄️  Überprüfe Datenbank-Migration..."

if [ -f "migration-screenshot-support.sql" ]; then
    echo "✅ Datenbank-Migration gefunden"
    echo "💡 Führe aus: psql \$DATABASE_URL -f migration-screenshot-support.sql"
else
    echo "❌ Datenbank-Migration nicht gefunden"
    echo "📄 Erstelle Migration..."
    
    # Create the migration file if it doesn't exist
    if [ ! -f "migration-screenshot-support.sql" ]; then
        echo "⚠️  Migration muss manuell erstellt werden"
    fi
fi

echo ""
echo "🏗️  Build-Prozess..."

# Check if TypeScript files need to be compiled
if [ -f "tsconfig.json" ] && [ -d "src" ]; then
    echo "📦 Kompiliere TypeScript..."
    if command -v npm >/dev/null 2>&1; then
        if npm run build:backend 2>/dev/null; then
            echo "✅ Backend-Build erfolgreich"
        else
            echo "⚠️  Backend-Build fehlgeschlagen oder nicht konfiguriert"
        fi
    fi
else
    echo "📋 Kein TypeScript-Build notwendig"
fi

echo ""
echo "🧪 Teste Installation..."

# Simple dependency check
echo "🔍 Überprüfe installierte Pakete..."

if npm list @google/generative-ai >/dev/null 2>&1; then
    echo "✅ @google/generative-ai korrekt installiert"
else
    echo "❌ @google/generative-ai Installation fehlerhaft"
fi

if npm list sharp >/dev/null 2>&1; then
    echo "✅ sharp korrekt installiert"
else
    echo "❌ sharp Installation fehlerhaft"
fi

if npm list multer >/dev/null 2>&1; then
    echo "✅ multer korrekt installiert"
else
    echo "❌ multer Installation fehlerhaft"
fi

echo ""
echo "📋 Überprüfe Verzeichnisstruktur..."

if [ -d "uploads/screenshots" ]; then
    echo "✅ uploads/screenshots vorhanden"
else
    echo "❌ uploads/screenshots fehlt"
fi

if [ -d "uploads/temp" ]; then
    echo "✅ uploads/temp vorhanden"
else
    echo "❌ uploads/temp fehlt"
fi

echo ""
echo "==============================================="
echo "🎉 Screenshot-Feature Setup abgeschlossen!"
echo "==============================================="

echo ""
echo "📋 Nächste Schritte:"
echo "1. Überprüfe und aktualisiere .env Datei mit deinen API-Keys"
echo "2. Führe Datenbank-Migration aus: psql \$DATABASE_URL -f migration-screenshot-support.sql"
echo "3. Starte den Server: npm run dev"
echo "4. Teste das Feature mit: ./check-screenshot-production.sh"

echo ""
echo "📚 Dokumentation:"
echo "- SCREENSHOT_PRODUCTION_SETUP.md (Produktions-Setup)"
echo "- SCREENSHOT_ANALYSIS_IMPLEMENTATION_COMPLETE.md (Feature-Details)"

echo ""
echo "🚀 Deployment:"
echo "- Entwicklung: npm run dev"
echo "- Produktion: ./deploy-with-screenshot.sh"
