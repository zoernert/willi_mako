#!/bin/bash

# Migration für Chat-Konfiguration
# Datum: 2025-01-26

echo "Starte Chat-Konfiguration Migration..."

# Prüfe ob PostgreSQL-Verbindung verfügbar ist
if ! command -v psql &> /dev/null; then
    echo "Fehler: psql nicht gefunden. PostgreSQL muss installiert sein."
    exit 1
fi

# Lade Umgebungsvariablen
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Standardwerte setzen falls nicht in .env definiert
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-willi_mako}
DB_USER=${DB_USER:-postgres}

echo "Führe Migration auf $DB_HOST:$DB_PORT/$DB_NAME aus..."

# Migration ausführen
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/add_admin_chat_config.sql

if [ $? -eq 0 ]; then
    echo "✅ Chat-Konfiguration Migration erfolgreich abgeschlossen!"
    echo ""
    echo "Die folgenden Funktionen wurden hinzugefügt:"
    echo "- Admin Chat-Konfiguration Interface"
    echo "- Konfigurierbare Verarbeitungsschritte"
    echo "- Test-Framework für Konfigurationen"
    echo "- Performance-Metriken und Test-Historie"
    echo ""
    echo "Zugriff über Admin Panel -> Chat-Config Tab"
else
    echo "❌ Migration fehlgeschlagen!"
    exit 1
fi
