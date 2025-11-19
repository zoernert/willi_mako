# Bulk Delete Documents - Quick Guide

## Methode 1: Shell Script (Empfohlen für lokale Entwicklung)

### Vorbereitung:
```bash
# 1. Holen Sie sich Ihren JWT-Token aus dem Browser:
# - Browser DevTools öffnen (F12)
# - Application Tab -> Local Storage -> http://localhost:3003
# - Kopieren Sie den Wert von "auth_token"

# 2. Token als Umgebungsvariable setzen:
export AUTH_TOKEN='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Verwendung:
```bash
# Einzelne Dokumente löschen:
./bulk-delete-documents.sh doc-uuid-1 doc-uuid-2 doc-uuid-3

# Mit Liste aus Datei:
echo "doc-uuid-1
doc-uuid-2
doc-uuid-3" > documents_to_delete.txt

./bulk-delete-documents.sh $(cat documents_to_delete.txt)

# Schneller (ohne Delay):
DELAY_SECONDS=0.5 ./bulk-delete-documents.sh doc-id-1 doc-id-2 doc-id-3
```

Das Script:
- ✅ Fügt automatisch Pausen zwischen Requests ein (Standard: 2s)
- ✅ Erkennt Rate-Limit-Fehler (429) und wartet automatisch
- ✅ Zeigt Fortschritt und Zusammenfassung
- ✅ Macht automatisch Retry bei Rate-Limit

## Methode 2: Rate Limit temporär erhöhen

### Für Entwicklung (.env anpassen):

```bash
# Original-Werte:
RATE_LIMIT_MAX=200               # Global: 200 Requests / 15min

# Temporär erhöhen für Bulk-Delete:
RATE_LIMIT_MAX=500               # Global: 500 Requests / 15min

# Server neu starten:
npm run dev
```

**WICHTIG**: Nach dem Löschen wieder auf Original-Werte zurücksetzen!

## Methode 3: Browser Console Script

Falls Sie die Dokument-IDs aus dem Frontend haben:

```javascript
// Im Browser (Willi-Mako Dashboard, F12 Console):

const documentIds = [
  'doc-uuid-1',
  'doc-uuid-2',
  'doc-uuid-3'
  // ... weitere IDs
];

async function bulkDelete(ids, delayMs = 2000) {
  const token = localStorage.getItem('auth_token');
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < ids.length; i++) {
    console.log(`[${i+1}/${ids.length}] Lösche ${ids[i]}...`);
    
    try {
      const response = await fetch(`/api/workspace/documents/${ids[i]}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok || response.status === 204) {
        console.log('✓ Erfolgreich');
        success++;
      } else if (response.status === 429) {
        console.warn('⚠ Rate Limit erreicht, warte 15s...');
        await new Promise(r => setTimeout(r, 15000));
        
        // Retry
        const retry = await fetch(`/api/workspace/documents/${ids[i]}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (retry.ok || retry.status === 204) {
          console.log('✓ Erfolgreich (Retry)');
          success++;
        } else {
          console.error('✗ Fehler (Retry):', retry.status);
          failed++;
        }
      } else {
        console.error('✗ Fehler:', response.status);
        failed++;
      }
    } catch (error) {
      console.error('✗ Exception:', error);
      failed++;
    }
    
    // Pause zwischen Requests
    if (i < ids.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  
  console.log(`\n=== Zusammenfassung ===`);
  console.log(`Erfolgreich: ${success}`);
  console.log(`Fehlgeschlagen: ${failed}`);
  console.log(`Total: ${ids.length}`);
}

// Ausführen:
await bulkDelete(documentIds);
```

## Methode 4: SQL-Direktzugriff (Nur für Notfälle!)

**NUR verwenden wenn Sie wissen was Sie tun!**

```bash
# PostgreSQL Verbindung (siehe .env für Credentials):
psql -h localhost -U postgres -d willi_mako

# Liste Ihrer Dokumente ansehen:
SELECT id, title, created_at FROM user_documents 
WHERE user_id = 'IHRE_USER_ID' 
ORDER BY created_at DESC;

# Bestimmte Dokumente löschen:
DELETE FROM user_documents 
WHERE id IN ('doc-id-1', 'doc-id-2', 'doc-id-3') 
  AND user_id = 'IHRE_USER_ID';

# Alle Dokumente eines Users löschen (VORSICHT!):
DELETE FROM user_documents WHERE user_id = 'IHRE_USER_ID';
```

**ACHTUNG**: Diese Methode:
- ❌ Umgeht die API-Validierung
- ❌ Löscht nicht die verknüpften Dateien im Storage
- ❌ Löscht nicht die Vector-Embeddings in Qdrant
- ✅ Nur für Entwicklung/Testing verwenden!

## Empfehlung

Für Ihre Situation (20 Dokumente löschen):

1. **Am einfachsten**: Browser Console Script (Methode 3)
   - Direkt im Browser ausführbar
   - Kein Setup nötig
   - Automatisches Retry

2. **Am saubersten**: Shell Script (Methode 1)
   - Professionelle Lösung
   - Wiederverwendbar
   - Gute Fehlerbehandlung

3. **Am schnellsten**: Rate Limit erhöhen (Methode 2)
   - Aber: Muss danach wieder zurückgesetzt werden
   - Nur für Entwicklung!

## Document IDs herausfinden

Falls Sie die IDs nicht kennen:

### Browser Console:
```javascript
// Liste alle Ihre Dokumente mit IDs:
const token = localStorage.getItem('auth_token');
const response = await fetch('/api/workspace/documents', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const docs = await response.json();
console.table(docs.map(d => ({ id: d.id, title: d.title })));
```

### cURL:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3003/api/workspace/documents | jq -r '.[] | .id'
```

---

**Fragen?** Die Scripts sind bereit zur Verwendung!
