# Screenshot-Analyse Feature - Produktions-Setup

## Überblick
Das Screenshot-Analyse-Feature ermöglicht es Benutzern, Screenshots (z.B. von Schleupen CS 3.0) hochzuladen, die automatisch von Google Gemini Vision analysiert werden. Diese Analyse wird dann in LLM-Antworten integriert, um kontextbezogene Hilfe zu bieten.

## Produktions-Deployment

### Automatisches Deployment
```bash
# Vollständiges Deployment mit Screenshot-Feature
./deploy-with-screenshot.sh

# Standard-Deployment (Screenshot-Feature muss manuell nachgerüstet werden)
./quick-deploy.sh
```

### Manuelle Setup-Schritte

#### 1. Environment-Variablen
Stelle sicher, dass die `.env` Datei folgende Variablen enthält:
```bash
# Google Gemini API Key
GOOGLE_API_KEY=your_api_key_here

# Vision Model für Screenshot-Analyse
GEMINI_VISION_MODEL=gemini-1.5-flash

# Upload-Konfiguration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=50MB
```

#### 2. Dependencies installieren
```bash
npm install @google/generative-ai sharp multer
```

#### 3. Upload-Verzeichnisse erstellen
```bash
mkdir -p uploads/screenshots uploads/temp
chmod 755 uploads uploads/screenshots uploads/temp
```

#### 4. Datenbank-Migration ausführen
```bash
psql $DATABASE_URL -f migration-screenshot-support.sql
```

#### 5. Server neu starten
```bash
# PM2
pm2 restart willi-mako

# oder systemd
systemctl restart willi-mako
```

### Produktions-Check
Führe das Check-Skript aus, um sicherzustellen, dass alles korrekt konfiguriert ist:
```bash
./check-screenshot-production.sh
```

## Feature-Konfiguration

### Gemini Vision Model
Das System verwendet standardmäßig `gemini-1.5-flash` für die Screenshot-Analyse. Dies kann über die Environment-Variable `GEMINI_VISION_MODEL` angepasst werden:

```bash
# Für bessere Analyse-Qualität (langsamer, teurer)
GEMINI_VISION_MODEL=gemini-1.5-pro

# Für schnellere Analyse (Standard)
GEMINI_VISION_MODEL=gemini-1.5-flash
```

### Upload-Limits
Standardkonfiguration:
- Maximale Dateigröße: 50MB
- Unterstützte Formate: PNG, JPG, JPEG, WEBP
- Upload-Pfad: `./uploads/screenshots`

Anpassung in `.env`:
```bash
MAX_FILE_SIZE=100MB  # Für größere Screenshots
```

### Performance-Optimierung
1. **Sharp-Preprocessing**: Bilder werden automatisch optimiert
2. **Format-Konvertierung**: Alle Bilder werden zu PNG konvertiert
3. **Größen-Anpassung**: Große Bilder werden auf 1920x1080 skaliert
4. **Temporary Files**: Verarbeitete Bilder werden automatisch gelöscht

## API-Endpunkte

### Screenshot Upload & Analyse
```
POST /api/chats/:chatId/analyze-screenshot
Content-Type: multipart/form-data

Form fields:
- screenshot: File (required)
- message: String (optional)
```

### Chat mit Screenshot-Kontext
```
POST /api/chats/:chatId/messages
Content-Type: application/json

{
  "content": "Benutzer-Nachricht",
  "screenshotAnalysisId": "analysis_id" // Optional
}
```

## Troubleshooting

### Häufige Probleme

#### 1. "Google API Key is required"
```bash
# Prüfe Environment-Variable
echo $GOOGLE_API_KEY

# Setze in .env
echo "GOOGLE_API_KEY=your_key_here" >> .env
```

#### 2. "Sharp installation failed"
```bash
# Neuinstallation mit spezifischer Plattform
npm uninstall sharp
npm install --platform=linux --arch=x64 sharp
```

#### 3. "Upload directory not writable"
```bash
# Berechtigungen prüfen und setzen
ls -la uploads/
chmod -R 755 uploads/
chown -R $USER:$USER uploads/
```

#### 4. "Screenshot analysis failed"
```bash
# Log-Ausgabe prüfen
tail -f server.log | grep "screenshot"

# Model-Konfiguration prüfen
echo $GEMINI_VISION_MODEL
```

#### 5. Database Migration Fehler
```bash
# Migration-Status prüfen
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='messages' AND column_name='screenshot_path';"

# Migration manuell ausführen
psql $DATABASE_URL -f migration-screenshot-support.sql
```

### Performance-Monitoring
```bash
# Screenshot-Upload-Statistiken
grep "Screenshot saved" server.log | tail -10

# Gemini API-Calls
grep "Gemini Vision Analysis" server.log | tail -10

# Fehlerhafte Analysen
grep "Screenshot analysis failed" server.log
```

### Backup & Recovery
```bash
# Screenshot-Backups
tar -czf screenshots-backup-$(date +%Y%m%d).tar.gz uploads/screenshots/

# Database-Backup (mit Screenshot-Daten)
pg_dump $DATABASE_URL > backup-with-screenshots-$(date +%Y%m%d).sql
```

## Sicherheit

### File Upload Security
- Dateityp-Validierung durch MIME-Type und Extension
- Größenbeschränkung
- Automatische Bildverarbeitung (verhindert schädliche Payloads)
- Isolierte Upload-Verzeichnisse

### API Security
- Authentifizierung über JWT
- Rate Limiting
- Input Validation
- Error Handling ohne sensitive Informationen

### Data Privacy
- Screenshots werden lokal gespeichert
- Analyse-Ergebnisse in der Datenbank
- Automatische Cleanup von temporären Dateien
- GDPR-konforme Datenverarbeitung

## Integration

### Frontend-Integration
Die Screenshot-Upload-Funktionalität ist bereits in die Chat-Komponente integriert:
- Drag & Drop Upload
- Paste from Clipboard
- Preview-Funktionalität
- Progress-Anzeige

### Backend-Integration
- Modular aufgebauter Screenshot-Service
- Erweiterbare Analyse-Pipeline
- Flexible Prompt-Generierung
- Caching von Analyse-Ergebnissen

## Kosten-Optimierung

### Gemini API Costs
- Verwende `gemini-1.5-flash` für Standard-Analysen
- Implementiere Caching für ähnliche Screenshots
- Batch-Processing für multiple Uploads
- Monitoring der API-Usage

### Storage Costs
- Automatische Bereinigung alter Screenshots
- Komprimierung gespeicherter Bilder
- Lifecycle-Management für Upload-Dateien

## Wartung

### Regelmäßige Tasks
```bash
# Alte Screenshots bereinigen (älter als 30 Tage)
find uploads/screenshots -name "*.png" -mtime +30 -delete

# Temporary Files bereinigen
find uploads/temp -name "*" -mtime +1 -delete

# Database Vacuum für bessere Performance
psql $DATABASE_URL -c "VACUUM ANALYZE messages;"
```

### Updates
```bash
# Dependencies aktualisieren
npm update @google/generative-ai sharp multer

# Feature-Updates deployen
git pull origin main
./deploy-with-screenshot.sh
```
