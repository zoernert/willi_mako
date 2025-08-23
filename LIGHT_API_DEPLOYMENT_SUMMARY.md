# Willi-Mako-Light API Deployment Summary

Die Willi-Mako-Light API ist ein HTTP-Service, der eine vereinfachte Schnittstelle für die Willi-Mako Chat-Funktionalität bietet. Der Service ermöglicht das Testen der Chat-Funktion über HTTP-Anfragen (z.B. mit curl).

## Implementierungsdetails

### Hauptkomponenten
- **willi-mako-light-api.js**: Express-basierter HTTP-Service, der die Chat-API-Funktionalität bereitstellt
- **.env.light-api**: Konfigurationsdatei für den Light API Service
- **start-willi-mako-light-api.sh**: Script zum manuellen Starten des Services
- **test-willi-mako-light-api.sh**: Script zum Testen der API-Funktionalität
- **willi-mako-light-api-README.md**: Dokumentation der API und ihrer Verwendung

### Funktionen
- Automatische Authentifizierung mit festen Anmeldedaten
- Endpunkte für Chat-Anfragen (GET und POST)
- Detaillierte Protokollierung in JSON-Dateien
- Fehlerbehandlung und Metriken

## Deployment-Integration

Der Light API Service ist vollständig in den Deployment-Prozess integriert:

### In quick-deploy.sh
1. **Kopieren der Service-Dateien**:
   - willi-mako-light-api.js (ausführbar gemacht)
   - start-willi-mako-light-api.sh
   - test-willi-mako-light-api.sh
   - willi-mako-light-api-README.md

2. **Konfiguration**:
   - Erstellen von .env.light-api auf dem Server
   - Erstellen des logs-Verzeichnisses

3. **PM2-Integration**:
   - Hinzufügen als Teil der ecosystem_4100.config.js
   - Name: willi_mako_light_api_3719
   - Port: 3719
   - Umgebungsvariablen für die Konfiguration

4. **Health Check**:
   - Statusprüfung im deployment-output
   - Zugänglich über http://localhost:3719/

### In package.json
Die folgenden npm-Scripts wurden hinzugefügt:
- `light-api`: Startet den Service im Produktionsmodus
- `light-api:dev`: Startet den Service im Entwicklungsmodus mit automatischem Neustart
- `light-api:test`: Führt das Testscript aus

## Produktionsumgebung

In der Produktionsumgebung:
- Läuft als PM2-Prozess (willi_mako_light_api_3719)
- Benutzt den Port 3719
- Logdateien werden in /opt/willi_mako/logs/ gespeichert:
  - light_api_3719_err.log
  - light_api_3719_out.log
  - light_api_3719_combined.log

## Verwendung

Lokal:
```bash
npm run light-api        # Produktionsmodus
npm run light-api:dev    # Entwicklungsmodus
npm run light-api:test   # Tests ausführen
```

Auf dem Produktionsserver:
```bash
pm2 status                        # Status aller PM2-Prozesse anzeigen
pm2 restart willi_mako_light_api_3719  # Light API neustarten
pm2 logs willi_mako_light_api_3719     # Logs anzeigen
```

Testen der API:
```bash
curl http://localhost:3719/               # Status
curl http://localhost:3719/chat/query/Deine%20Frage  # GET-Anfrage
curl -X POST -H "Content-Type: application/json" -d '{"query":"Deine Frage"}' http://localhost:3719/chat  # POST-Anfrage
curl http://localhost:3719/logs           # Logs abrufen
```
