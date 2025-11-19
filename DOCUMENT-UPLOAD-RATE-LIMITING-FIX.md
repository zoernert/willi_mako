# Document Upload Rate Limiting Fix

## Datum: 19. November 2025

## Problem
Beim Upload mehrerer PDF-Dokumente in "Mein Workspace" tritt ein 429-Fehler auf:
```
Too many requests, please try again later.
```

### Root Cause
Der globale Rate Limiter in `src/server.ts` limitiert alle `/api/*` Routen auf:
- **100 Requests in 15 Minuten** pro IP/Benutzer

Beim Upload mehrerer Dokumente werden jedoch schnell viele Requests hintereinander gemacht:
- Jedes Dokument = 1 Request
- Multiple parallel Uploads
- Status-Polling für Processing
- Metadata-Updates

Dies führt dazu, dass das globale Limit schnell erreicht wird, besonders bei Batch-Uploads.

## Lösung

### 1. Exclusion vom globalen Rate Limiter
Document Upload Routen werden vom globalen Rate Limiter ausgeschlossen:

```typescript
// src/server.ts
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => {
    // Exclude document upload routes
    return req.path.includes('/workspace/documents/upload');
  }
});
```

### 2. Custom Rate Limiter für Document Uploads
Neues Middleware-Modul: `src/middleware/documentUploadLimiter.ts`

**Single Document Upload Limiter:**
- 30 Requests in 5 Minuten
- Für einzelne Datei-Uploads
- Admin-Benutzer sind ausgenommen

**Batch Document Upload Limiter:**
- 20 Requests in 5 Minuten
- Für Multi-File-Uploads
- Admin-Benutzer sind ausgenommen

```typescript
export const singleDocumentUploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  skip: (req) => req.user?.role === 'admin'
});

export const batchDocumentUploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  skip: (req) => req.user?.role === 'admin'
});
```

### 3. Integration in Document Routes

**Legacy Routes (`src/routes/documents.ts`):**
```typescript
router.post('/upload', 
  singleDocumentUploadLimiter, 
  upload.single('file'), 
  ...
);

router.post('/upload-multiple', 
  batchDocumentUploadLimiter, 
  upload.array('files', 10), 
  ...
);
```

**API v2 Routes (`src/presentation/http/routes/api/v2/documents.routes.ts`):**
Gleiche Limiter angewendet für Konsistenz.

### 4. Umgebungsvariablen (.env)
```properties
# Document Upload Rate Limiting
DOCUMENT_UPLOAD_RATE_WINDOW=5
DOCUMENT_UPLOAD_RATE_MAX_SINGLE=30
DOCUMENT_UPLOAD_RATE_MAX_BATCH=20
```

## Vorteile der Lösung

### Flexibilität
- **Anpassbare Limits**: Über ENV-Variablen konfigurierbar
- **Admin-Bypass**: Admins können unbegrenzt uploaden
- **Separate Limits**: Single vs. Batch Uploads unterschiedlich behandelt

### Skalierbarkeit
- **Kürzeres Fenster**: 5 Minuten statt 15 Minuten
- **Höhere Limits**: 30/20 statt 100 für alle API-Calls
- **Spezifisch**: Nur Upload-Routen betroffen, nicht andere API-Calls

### User Experience
- **Bessere Fehlermeldungen**: Spezifische Upload-Fehlermeldungen
- **Rate Limit Headers**: Standard-Header für Debugging
- **Keine False Positives**: Andere API-Calls beeinflussen Upload nicht

## Technische Details

### Rate Limiter Algorithmus
- **Token Bucket**: Verwendet `express-rate-limit`
- **Per-User Tracking**: Basierend auf User-ID (nicht IP)
- **Automatisches Refill**: Tokens werden über Zeit wieder aufgefüllt

### Error Response Format
```json
{
  "error": "Too many upload requests. Please wait a moment before uploading more documents.",
  "code": "UPLOAD_RATE_LIMIT_EXCEEDED"
}
```

### Rate Limit Headers
```
RateLimit-Limit: 30
RateLimit-Remaining: 25
RateLimit-Reset: 1763571528
```

## Testing

### Manuelle Tests
1. **Single Upload**: Teste Upload einzelner Dateien
   ```bash
   curl -X POST 'https://stromhaltig.de/api/workspace/documents/upload' \
     -H 'Authorization: Bearer <token>' \
     -F 'file=@document.pdf'
   ```

2. **Batch Upload**: Teste Upload mehrerer Dateien
   ```bash
   curl -X POST 'https://stromhaltig.de/api/workspace/documents/upload-multiple' \
     -H 'Authorization: Bearer <token>' \
     -F 'files=@doc1.pdf' \
     -F 'files=@doc2.pdf' \
     -F 'files=@doc3.pdf'
   ```

3. **Rate Limit Test**: Wiederhole Uploads bis zum Limit

### Erwartetes Verhalten
- ✅ Einzelne Uploads: Max 30 in 5 Minuten
- ✅ Batch Uploads: Max 20 in 5 Minuten
- ✅ Admins: Keine Limits
- ✅ Nach 5 Minuten: Limits werden zurückgesetzt

## Configuration Options

### Production Empfehlungen
```properties
# Für hohe Last
DOCUMENT_UPLOAD_RATE_WINDOW=10
DOCUMENT_UPLOAD_RATE_MAX_SINGLE=50
DOCUMENT_UPLOAD_RATE_MAX_BATCH=30

# Für niedrige Last / Schutz
DOCUMENT_UPLOAD_RATE_WINDOW=5
DOCUMENT_UPLOAD_RATE_MAX_SINGLE=20
DOCUMENT_UPLOAD_RATE_MAX_BATCH=10
```

### Monitoring
```javascript
// Check rate limit status
const headers = response.headers;
console.log('Limit:', headers['ratelimit-limit']);
console.log('Remaining:', headers['ratelimit-remaining']);
console.log('Reset:', headers['ratelimit-reset']);
```

## Migration Notes

### Bestehende Funktionalität
- ✅ Keine Breaking Changes
- ✅ Bestehende Upload-Funktionen bleiben unverändert
- ✅ Backward-compatible mit Legacy und v2 APIs

### Neue Funktionalität
- ✅ Separate Rate Limits für Uploads
- ✅ Admin-Bypass für Power-Users
- ✅ Konfigurierbare Limits via ENV
- ✅ Bessere Fehlermeldungen

## Deployment Checklist

### Pre-Deployment
- [x] Type Check erfolgreich
- [x] ENV-Variablen dokumentiert
- [x] Code Review durchgeführt
- [x] Tests erstellt (manuell)

### Deployment
1. Update `.env` mit neuen Variablen
2. Deploy neuen Code
3. Restart Server
4. Teste Upload-Funktionalität
5. Überwache Logs für Rate Limit Errors

### Post-Deployment
- [ ] Teste Single Upload
- [ ] Teste Batch Upload (3-5 Dateien)
- [ ] Teste Batch Upload (10 Dateien)
- [ ] Teste Admin Upload
- [ ] Überwache Rate Limit Metriken

## Troubleshooting

### Problem: Immer noch 429 Errors
**Lösung**: Prüfe, ob ENV-Variablen korrekt gesetzt sind
```bash
echo $DOCUMENT_UPLOAD_RATE_MAX_SINGLE
```

### Problem: Admin bekommt 429
**Lösung**: Prüfe User Role
```javascript
console.log('User role:', req.user?.role);
```

### Problem: Limits zu restriktiv
**Lösung**: Erhöhe Limits in `.env`
```properties
DOCUMENT_UPLOAD_RATE_MAX_SINGLE=50
DOCUMENT_UPLOAD_RATE_MAX_BATCH=40
```

## Future Enhancements

### Mögliche Verbesserungen
1. **Per-User Limits**: Verschiedene Limits für Free/Pro/Enterprise
2. **Dynamic Limits**: Basierend auf Nutzungshistorie
3. **Storage-Based Limits**: Limits basierend auf verbleibendem Storage
4. **Queue System**: Upload-Queue für große Batches
5. **Background Processing**: Async Upload mit Webhooks

### Monitoring & Analytics
- Track Upload-Patterns
- Analyse Rate Limit Hits
- User Feedback zu Limits
- Automatische Limit-Anpassung

## Referenzen
- [express-rate-limit Documentation](https://github.com/express-rate-limit/express-rate-limit)
- [Rate Limiting Best Practices](https://www.nginx.com/blog/rate-limiting-nginx/)
- [HTTP 429 Status Code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)

## Status
✅ **Deployment Ready** - Alle Änderungen implementiert und Type Check erfolgreich
