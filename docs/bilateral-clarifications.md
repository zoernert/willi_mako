# Bilaterale Klärfälle - Systemdokumentation

## Überblick

Das System für bilaterale Klärfälle in Willi-Mako ermöglicht es Mitarbeitern in der Marktkommunikation bei Energieversorgern, strukturiert und nachvollziehbar Klärfälle mit Marktpartnern zu bearbeiten. Der Prozess umfasst die komplette Abwicklung von der initialen Problemstellung bis zur Lösung oder dem Abschluss des Falls.

## Funktionsumfang

### Kernfunktionen
- **Klärfall-Erstellung** mit Marktpartner-Integration und DAR-Validierung
- **Strukturierter Workflow** von interner Klärung bis zur qualifizierten Anfrage
- **Timeline-basierte Dokumentation** aller Aktivitäten und Statusänderungen
- **LLM-unterstützte E-Mail-Generierung** für professionelle Kommunikation
- **Team-Kollaboration** mit geteilten Klärfällen und Kommentaren
- **Umfassendes Attachment-Management** für Dokumentation
- **Integrierte Workflow-Demo** für Schulung und Onboarding

### Unterstützte Workflow-Phasen
1. **Erfassung und Strukturierung** des Problems
2. **Interne Klärung** mit Chat- und Notiz-Integration
3. **Qualifizierte Anfrage** an Marktpartner mit LLM-Unterstützung
4. **Antwort-Verarbeitung** und Entscheidungsfindung
5. **Abschluss oder Wiederaufnahme** des Klärfalls

## Systemarchitektur

### Frontend-Komponenten
```
BilateralClarificationsPage (Hauptkomponente)
├── ClarificationsList (Listenansicht)
├── ClarificationDetailModal (Detailansicht)
├── CreateClarificationModal (Erstellung)
├── WorkflowStatusCard (Status-Management)
├── ClarificationTimeline (Aktivitätsverlauf)
├── LLMEmailComposerDialog (E-Mail-Erstellung)
├── WorkflowDemoTab (Schulungsmodul)
└── Verschiedene Hilfskomponenten
```

### Backend-Endpunkte
```
GET    /api/bilateral-clarifications           # Liste aller Klärfälle
GET    /api/bilateral-clarifications/:id       # Einzelner Klärfall mit Details
POST   /api/bilateral-clarifications           # Neuen Klärfall erstellen
PUT    /api/bilateral-clarifications/:id       # Klärfall aktualisieren
DELETE /api/bilateral-clarifications/:id       # Klärfall archivieren
PATCH  /api/bilateral-clarifications/:id/status # Status aktualisieren
POST   /api/bilateral-clarifications/:id/send-email # E-Mail versenden
GET    /api/bilateral-clarifications/validate-email # E-Mail-Validierung
POST   /api/bilateral-clarifications/:id/attachments # Anhänge hochladen
POST   /api/bilateral-clarifications/:id/notes # Notizen hinzufügen
POST   /api/bilateral-clarifications/:id/emails # E-Mail-Records hinzufügen
```

### Datenbankschema
```sql
bilateral_clarifications (Haupttabelle)
├── clarification_attachments (Anhänge)
├── clarification_notes (Notizen)
├── clarification_emails (E-Mail-Verlauf)
├── clarification_team_comments (Team-Kommentare)
├── clarification_team_activities (Team-Aktivitäten)
└── clarification_status_history (Status-Historie)
```

## Detaillierter Workflow

### 1. Klärfall-Erstellung

#### Erforderliche Eingaben
- **Titel und Beschreibung** des Problems
- **Marktpartner-Auswahl** mit Code und Firmenname
- **Marktrolle** (LF, VNB, MSB, etc.)
- **Kontaktperson** des Marktpartners
- **Datenaustauschreferenz (DAR)** mit Format-Validierung
- **Priorität** (LOW, MEDIUM, HIGH, CRITICAL)
- **Tags** für Kategorisierung (optional)

#### Validierungen
- Marktpartner muss existieren und aktiv sein
- DAR-Format muss dem Nachrichtentyp entsprechen
- Kontaktdaten müssen verfügbar sein
- Benutzer muss entsprechende Berechtigung haben

#### Automatische Aktionen
- Eindeutige ID-Generierung
- Initial-Status "OPEN" setzen
- Team-Zuordnung basierend auf Ersteller
- Timeline-Eintrag für Erstellung
- Benachrichtigung an zugewiesene Person (falls definiert)

### 2. Interne Klärung (Status: INTERNAL)

#### Verfügbare Aktionen
- **Chat-Integration**: Direkte Weiterleitung zum Chat mit Kontext
- **Notizen erstellen**: Strukturierte Dokumentation von Erkenntnissen
- **LLM-Analyse**: KI-unterstützte Aufbereitung von Informationen
- **Anhänge hinzufügen**: Relevante Dokumente sammeln
- **Team-Freigabe**: Kollegen zur Unterstützung hinzuziehen

#### Chat-Integration Features
- Automatische Kontext-Übertragung mit Klärfall-Details
- Rückführung von Chat-Erkenntnissen als strukturierte Notizen
- Tag-basierte Verknüpfung zwischen Chat und Klärfall
- Navigation zwischen Chat und Klärfall-Detail

#### Notiz-System
- **Titel und Inhalt**: Strukturierte Dokumentation
- **Automatische Tags**: Verknüpfung mit Klärfall-ID
- **Zeitstempel**: Nachvollziehbare Chronologie
- **Benutzer-Zuordnung**: Eindeutige Autorschaft
- **LLM-Verarbeitung**: KI-unterstützte Aufbereitung

### 3. Qualifizierte Anfrage (Status: SEND_TO_PARTNER)

#### LLM-E-Mail-Generierung
- **Automatische Vorschläge** basierend auf Klärfall-Daten
- **Professionelle Formulierung** mit Fachterminologie
- **Vollständige Kontext-Integration** aller relevanten Informationen
- **Editier-Möglichkeit** vor dem Versand
- **Template-Fallback** bei LLM-Ausfall

#### E-Mail-Optionen
1. **"Direkt senden"**: Automatischer Versand mit Status-Update
2. **"Bereits gesendet"**: Manueller Status-Update ohne Versand
3. **"Abbrechen"**: Rückkehr zum vorherigen Status

#### Automatische Aktionen beim Versand
- Status-Update auf "SENT"
- E-Mail-Record in Datenbank
- Timeline-Eintrag mit E-Mail-Details
- Timestamp für Nachverfolgung
- Anhänge optional hinzufügen

### 4. Antwort-Verarbeitung (Status: SENT)

#### Nach Erhalt einer Partner-Antwort
- **Antwort schließen**: Problem als gelöst markieren
- **Interne Klärung fortsetzen**: Weitere interne Bearbeitung
- **Neue Anfrage**: Erneute Kommunikation mit Partner

#### Status-Übergänge
- `SENT` → `CLOSED` (Problem gelöst)
- `SENT` → `INTERNAL` (weitere Klärung nötig)
- `SENT` → `REOPENED` (Fall wieder aufgenommen)

### 5. Abschluss und Archivierung

#### Abschluss-Optionen
- **CLOSED**: Erfolgreich gelöst
- **RESOLVED**: Zufriedenstellend bearbeitet
- **ARCHIVED**: Nicht mehr relevant

#### Wiederaufnahme-Möglichkeit
- Geschlossene Fälle können reaktiviert werden
- Vollständige Historie bleibt erhalten
- Neue Timeline-Einträge für Reaktivierung

## Timeline-System

### Aktivitätstypen
- **Erstellung**: Initialer Klärfall-Eintrag
- **Status-Änderungen**: Alle Workflow-Übergänge
- **Notizen**: Strukturierte Dokumentation
- **E-Mails**: Versendete und empfangene Nachrichten
- **Anhänge**: Hochgeladene Dokumente
- **Team-Aktivitäten**: Freigaben und Kommentare

### Timeline-Features
- **Chronologische Sortierung** aller Aktivitäten
- **Expandierbare Einträge** für detaillierte Ansicht
- **Inline-Notiz-Erstellung** direkt in der Timeline
- **Kontext-Links** zu verwandten Aktivitäten
- **Benutzer-Attribution** für alle Aktionen

## Team-Kollaboration

### Freigabe-Mechanismus
- **Ersteller-Kontrolle**: Nur Ersteller kann für Team freigeben
- **Team-Sichtbarkeit**: Alle Team-Mitglieder sehen geteilte Fälle
- **Kommentar-System**: Strukturierte Team-Diskussion
- **Erwähnungen**: @-Mentions für direkte Benachrichtigung

### Berechtigungen
- **Ersteller**: Vollzugriff auf eigene Klärfälle
- **Zugewiesene Person**: Bearbeitungsrechte
- **Team-Mitglieder**: Lesezugriff bei geteilten Fällen
- **Administratoren**: Vollzugriff auf alle Fälle

## Attachment-Management

### Unterstützte Dateitypen
- **Bilder**: JPEG, PNG, GIF
- **Dokumente**: PDF, DOC, DOCX
- **Tabellen**: XLS, XLSX
- **Text**: TXT, XML
- **E-Mails**: EML

### Features
- **Multi-Upload**: Bis zu 5 Dateien gleichzeitig
- **Größenbegrenzung**: 10MB pro Datei
- **Kategorisierung**: Automatische Typen-Erkennung
- **Sicherheit**: Sensitive Daten markierbar
- **Versionierung**: Historie aller Uploads

## LLM-Integration

### E-Mail-Generierung
- **Kontext-Analyse**: Verarbeitung aller Klärfall-Daten
- **Professionelle Sprache**: Angemessene Fachterminologie
- **Vollständigkeit**: Alle relevanten Informationen enthalten
- **Anpassbarkeit**: Benutzer kann vor Versand editieren

### Notiz-Verarbeitung
- **Chat-Zusammenfassung**: Extraktion relevanter Punkte
- **Strukturierung**: Logische Gliederung von Informationen
- **Tag-Generierung**: Automatische Kategorisierung
- **Handlungsempfehlungen**: Nächste Schritte vorschlagen

## Workflow-Demo

### Integriertes Schulungsmodul
- **Konzept-Erklärung**: Marktpartner-Integration und DAR-Handling
- **Interaktiver Stepper**: Schritt-für-Schritt Workflow-Demonstration
- **Live-Demo**: Echte Klärfall-Erstellung zum Testen
- **Kontext-Navigation**: Direkte Verlinkung zu produktiven Funktionen

### Lernziele
- Verständnis des bilateralen Klärfall-Prozesses
- Praktische Anwendung der System-Features
- Effiziente Nutzung der verfügbaren Tools
- Best Practices für Marktpartner-Kommunikation

## Technische Details

### Performance-Optimierungen
- **Paginierung**: Große Datenmengen in Teilen laden
- **Lazy Loading**: On-demand Laden von Details
- **Caching**: Häufig genutzte Daten zwischenspeichern
- **Indizierung**: Optimierte Datenbankabfragen

### Sicherheit
- **Authentifizierung**: JWT-basierte Benutzer-Validierung
- **Autorisierung**: Rollenbasierte Zugriffskontrolle
- **Datenvalidierung**: Input-Sanitization auf allen Ebenen
- **Audit-Trail**: Vollständige Nachverfolgung aller Aktionen

### Monitoring und Logging
- **Aktivitäts-Logging**: Alle Benutzer-Aktionen protokolliert
- **Error-Tracking**: Systematische Fehler-Erfassung
- **Performance-Monitoring**: Response-Zeit-Überwachung
- **Usage-Analytics**: Nutzungsstatistiken für Optimierung

## API-Dokumentation

### Authentifizierung
Alle API-Endpunkte erfordern einen gültigen JWT-Token im Authorization-Header:
```
Authorization: Bearer <jwt-token>
```

### Standard-Antwortformat
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation erfolgreich",
  "timestamp": "2025-08-15T10:30:00Z"
}
```

### Fehler-Handling
```json
{
  "success": false,
  "error": "Fehlercode",
  "message": "Benutzerfreundliche Fehlermeldung",
  "details": "Technische Details (nur in Development)"
}
```

## Deployment und Konfiguration

### Umgebungsvariablen
```bash
# Datenbank
DATABASE_URL=postgresql://user:pass@host:port/db

# E-Mail-Konfiguration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
FROM_EMAIL=noreply@marktkommunikation.de

# LLM-Integration
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4

# Upload-Verzeichnis
UPLOAD_DIR=/uploads/clarifications
```

### Installation
```bash
# Dependencies installieren
npm install

# Datenbank-Migration
npm run migrate:bilateral

# Build erstellen
npm run build

# Server starten
npm run start
```

## Wartung und Updates

### Regelmäßige Aufgaben
- **Datenbank-Backup**: Tägliche Sicherung aller Klärfall-Daten
- **Log-Rotation**: Wöchentliche Archivierung alter Log-Dateien
- **Performance-Review**: Monatliche Analyse der System-Performance
- **Security-Updates**: Regelmäßige Aktualisierung der Abhängigkeiten

### Monitoring-Metriken
- Anzahl aktiver Klärfälle
- Durchschnittliche Bearbeitungszeit
- E-Mail-Versand-Erfolgsrate
- LLM-Integration-Performance
- Benutzer-Aktivität und -Zufriedenheit

---

**Erstellt**: 15. August 2025  
**Version**: 1.0  
**Letzte Aktualisierung**: 15. August 2025  
**Autor**: Willi-Mako Development Team
