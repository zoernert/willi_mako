#!/bin/bash
# Dieses Skript korrigiert die Tabellen für bilaterale Klarfälle in der Datenbank

# Lade Umgebungsvariablen aus .env
source .env

echo "Verbindung zur Datenbank herstellen..."
echo "DB_HOST: $DB_HOST"
echo "DB_PORT: $DB_PORT"
echo "DB_NAME: $DB_NAME"
echo "DB_USER: $DB_USER"

# Führe das SQL-Skript aus
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f fix-bilateral-clarifications.sql

if [ $? -eq 0 ]; then
  echo "✅ Datenbank-Tabellen wurden erfolgreich aktualisiert!"
  echo "Sie können jetzt wieder Klarfälle aus dem Chat erstellen."
else
  echo "❌ Fehler beim Ausführen des SQL-Skripts."
  echo "Bitte überprüfen Sie die Fehlermeldungen und versuchen Sie es erneut."
fi
