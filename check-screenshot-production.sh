#!/bin/bash

# Production Environment Check Script for Screenshot Analysis Feature
# Validates that all required dependencies and configurations are in place

set -e

echo "🔍 Produktions-Check für Screenshot-Analyse-Feature"
echo "=================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUCCESS=0
WARNINGS=0
ERRORS=0

# Function to print status
print_status() {
    if [ "$2" = "OK" ]; then
        echo -e "${GREEN}✅ $1${NC}"
        ((SUCCESS++))
    elif [ "$2" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $1${NC}"
        ((WARNINGS++))
    else
        echo -e "${RED}❌ $1${NC}"
        ((ERRORS++))
    fi
}

echo "1. Environment Variables Check"
echo "------------------------------"

# Load environment variables from .env if available
if [ -f ".env" ]; then
    echo "📄 Lade .env Datei..."
    set -a  # automatically export all variables
    source .env
    set +a
fi

# Check for required environment variables
if [ -n "$GOOGLE_API_KEY" ] || [ -n "$GEMINI_API_KEY" ]; then
    print_status "GOOGLE_API_KEY vorhanden" "OK"
else
    print_status "GOOGLE_API_KEY fehlt" "ERROR"
fi

if [ -n "$GEMINI_VISION_MODEL" ]; then
    print_status "GEMINI_VISION_MODEL konfiguriert: $GEMINI_VISION_MODEL" "OK"
else
    print_status "GEMINI_VISION_MODEL nicht gesetzt (Standard: gemini-1.5-flash)" "WARNING"
fi

echo ""
echo "2. Node.js Dependencies Check"
echo "-----------------------------"

# Check for required npm packages
check_package() {
    if npm list "$1" > /dev/null 2>&1; then
        print_status "NPM Package $1 installiert" "OK"
    else
        print_status "NPM Package $1 fehlt" "ERROR"
    fi
}

check_package "@google/generative-ai"
check_package "sharp" 
check_package "multer"

echo ""
echo "3. Directory Structure Check"
echo "----------------------------"

# Check for required directories
check_directory() {
    if [ -d "$1" ]; then
        print_status "Verzeichnis $1 existiert" "OK"
    else
        print_status "Verzeichnis $1 fehlt" "ERROR"
        echo "  Erstelle Verzeichnis: $1"
        mkdir -p "$1"
        if [ -d "$1" ]; then
            print_status "Verzeichnis $1 erfolgreich erstellt" "OK"
        else
            print_status "Verzeichnis $1 konnte nicht erstellt werden" "ERROR"
        fi
    fi
}

check_directory "uploads"
check_directory "uploads/screenshots"
check_directory "uploads/temp"

echo ""
echo "4. File Permissions Check"
echo "-------------------------"

# Check write permissions for upload directories
check_write_permission() {
    if [ -w "$1" ]; then
        print_status "Schreibberechtigung für $1" "OK"
    else
        print_status "Keine Schreibberechtigung für $1" "ERROR"
    fi
}

check_write_permission "uploads"
check_write_permission "uploads/screenshots"
check_write_permission "uploads/temp"

echo ""
echo "5. Service Files Check"
echo "---------------------"

# Check for required service files
check_file() {
    if [ -f "$1" ]; then
        print_status "Datei $1 vorhanden" "OK"
    else
        print_status "Datei $1 fehlt" "ERROR"
    fi
}

check_file "dist/services/screenshotAnalysisService.js"
check_file "dist/routes/chat.js"

echo ""
echo "6. Database Migration Check"
echo "---------------------------"

# Check if migration has been run (this is a simplified check)
if psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name='messages' AND column_name='screenshot_path';" 2>/dev/null | grep -q "screenshot_path"; then
    print_status "Screenshot-Datenbank-Migration wurde angewendet" "OK"
else
    print_status "Screenshot-Datenbank-Migration fehlt oder nicht angewendet" "ERROR"
    echo "  Führe aus: psql \$DATABASE_URL -f migration-screenshot-support.sql"
fi

echo ""
echo "7. API Endpoint Test"
echo "-------------------"

# Simple test to see if the endpoint exists (requires running server)
if pgrep -f "node.*server" > /dev/null; then
    print_status "Node.js Server läuft" "OK"
    
    # Try to check if the endpoint responds (optional, requires curl)
    if command -v curl >/dev/null 2>&1; then
        if curl -s -f "http://localhost:${PORT:-3009}/api/health" > /dev/null 2>&1; then
            print_status "Server reagiert auf Health-Check" "OK"
        else
            print_status "Server reagiert nicht auf Health-Check" "WARNING"
        fi
    else
        print_status "curl nicht verfügbar für Endpoint-Test" "WARNING"
    fi
else
    print_status "Node.js Server läuft nicht" "WARNING"
fi

echo ""
echo "8. Memory and Storage Check"
echo "--------------------------"

# Check available disk space
AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_SPACE" -gt 1048576 ]; then  # 1GB in KB
    print_status "Ausreichend Speicherplatz verfügbar ($(echo $AVAILABLE_SPACE | awk '{print int($1/1024/1024)}')GB)" "OK"
else
    print_status "Wenig Speicherplatz verfügbar ($(echo $AVAILABLE_SPACE | awk '{print int($1/1024/1024)}')GB)" "WARNING"
fi

# Check Node.js memory
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_status "Node.js Version: $NODE_VERSION" "OK"
else
    print_status "Node.js nicht verfügbar" "ERROR"
fi

echo ""
echo "=================================================================="
echo "📊 ZUSAMMENFASSUNG:"
echo -e "${GREEN}✅ Erfolgreich: $SUCCESS${NC}"
echo -e "${YELLOW}⚠️  Warnungen: $WARNINGS${NC}"
echo -e "${RED}❌ Fehler: $ERRORS${NC}"
echo "=================================================================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 Screenshot-Analyse-Feature ist produktionsbereit!${NC}"
    exit 0
elif [ $ERRORS -le 2 ] && [ $WARNINGS -le 3 ]; then
    echo -e "${YELLOW}⚠️  Screenshot-Analyse-Feature ist bedingt funktionsfähig. Bitte behebe die kritischen Probleme.${NC}"
    exit 1
else
    echo -e "${RED}💥 Screenshot-Analyse-Feature ist nicht produktionsbereit. Kritische Probleme müssen behoben werden.${NC}"
    exit 2
fi
