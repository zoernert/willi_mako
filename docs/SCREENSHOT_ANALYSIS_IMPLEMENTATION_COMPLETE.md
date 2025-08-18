# Screenshot-Upload Feature für Willi-Mako Chat

## Übersicht

Das Screenshot-Upload Feature ermöglicht es Benutzern, Screenshots ihrer Fachanwendungen (insbesondere Schleupen CS 3.0) hochzuladen, um Probleme und Fehlermeldungen visuell zu beschreiben. Das System analysiert automatisch den Screenshot-Inhalt und generiert kontextbezogene Antworten.

## Features

### 🖼️ Screenshot-Upload Funktionalität
- **Drag & Drop**: Screenshots direkt in den Chat ziehen
- **Copy & Paste**: Screenshots aus der Zwischenablage einfügen
- **File Upload**: Traditioneller Datei-Upload über Dialog
- **Format-Unterstützung**: PNG, JPEG, JPG, WebP (max. 10MB)

### 🔍 KI-basierte Screenshot-Analyse
- **Automatische Texterkennung**: OCR für alle sichtbaren Texte
- **Fehlererkennung**: Identifikation von Fehlermeldungen und Warnungen
- **UI-Element-Erkennung**: Menüs, Dialoge, Formulare, Buttons, Tabellen
- **Schleupen CS 3.0 Erkennung**: Spezielle Erkennung für Energieversorger-Software
- **Konfidenz-Bewertung**: Vertrauensgrad der Analyse

### 💬 Intelligente Antwortgenerierung
- **Kontextuelle Analyse**: Screenshot-Inhalt wird in Chat-Kontext integriert
- **Problemfokussierte Antworten**: Spezifische Lösungen basierend auf erkannten Problemen
- **Branchenspezifisch**: Optimiert für Energiewirtschaft und Marktkommunikation

## Installation und Setup

### 1. Dependencies installieren

```bash
npm install sharp @google/generative-ai multer
```

### 2. Datenbankschema erweitern

```bash
psql $DATABASE_URL -f migration-screenshot-support.sql
```

### 3. Umgebungsvariablen konfigurieren

```env
# In .env hinzufügen
GOOGLE_API_KEY=your_gemini_api_key_here
UPLOADS_DIR=uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes
```

### 4. Upload-Verzeichnis erstellen

```bash
mkdir -p uploads/screenshots
mkdir -p uploads/temp
chmod 755 uploads
```

## Technische Architektur

### Frontend-Komponenten

```
app-legacy/src/components/Chat/
├── ScreenshotUpload.tsx      # Upload-Interface
├── EnhancedMessage.tsx       # Nachrichten mit Screenshots
└── ScreenshotPreview.tsx     # Vorschau-Dialog
```

### Backend-Services

```
dist/services/
├── screenshotAnalysisService.js  # KI-Analyse Service
└── gemini.js                    # Erweitert um Vision-Funktionen
```

### API-Endpunkte

```typescript
// Screenshot-Analyse
POST /api/chat/analyze-screenshot
Content-Type: multipart/form-data
Body: { screenshot: File }

// Nachricht mit Screenshot senden
POST /api/chat/chats/:chatId/messages
Content-Type: multipart/form-data
Body: { 
  content: string,
  screenshot?: File,
  analysis?: JSON,
  contextSettings?: JSON
}
```

### Datenbankschema

```sql
-- Erweiterte messages Tabelle
ALTER TABLE messages ADD COLUMN metadata JSONB;
ALTER TABLE messages ADD COLUMN has_screenshot BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN screenshot_url TEXT;
ALTER TABLE messages ADD COLUMN screenshot_analysis JSONB;

-- Neue file_uploads Tabelle
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY,
  chat_id UUID REFERENCES chats(id),
  message_id UUID REFERENCES messages(id),
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  analysis_result JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Verwendung

### 1. Screenshot hochladen

```tsx
// Benutzer kann Screenshots hochladen via:
// - Drag & Drop in den Chat-Bereich
// - Kamera-Button klicken → Datei auswählen
// - Strg+V für Zwischenablage-Einfügen
```

### 2. Automatische Analyse

Das System analysiert automatisch:
- **Sichtbare Texte**: Alle lesbaren Inhalte werden extrahiert
- **Fehlermeldungen**: Rote Dialoge, Warning-Icons, Exception-Texte
- **UI-Komponenten**: Menüs, Formulare, Buttons werden erkannt
- **Anwendungskontext**: Schleupen CS 3.0 Interface wird identifiziert

### 3. KI-Antwort mit Kontext

```typescript
// Beispiel einer kontextbasierten Antwort:
{
  "analysis": "Screenshot zeigt Schleupen CS 3.0 Marktkommunikation",
  "errorMessages": ["Validierungsfehler: BDEW-Format ungültig"],
  "recommendation": "Überprüfen Sie die EDIFACT-Nachrichtenstruktur..."
}
```

## Konfiguration

### Screenshot-Analyse Einstellungen

```typescript
// In screenshot_analysis_config Tabelle
{
  "confidence_threshold": 0.7,
  "schleupen_cs30_patterns": {
    "window_titles": ["Schleupen", "CS.30", "CS 30"],
    "ui_elements": ["Stammdaten", "Vertragspartner", "Marktkommunikation"],
    "colors": ["#0066cc", "#003366"]
  },
  "error_detection_patterns": {
    "error_keywords": ["Fehler", "Error", "Exception", "Warnung"],
    "dialog_patterns": ["OK", "Abbrechen", "Retry"]
  }
}
```

### Benutzer-Einstellungen

```sql
-- In user_preferences Tabelle
ALTER TABLE user_preferences ADD COLUMN screenshot_analysis_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN auto_detect_schleupen BOOLEAN DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN screenshot_confidence_threshold DECIMAL(3,2) DEFAULT 0.6;
```

## Sicherheit und Performance

### Datei-Validierung
- **Größenbegrenzung**: 10MB Maximum
- **Format-Prüfung**: Nur Bildformate erlaubt
- **Malware-Schutz**: File-Header Validierung

### Performance-Optimierung
- **Bildkompression**: Automatische Optimierung mit Sharp
- **Zwischenspeicherung**: Temporäre Dateien werden automatisch gelöscht
- **Async-Verarbeitung**: Analyse läuft im Hintergrund

### Datenschutz
- **Lokale Speicherung**: Screenshots werden lokal gespeichert
- **Automatische Löschung**: Alte Screenshots werden periodisch gelöscht
- **Anonymisierung**: Persönliche Daten werden vor Analyse entfernt

## Troubleshooting

### Häufige Probleme

1. **Upload fehlgeschlagen**
   ```bash
   # Prüfe Upload-Verzeichnis Berechtigungen
   chmod 755 uploads/
   chown www-data:www-data uploads/
   ```

2. **Analyse nicht verfügbar**
   ```bash
   # Prüfe Google API Key
   echo $GOOGLE_API_KEY
   ```

3. **Niedrige Konfidenz-Werte**
   ```sql
   -- Senke Schwellenwert in user_preferences
   UPDATE user_preferences 
   SET screenshot_confidence_threshold = 0.4 
   WHERE user_id = 'user-id';
   ```

### Logging und Debugging

```typescript
// Debug-Modus aktivieren
DEBUG=screenshot:* npm run dev

// Logs prüfen
tail -f logs/screenshot-analysis.log
```

## Erweiterungsmöglichkeiten

### 1. Erweiterte OCR-Integration
```typescript
// Tesseract.js für bessere Texterkennung
import Tesseract from 'tesseract.js';
```

### 2. Bildannotation
```typescript
// Canvas-basierte Annotation für Markup
import fabric from 'fabric';
```

### 3. Batch-Verarbeitung
```typescript
// Mehrere Screenshots gleichzeitig analysieren
const analyzeMultipleScreenshots = async (files: File[]) => {
  return Promise.all(files.map(analyzeScreenshot));
};
```

### 4. Integration mit Ticketing-Systemen
```typescript
// Automatische Ticket-Erstellung bei Fehlern
if (analysis.errorMessages.length > 0) {
  await createSupportTicket(analysis);
}
```

## API-Referenz

### ScreenshotAnalysisService

```typescript
class ScreenshotAnalysisService {
  analyzeScreenshot(imagePath: string): Promise<ScreenshotAnalysis>
  generateContextPrompt(userMessage: string, analysis: ScreenshotAnalysis): string
  saveScreenshot(file: File, chatId: string, messageId: string): Promise<string>
}
```

### ScreenshotAnalysis Interface

```typescript
interface ScreenshotAnalysis {
  detectedElements: DetectedElement[];
  errorMessages: string[];
  uiComponents: UIComponent[];
  confidence: number;
  isSchleupnCS30: boolean;
  extractedText: string;
  analysis: string;
}
```

## Support und Wartung

- **Logs**: `/logs/screenshot-analysis.log`
- **Monitoring**: Prometheus-Metriken für Upload/Analyse-Raten
- **Alerts**: Slack/Email bei hohen Fehlerquoten
- **Backup**: Tägliche Sicherung der Upload-Verzeichnisse

---

**Entwickelt für Willi-Mako von STROMDAO GmbH**
**Version**: 1.0.0
**Letztes Update**: August 2025
