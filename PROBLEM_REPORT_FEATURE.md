# Problem Melden Feature - Implementierung

## Übersicht

Die neue "Problem Melden" Funktion ermöglicht es Benutzern, Probleme oder Fehler direkt aus der Anwendung heraus zu melden. Die Funktion unterstützt:

- Textbeschreibung des Problems
- Kategorisierung (Chat, FAQ, UI, Performance, etc.)
- Upload von bis zu 5 Screenshots
- Automatische Erfassung von Browser-Info und aktueller Seite
- E-Mail-Versendung an das Support-Team

## Implementierte Komponenten

### Backend

1. **Problem Report Route** (`/src/routes/problemReport.ts`)
   - `POST /api/problem-report/submit` - Problem-Meldung mit Screenshots
   - `GET /api/problem-report/categories` - Verfügbare Kategorien
   - Multer-Integration für File-Uploads
   - Validation und Error-Handling

2. **EmailService Erweiterung** (`/src/services/emailService.ts`)
   - `sendProblemReport()` - Neue Methode für Problem-E-Mails
   - `generateProblemReportHTML()` - HTML-Template für E-Mails
   - Support für E-Mail-Attachments
   - Erweiterte EmailOptions mit Attachment-Support

3. **Server Integration** (`/src/server.ts`)
   - Neue Route registriert unter `/api/problem-report`
   - Authentication erforderlich
   - Uploads-Ordner für Screenshots

### Frontend

1. **ProblemReportDialog Komponente** (`/app-legacy/src/components/ProblemReportDialog.tsx`)
   - Material-UI Dialog mit responsive Design
   - Kategorie-Auswahl (Dropdown)
   - Multi-line Text-Eingabe für Problembeschreibung
   - Screenshot-Upload mit Drag&Drop
   - Preview der hochgeladenen Bilder
   - Progress-Anzeige während Upload
   - Error-Handling und Success-Feedback

2. **Layout Integration** (`/app-legacy/src/components/Layout.tsx`)
   - "Problem melden" Button im Footer
   - Rotes Design für hohe Sichtbarkeit
   - Responsive Platzierung
   - Integration des ProblemReportDialog

## Funktionsweise

### Problem Melden Workflow

1. **Benutzer klickt "Problem melden"** im Footer
2. **Dialog öffnet sich** mit Formular
3. **Benutzer füllt aus:**
   - Kategorie (Dropdown)
   - Problembeschreibung (Pflichtfeld)
   - Zusätzliche Informationen (optional)
   - Screenshots (optional, max 5)
4. **Automatische Erfassung:**
   - Aktuelle URL/Seite
   - Browser-Informationen
   - Viewport-Größe
5. **Submission:**
   - FormData mit Multipart-Upload
   - Server validiert und speichert Screenshots
   - E-Mail wird an willi@stromhaltig.de gesendet
6. **Success-Feedback** und Dialog schließt sich

### E-Mail Template

Die generierte E-Mail enthält:
- Kategorisiertes Problem mit Badge
- Vollständige Problembeschreibung
- Technische Informationen (Browser, Seite, Zeit)
- Screenshot-Anhänge (falls vorhanden)
- Benutzer-Informationen
- Professionelles HTML-Design

### File Upload Handling

- **Erlaubte Dateien:** Nur Bilder (image/*)
- **Max. Dateigröße:** 10MB pro Datei
- **Max. Anzahl:** 5 Screenshots
- **Speicherort:** `/uploads/problem-reports/`
- **Naming:** `problem-{uuid}.{extension}`
- **Cleanup:** Automatische Bereinigung bei Fehlern

## Sicherheit & Validation

### Backend Validation
- Authentication erforderlich (JWT Token)
- File-Type Validation (nur Bilder)
- File-Size Limits (10MB)
- Request-Size Limits (50MB total)
- Input Sanitization

### Frontend Validation
- Pflichtfeld-Validation
- Client-side File-Type Check
- File-Size Pre-Check
- Progress-Feedback
- Error-Handling mit User-Feedback

## Kategorien

Die verfügbaren Problem-Kategorien sind:
- Allgemein
- Chat-Funktionalität
- Marktpartner-Suche
- FAQ-System
- Quiz-System
- Dokument-Upload
- Teams & Zusammenarbeit
- Benutzeroberfläche
- Performance
- Datenfehler
- Sonstiges

## API Endpoints

### POST /api/problem-report/submit
```typescript
// Request (multipart/form-data)
{
  problemDescription: string;
  category: string;
  additionalInfo?: string;
  currentPage: string;
  browserInfo: string;
  screenshots: File[];
}

// Response
{
  success: boolean;
  message: string;
  screenshotsUploaded: number;
}
```

### GET /api/problem-report/categories
```typescript
// Response
{
  success: boolean;
  data: string[];
}
```

## Integration mit bestehender "Fehler melden" Funktion

Die neue "Problem melden" Funktion ergänzt die bestehende "Fehler melden" Funktion in der Marktpartner-Suche:

- **Fehler melden:** Spezifisch für Marktpartner-Datenfehler
- **Problem melden:** Allgemeine Probleme in der gesamten Anwendung

Beide nutzen den gleichen EmailService, aber unterschiedliche Templates und Workflows.

## Deployment Notes

- Upload-Ordner muss existieren: `/uploads/problem-reports/`
- SMTP-Konfiguration muss korrekt sein
- File-System Permissions für Upload-Ordner
- Nginx/Apache Konfiguration für File-Uploads
- Rate-Limiting für Upload-Endpoints empfohlen

## Testing

### Frontend Testing
- Dialog öffnen/schließen
- Form-Validation (Pflichtfelder)
- File-Upload (erlaubte/nicht erlaubte Dateien)
- Progress-Anzeige
- Error-Handling
- Success-Feedback

### Backend Testing
- API-Endpoints (mit/ohne Auth)
- File-Upload Limits
- E-Mail Versendung
- Error-Handling
- File-System Operations

## Erweiterungsmöglichkeiten

1. **Admin Dashboard** für Problem-Verwaltung
2. **Status-Tracking** für eingereichte Probleme
3. **Automatische Kategorisierung** mit ML
4. **Integration mit Ticketing-System**
5. **Benutzer-Feedback** nach Problem-Lösung
6. **Analytics** für häufige Probleme
