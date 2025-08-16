# Screenshot-Analyse Tool

## Übersicht

Das Screenshot-Analyse Tool ermöglicht es Mitarbeitern in der Marktkommunikation, Screenshots hochzuladen oder aus der Zwischenablage einzufügen, um automatisch Energiewirtschafts-Codes und weitere relevante Informationen zu extrahieren.

## Funktionen

### Unterstützte Code-Typen

- **MaLo (Marktlokations-ID)**: 11-stellige Zahl zur Identifikation von Marktlokationen
- **MeLo (Messlokations-ID)**: 33-stellige alphanumerische ID zur Identifikation von Messlokationen  
- **EIC-Code**: 16-stelliger Energy Identification Code für europäische Energiemarkt-Teilnehmer
- **BDEW Code-Nummer**: 13-stellige Zahl zur Identifikation von Marktpartnern nach BDEW-Standard

### Zusätzliche Informationen

- Namen von Personen und Unternehmen
- Adressen (Straße, PLZ, Ort)
- E-Mail-Adressen  
- Telefonnummern
- Automatische BDEW-Marktpartner-Informationen aus der Datenbank

## Integration

### Legacy-App (React/Express)

**Komponente**: `app-legacy/src/components/ScreenshotAnalyzer.tsx`
**Seite**: `app-legacy/src/pages/ScreenshotAnalysis.tsx`
**Route**: `/screenshot-analysis`
**API**: Express.js Route `/api/analyze-screenshot`

### Next.js App (Öffentliche Seiten)

**Komponente**: `src/components/ScreenshotAnalyzer.tsx`
**Seite**: `src/pages/screenshot-analysis.tsx`
**Route**: `/screenshot-analysis`
**API**: Next.js API Route `/api/analyze-screenshot`

## API Endpunkte

### POST /api/analyze-screenshot

**Beschreibung**: Analysiert ein hochgeladenes Screenshot-Bild und extrahiert Energiewirtschafts-Codes

**Content-Type**: `multipart/form-data`

**Parameter**:
- `image`: Bilddatei (PNG, JPG, JPEG, etc.)

**Antwort**:
```json
{
  "codes": [
    {
      "type": "MaLo|MeLo|EIC|BDEW",
      "value": "12345678901",
      "confidence": 0.95,
      "context": "Beschreibung wo der Code gefunden wurde"
    }
  ],
  "additionalInfo": {
    "name": "Erkannter Name",
    "address": "Erkannte Straße",
    "city": "Erkannte Stadt",
    "postalCode": "12345",
    "email": "email@example.com",
    "phone": "0123456789"
  },
  "bdewPartnerInfo": {
    "name": "Marktpartner GmbH",
    "address": "Musterstraße 1",
    "city": "Musterstadt",
    "postalCode": "12345",
    "contact": "Ansprechpartner",
    "website": "https://example.com"
  },
  "rawText": "Der gesamte erkannte Text aus dem Bild"
}
```

**Fehler-Antworten**:
- `400`: Keine Bilddatei übertragen
- `500`: Interner Server-Fehler bei der Analyse

## Konfiguration

### Umgebungsvariablen

- `GOOGLE_AI_API_KEY`: API-Schlüssel für Google Generative AI (Gemini)
- `DATABASE_URL`: PostgreSQL-Datenbankverbindung für BDEW-Code-Lookup

### Dependencies

- `@google/generative-ai`: Google Generative AI SDK
- `multer`: Datei-Upload-Middleware
- `@mui/material`: Material-UI Komponenten
- `@mui/icons-material`: Material-UI Icons

## Sicherheit

- **Keine Authentifikation erforderlich**: Das Tool ist als öffentlicher Service konzipiert
- **Keine Datenspeicherung**: Screenshots werden nur temporär für die Analyse verwendet und nicht gespeichert
- **Rate Limiting**: Standard Express Rate Limiting angewendet
- **Dateigröße-Limit**: 10MB Maximum für Upload-Dateien
- **Dateityp-Validierung**: Nur Bilddateien sind erlaubt

## Verwendung

### In der Sidebar (beide Apps)

Das Tool ist in der Sidebar beider Anwendungen als "Screenshot-Analyse" verfügbar.

### Standalone-Seiten

- Legacy-App: `/app/screenshot-analysis`
- Next.js-App: `/screenshot-analysis`

### Copy & Paste Workflow

1. Screenshot mit Snipping Tool oder ähnlichem erstellen
2. Screenshot in Zwischenablage kopieren (Strg+C)
3. Auf "Screenshot einfügen & analysieren" klicken
4. Erkannte Codes und Informationen werden angezeigt
5. Mit Klick auf Copy-Icons können Werte in die Zwischenablage kopiert werden

## Problemlösung

Das Tool löst ein häufiges Problem in der Marktkommunikation: Das fehleranfällige manuelle Abtippen von Codes aus Screenshots. Durch die automatisierte LLM-basierte Erkennung werden Fehler reduziert und die Effizienz erhöht.

## Testing

Verwende das Testscript:
```bash
./test-screenshot-analysis.sh
```

## Code-Validierung

Die extrahierten Codes werden gegen folgende Regex-Pattern validiert:

- **MaLo**: `^\d{11}$` (exakt 11 Ziffern)
- **MeLo**: `^[A-Z0-9]{33}$` (exakt 33 alphanumerische Zeichen)
- **EIC**: `^[A-Z0-9]{16}$` (exakt 16 alphanumerische Zeichen)
- **BDEW**: `^\d{13}$` (exakt 13 Ziffern)

Nur validierte Codes werden in der Antwort zurückgegeben.
