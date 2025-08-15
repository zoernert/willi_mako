# Bilaterale Klärfälle - API-Referenz

## Übersicht

Diese API-Referenz dokumentiert alle verfügbaren Endpunkte für das System der bilateralen Klärfälle. Die API folgt REST-Prinzipien und verwendet JSON für Request- und Response-Bodies.

## Basis-URL

```
Production: https://stromhaltig.de/api/bilateral-clarifications
Development: http://localhost:3000/api/bilateral-clarifications
```

## Authentifizierung

Alle API-Endpunkte erfordern eine gültige JWT-Authentifizierung:

```http
Authorization: Bearer <jwt-token>
```

## Standard-Response-Format

### Erfolgreiche Antworten
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation erfolgreich",
  "timestamp": "2025-08-15T10:30:00Z"
}
```

### Fehler-Antworten
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Benutzerfreundliche Fehlermeldung",
  "details": "Technische Details (nur in Development)"
}
```

## Endpunkte

### 1. Klärfälle auflisten

**GET** `/api/bilateral-clarifications`

Ruft eine paginierte Liste aller zugänglichen Klärfälle ab.

#### Query-Parameter
| Parameter | Typ | Beschreibung | Default |
|-----------|-----|--------------|---------|
| `page` | number | Seitennummer | 1 |
| `limit` | number | Anzahl pro Seite | 20 |
| `status` | string[] | Status-Filter | - |
| `priority` | string[] | Prioritäts-Filter | - |
| `marketPartner` | string | Marktpartner-Suche | - |
| `search` | string | Volltext-Suche | - |
| `sortField` | string | Sortier-Feld | createdAt |
| `sortDirection` | string | Sortier-Richtung | desc |

#### Beispiel-Request
```http
GET /api/bilateral-clarifications?page=1&limit=10&status=OPEN,IN_PROGRESS&priority=HIGH
```

#### Beispiel-Response
```json
{
  "clarifications": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Problem mit UTILMD-Übertragung",
      "description": "Fehlerhafter Wechselprozess...",
      "marketPartnerCode": "9900123456789",
      "marketPartnerName": "Stadtwerke Beispiel GmbH",
      "status": "OPEN",
      "priority": "HIGH",
      "createdAt": "2025-08-15T08:30:00Z",
      "attachmentCount": 2,
      "noteCount": 5,
      "isOverdue": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  },
  "summary": {
    "totalOpen": 5,
    "totalInProgress": 8,
    "overdueCases": 2
  }
}
```

### 2. Einzelnen Klärfall abrufen

**GET** `/api/bilateral-clarifications/:id`

Ruft einen spezifischen Klärfall mit allen Details ab.

#### URL-Parameter
| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `id` | UUID | Klärfall-ID |

#### Beispiel-Response
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Problem mit UTILMD-Übertragung",
  "description": "Detaillierte Beschreibung...",
  "marketPartnerCode": "9900123456789",
  "marketPartnerName": "Stadtwerke Beispiel GmbH",
  "status": "INTERNAL",
  "priority": "HIGH",
  "createdAt": "2025-08-15T08:30:00Z",
  "attachments": [...],
  "notes": [...],
  "emails": [...],
  "teamComments": [...]
}
```

### 3. Neuen Klärfall erstellen

**POST** `/api/bilateral-clarifications`

Erstellt einen neuen Klärfall.

#### Request-Body
```json
{
  "title": "Problem mit UTILMD-Übertragung",
  "description": "Detaillierte Problembeschreibung...",
  "marketPartner": {
    "code": "9900123456789",
    "companyName": "Stadtwerke Beispiel GmbH"
  },
  "selectedRole": {
    "role": "VNB",
    "description": "Verteilnetzbetreiber"
  },
  "selectedContact": {
    "name": "Max Mustermann",
    "email": "marktprozesse@stadtwerke-beispiel.de"
  },
  "dataExchangeReference": {
    "messageType": "UTILMD",
    "dar": "123456789012345"
  },
  "priority": "HIGH",
  "tags": ["wechselprozess", "utilmd"]
}
```

#### Response
```json
{
  "message": "Klärfall erfolgreich erstellt",
  "clarification": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Problem mit UTILMD-Übertragung",
    "status": "OPEN",
    "createdAt": "2025-08-15T10:30:00Z"
  }
}
```

### 4. Klärfall aktualisieren

**PUT** `/api/bilateral-clarifications/:id`

Aktualisiert einen bestehenden Klärfall.

#### Request-Body
```json
{
  "title": "Aktualisierter Titel",
  "description": "Neue Beschreibung",
  "priority": "MEDIUM",
  "status": "IN_PROGRESS",
  "assignedTo": "user-id-123",
  "tags": ["updated", "progress"]
}
```

### 5. Status aktualisieren

**PATCH** `/api/bilateral-clarifications/:id/status`

Aktualisiert nur den Status eines Klärfalls.

#### Request-Body
```json
{
  "status": "SEND_TO_PARTNER",
  "internalStatus": "READY",
  "reason": "Interne Klärung abgeschlossen"
}
```

### 6. E-Mail versenden

**POST** `/api/bilateral-clarifications/:id/send-email`

Versendet eine E-Mail an den Marktpartner.

#### Request-Body
```json
{
  "to": "marktprozesse@stadtwerke-beispiel.de",
  "cc": "backup@example.com",
  "subject": "Klärfall #12345 - UTILMD Problem",
  "body": "Sehr geehrte Damen und Herren...",
  "includeAttachments": true,
  "attachmentIds": ["att-1", "att-2"]
}
```

#### Response
```json
{
  "success": true,
  "messageId": "msg-123-456-789",
  "sentAt": "2025-08-15T11:00:00Z"
}
```

### 7. E-Mail-Adresse validieren

**GET** `/api/bilateral-clarifications/validate-email`

Validiert die E-Mail-Adresse für einen Marktpartner und Rolle.

#### Query-Parameter
| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `marketPartnerCode` | string | Marktpartner-Code |
| `role` | string | Marktrolle |

#### Beispiel-Response
```json
{
  "isValid": true,
  "email": "marktprozesse@stadtwerke-beispiel.de",
  "contactName": "Max Mustermann",
  "companyName": "Stadtwerke Beispiel GmbH"
}
```

### 8. Anhänge hochladen

**POST** `/api/bilateral-clarifications/:id/attachments`

Lädt Anhänge zu einem Klärfall hoch.

#### Request (Multipart/Form-Data)
```
Content-Type: multipart/form-data

attachments: [File, File, ...]
attachmentType: "DOCUMENT"
attachmentCategory: "EVIDENCE"
description: "Relevante Dokumente"
isSensitive: false
```

#### Response
```json
{
  "message": "Anhänge erfolgreich hochgeladen",
  "attachments": [
    {
      "id": "att-123",
      "filename": "document.pdf",
      "originalFilename": "original-document.pdf",
      "fileSize": 1024000,
      "uploadedAt": "2025-08-15T11:30:00Z"
    }
  ]
}
```

### 9. Notiz hinzufügen

**POST** `/api/bilateral-clarifications/:id/notes`

Fügt eine Notiz zu einem Klärfall hinzu.

#### Request-Body
```json
{
  "content": "Wichtige Erkenntnisse aus der Analyse...",
  "noteType": "USER",
  "isInternal": true,
  "tags": ["analysis", "important"],
  "isPinned": false
}
```

### 10. E-Mail-Record hinzufügen

**POST** `/api/bilateral-clarifications/:id/emails`

Fügt einen E-Mail-Datensatz hinzu (für empfangene E-Mails).

#### Request-Body
```json
{
  "direction": "INCOMING",
  "subject": "Re: Klärfall #12345",
  "fromAddress": "partner@example.com",
  "toAddresses": ["our-email@company.com"],
  "content": "E-Mail-Inhalt...",
  "contentType": "html",
  "emailType": "RESPONSE"
}
```

### 11. Team-Freigabe

**POST** `/api/bilateral-clarifications/:id/share-team`

Gibt einen Klärfall für das Team frei.

#### Response
```json
{
  "message": "Klärfall erfolgreich für Team freigegeben",
  "clarification": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "sharedWithTeam": true
  }
}
```

### 12. Team-Kommentar hinzufügen

**POST** `/api/bilateral-clarifications/:id/team-comments`

Fügt einen Team-Kommentar hinzu.

#### Request-Body
```json
{
  "content": "Das ist meine Einschätzung...",
  "parentCommentId": "comment-123",
  "mentionedUsers": ["user-1", "user-2"]
}
```

### 13. Klärfall archivieren

**DELETE** `/api/bilateral-clarifications/:id`

Archiviert einen Klärfall (Soft Delete).

#### Response
```json
{
  "message": "Klärfall erfolgreich archiviert"
}
```

## Datenmodelle

### Klärfall (Clarification)
```typescript
interface BilateralClarification {
  id: string;
  title: string;
  description: string;
  marketPartnerCode: string;
  marketPartnerName: string;
  caseType: 'B2B' | 'B2C' | 'REGULATORY';
  status: ClarificationStatus;
  priority: ClarificationPriority;
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  resolutionDate?: string;
  resolutionNotes?: string;
  tags: string[];
  sharedWithTeam: boolean;
  teamId: string;
  archived: boolean;
  archivedAt?: string;
}
```

### Status-Aufzählung
```typescript
enum ClarificationStatus {
  OPEN = 'OPEN',
  INTERNAL = 'INTERNAL',
  SEND_TO_PARTNER = 'SEND_TO_PARTNER',
  SENT = 'SENT',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_RESPONSE = 'WAITING_FOR_RESPONSE',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED'
}
```

### Priorität-Aufzählung
```typescript
enum ClarificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}
```

### Anhang (Attachment)
```typescript
interface ClarificationAttachment {
  id: string;
  clarificationId: string;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  attachmentType: 'DOCUMENT' | 'IMAGE' | 'EMAIL' | 'OTHER';
  attachmentCategory: 'EVIDENCE' | 'CORRESPONDENCE' | 'ANALYSIS' | 'GENERAL';
  description?: string;
  isSensitive: boolean;
}
```

### Notiz (Note)
```typescript
interface ClarificationNote {
  id: string;
  clarificationId: string;
  content: string;
  noteType: 'USER' | 'SYSTEM' | 'LLM';
  createdBy: string;
  createdAt: string;
  isInternal: boolean;
  linkedAttachmentId?: string;
  linkedEmailId?: string;
  tags: string[];
  isPinned: boolean;
}
```

## Fehler-Codes

| Code | HTTP Status | Beschreibung |
|------|-------------|--------------|
| `CLARIFICATION_NOT_FOUND` | 404 | Klärfall nicht gefunden |
| `INSUFFICIENT_PERMISSIONS` | 403 | Keine Berechtigung |
| `VALIDATION_ERROR` | 400 | Eingabedaten ungültig |
| `MARKET_PARTNER_NOT_FOUND` | 400 | Marktpartner existiert nicht |
| `INVALID_DAR_FORMAT` | 400 | DAR-Format ungültig |
| `EMAIL_SEND_FAILED` | 500 | E-Mail konnte nicht versendet werden |
| `FILE_TOO_LARGE` | 400 | Datei zu groß |
| `UNSUPPORTED_FILE_TYPE` | 400 | Dateityp nicht unterstützt |

## Rate Limiting

- **Standard-Endpunkte**: 100 Requests pro Minute
- **Upload-Endpunkte**: 20 Requests pro Minute  
- **E-Mail-Versand**: 10 Requests pro Minute

## Webhooks

Das System unterstützt Webhooks für wichtige Ereignisse:

### Verfügbare Events
- `clarification.created`
- `clarification.status_changed`
- `clarification.email_sent`
- `clarification.team_shared`

### Webhook-Payload
```json
{
  "event": "clarification.status_changed",
  "timestamp": "2025-08-15T12:00:00Z",
  "data": {
    "clarificationId": "123e4567-e89b-12d3-a456-426614174000",
    "oldStatus": "INTERNAL",
    "newStatus": "SEND_TO_PARTNER",
    "changedBy": "user-123"
  }
}
```

## SDK und Libraries

### JavaScript/TypeScript
```bash
npm install @willi-mako/bilateral-clarifications-client
```

```typescript
import { BilateralClarificationsClient } from '@willi-mako/bilateral-clarifications-client';

const client = new BilateralClarificationsClient({
  baseUrl: 'https://stromhaltig.de/api',
  apiKey: 'your-jwt-token'
});

const clarifications = await client.getClarifications({
  page: 1,
  limit: 10,
  status: ['OPEN', 'IN_PROGRESS']
});
```

## Versionierung

Die API verwendet semantische Versionierung. Die aktuelle Version ist `v1`.

### Breaking Changes
- Werden in Major-Versionen eingeführt
- Mindestens 6 Monate Vorlaufzeit
- Dokumentation aller Änderungen

### Deprecations
- Werden in Minor-Versionen markiert
- Entfernung erst in nächster Major-Version
- Alternative Endpunkte werden bereitgestellt

---

**API-Version**: v1.0  
**Letzte Aktualisierung**: 15. August 2025  
**Kontakt**: api-support@willi-mako.de
