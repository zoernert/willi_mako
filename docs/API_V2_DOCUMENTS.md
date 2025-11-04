# API v2 - Document Upload Endpoints

Die API v2 unterstützt nun den Upload und die Verwaltung von benutzerdefinierten Dokumenten. Diese Dokumente können optional für den KI-Kontext aktiviert werden und stehen dann in Chat-Anfragen zur Verfügung.

## Endpunkte

### Upload einzelnes Dokument
**POST** `/api/v2/documents/upload`

Upload eines einzelnen Dokuments mit optionalen Metadaten.

**Header:**
- `Authorization: Bearer <token>`

**Body (multipart/form-data):**
- `file` (required): Die Datei zum Upload
- `title` (optional): Titel des Dokuments (Standard: Dateiname)
- `description` (optional): Beschreibung
- `tags` (optional): JSON-Array oder Komma-separierte Tags
- `is_ai_context_enabled` (optional): Boolean - aktiviert KI-Kontext

**Unterstützte Formate:**
- PDF (`.pdf`)
- DOCX (`.docx`)
- Text (`.txt`)
- Markdown (`.md`)

**Limits:**
- Max. Dateigröße: 50MB (konfigurierbar via `MAX_FILE_SIZE` env)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "uuid",
      "title": "Dokument.pdf",
      "original_name": "Dokument.pdf",
      "file_size": 1234567,
      "mime_type": "application/pdf",
      "is_processed": false,
      "is_ai_context_enabled": true,
      "created_at": "2025-01-10T12:00:00Z"
    },
    "message": "Document uploaded successfully. Processing has started."
  }
}
```

---

### Upload mehrerer Dokumente
**POST** `/api/v2/documents/upload-multiple`

Upload von bis zu 10 Dokumenten gleichzeitig.

**Header:**
- `Authorization: Bearer <token>`

**Body (multipart/form-data):**
- `files` (required): Array von Dateien (max. 10)
- `is_ai_context_enabled` (optional): Boolean - aktiviert KI-Kontext für alle Dokumente

**Response (201):**
```json
{
  "success": true,
  "data": {
    "documents": [ /* Array von Document-Objekten */ ],
    "message": "3 documents uploaded successfully. Processing has started."
  }
}
```

---

### Liste aller Dokumente
**GET** `/api/v2/documents`

Abrufen aller Dokumente des angemeldeten Benutzers.

**Query Parameter:**
- `page` (optional, default: 1): Seitennummer
- `limit` (optional, default: 12): Anzahl pro Seite
- `search` (optional): Suchbegriff (Titel/Beschreibung)
- `processed` (optional): Filter nach Verarbeitungsstatus (`true`/`false`)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "documents": [ /* Array von Document-Objekten */ ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 45,
      "totalPages": 4
    }
  }
}
```

---

### Einzelnes Dokument abrufen
**GET** `/api/v2/documents/:id`

Details eines spezifischen Dokuments abrufen.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Dokument.pdf",
    "description": "Beschreibung",
    "tags": ["tag1", "tag2"],
    "is_processed": true,
    "is_ai_context_enabled": true,
    "extracted_text_length": 12345,
    "created_at": "2025-01-10T12:00:00Z",
    "updated_at": "2025-01-10T12:05:00Z"
  }
}
```

---

### Dokument-Metadaten aktualisieren
**PUT** `/api/v2/documents/:id`

Metadaten eines Dokuments ändern.

**Body (JSON):**
```json
{
  "title": "Neuer Titel",
  "description": "Neue Beschreibung",
  "tags": ["neuer-tag"],
  "is_ai_context_enabled": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* Aktualisiertes Document-Objekt */ }
}
```

---

### Dokument löschen
**DELETE** `/api/v2/documents/:id`

Löscht ein Dokument permanent (inkl. Datei und Vektor-Embedding).

**Response (204):** Kein Body

---

### Dokument herunterladen
**GET** `/api/v2/documents/:id/download`

Lädt die Originaldatei herunter.

**Response (200):** Binary file stream mit `Content-Disposition: attachment`

---

### Dokument neu verarbeiten
**POST** `/api/v2/documents/:id/reprocess`

Startet die Textextraktion und Vektor-Indizierung neu.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Document reprocessing started."
  }
}
```

---

### KI-Kontext aktivieren/deaktivieren
**POST** `/api/v2/documents/:id/ai-context`

Schaltet die KI-Kontext-Verfügbarkeit eines Dokuments um.

**Body (JSON):**
```json
{
  "enabled": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* Aktualisiertes Document-Objekt */ }
}
```

---

## Verarbeitung und Indizierung

Nach dem Upload werden Dokumente asynchron verarbeitet:

1. **Textextraktion**: Je nach Format (PDF/DOCX/TXT/MD) wird der Text extrahiert
2. **Vektor-Embedding**: Text wird in Qdrant (`willi_mako` Collection) indiziert
3. **Metadaten**: Gespeichert mit `is_user_document: true`, `user_id`, `access_control`

**Status-Tracking:**
- `is_processed: false` → Verarbeitung läuft
- `is_processed: true` → Bereit für KI-Nutzung

## Verwendung in Chat

Dokumente mit `is_ai_context_enabled: true` sind in Chat-Anfragen verfügbar, wenn:

1. User-Setting `ai_context_enabled: true` gesetzt ist
2. Chat-Request mit `contextSettings.includeUserDocuments: true` gesendet wird

Die Qdrant-Suche filtert automatisch nach `user_id` und `access_control` für Zugriffsschutz.

---

## Fehlerbehandlung

Alle Endpunkte nutzen einheitliche Fehlerformate:

**Beispiel (400 Bad Request):**
```json
{
  "success": false,
  "error": "Unsupported file type. Allowed: PDF, DOCX, TXT, MD",
  "code": "VALIDATION_ERROR"
}
```

**Häufige Fehlercodes:**
- `401 Unauthorized`: Fehlendes/ungültiges Bearer-Token
- `400 Bad Request`: Ungültiges Format, fehlende Datei
- `404 Not Found`: Dokument existiert nicht oder gehört anderem User
- `413 Payload Too Large`: Datei > 50MB

---

## Migration von Legacy API

Die neuen v2-Endpunkte bieten Feature-Parität mit den Legacy-Endpunkten unter `/api/workspace/documents/*`:

| Legacy                          | v2                              |
|---------------------------------|---------------------------------|
| POST /workspace/documents/upload | POST /documents/upload          |
| GET /workspace/documents        | GET /documents                  |
| GET /workspace/documents/:id    | GET /documents/:id              |
| PUT /workspace/documents/:id    | PUT /documents/:id              |
| DELETE /workspace/documents/:id | DELETE /documents/:id           |
| POST /workspace/documents/:id/reprocess | POST /documents/:id/reprocess |

**Unterschiede:**
- v2 nutzt `{ success, data }` Response-Format
- v2 hat separaten Endpunkt für KI-Kontext-Toggle
- v2 hat keinen Preview-Endpunkt (wird noch implementiert)

---

## Beispiel: cURL

```bash
# Upload mit KI-Kontext
curl -X POST https://stromhaltig.de/api/v2/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf" \
  -F "title=Wichtiges Dokument" \
  -F "is_ai_context_enabled=true"

# Liste abrufen
curl https://stromhaltig.de/api/v2/documents?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"

# KI-Kontext aktivieren
curl -X POST https://stromhaltig.de/api/v2/documents/UUID/ai-context \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## Technische Details

- **Implementation**: `/src/presentation/http/routes/api/v2/documents.routes.ts`
- **Services**: `DocumentService`, `WorkspaceService`, `QdrantService`
- **Storage**: Multer → `uploads/user-documents/`
- **Database**: PostgreSQL (`documents` table)
- **Vector Store**: Qdrant (`willi_mako` collection)
- **Extractors**: `pdf-parse`, `mammoth`, native fs (TXT/MD)

**Sicherheit:**
- Authentifizierung via JWT Bearer Token
- User-ID-basierte Zugriffskontrolle
- File-Type-Validierung (Whitelist)
- Größenlimit enforcement
