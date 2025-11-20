# Qdrant User Collections Migration

**Date**: 2025-11-19  
**Status**: 🚧 Implementation Complete, Migration Pending  
**Priority**: HIGH - Security & Performance Improvement

## Problem

**SECURITY ISSUE**: User-Dokumente wurden in der globalen `willi_mako` Collection gespeichert mit `user_id` Filter. Potenzielle Risiken:
1. Filter könnten vergessen werden → Cross-User Access
2. Performance: Alle Suchen müssen gesamte Collection durchsuchen
3. Keine Isolation: User kann Collection nicht unabhängig löschen

**PERFORMANCE ISSUE**: 
- Nur 1 Chunk pro Dokument (Legacy Upload ohne willi-extractor)
- Schlechte Suchergebnisse (55-60% statt >80%)
- `text_content_sample` statt vollständiger Content

## Lösung: Eine Collection pro User

### Collection Naming
```
Öffentlich:  willi_mako (bleibt bestehen)
User Docs:   willi_mako_user_{userId}
             z.B. willi_mako_user_3a851622_0858_4eb0_b1ea_13c354c87bbe
```

### Vorteile
✅ **Perfekte Isolation** - Kein Cross-User Risk  
✅ **Performance** - Keine Filter, kleinere Collections  
✅ **Skalierbarkeit** - User löschen = Collection löschen  
✅ **Sicherheit** - Separate Zugriffskontrolle möglich

## Implementierte Änderungen

### 1. `src/services/qdrant.ts`

**Neue Helper-Funktion:**
```typescript
export function getUserCollectionName(userId: string): string {
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${BASE_COLLECTION}_user_${sanitizedUserId}`;
}
```

**Neue Static Methods:**
- `QdrantService.ensureUserCollection(userId)` - Erstellt Collection wenn nicht vorhanden
- `QdrantService.deleteUserCollection(userId)` - Löscht User Collection

**Angepasste Methods:**
- `search(userId, query)` - Sucht in User-Collection statt mit Filter
- `storeUserDocumentChunk()` - Speichert in User-Collection
- `deleteVector(vectorId, userId)` - Löscht aus User-Collection
- `deleteDocumentVectors(documentId, userId)` - Löscht Dokument aus User-Collection

### 2. `src/services/documentProcessor.ts`

**Angepasste Signatur:**
```typescript
async deleteDocumentVectors(documentId: string, userId: string)
```

**Verwendet jetzt:**
```typescript
await this.qdrantService.deleteDocumentVectors(documentId, userId);
```

### 3. `src/services/workspaceService.ts`

**Alle Aufrufe aktualisiert:**
- `deleteDocumentVectors(doc.id, userId)` - überall mit userId
- User-Account-Löschung nutzt `deleteUserCollection()` für Bulk-Delete

## Migration Plan

### Phase 1: Daten migrieren (KRITISCH)

**Script erstellen: `migrate-user-collections.ts`**

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';
import { pool } from './database';
import { getUserCollectionName } from './services/qdrant';

async function migrateUserCollections() {
  const client = await pool.connect();
  
  try {
    // 1. Get all users with documents
    const usersResult = await client.query(`
      SELECT DISTINCT user_id 
      FROM user_documents 
      WHERE is_processed = true
    `);
    
    console.log(`Found ${usersResult.rows.length} users with documents`);
    
    for (const { user_id } of usersResult.rows) {
      console.log(`\nMigrating user ${user_id}...`);
      
      // 2. Create user collection
      await QdrantService.ensureUserCollection(user_id);
      
      // 3. Get all document chunks from global collection
      const qdrantClient = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY
      });
      
      const points = await qdrantClient.scroll('willi_mako', {
        filter: {
          must: [
            { key: 'user_id', match: { value: user_id } },
            { key: 'is_user_document', match: { value: true } }
          ]
        },
        limit: 1000,
        with_payload: true,
        with_vector: true
      });
      
      if (points.points.length === 0) {
        console.log(`  No points found for user ${user_id}`);
        continue;
      }
      
      // 4. Copy to user collection
      const userCollection = getUserCollectionName(user_id);
      await qdrantClient.upsert(userCollection, {
        wait: true,
        points: points.points
      });
      
      console.log(`  ✅ Migrated ${points.points.length} points`);
      
      // 5. Delete from global collection
      await qdrantClient.delete('willi_mako', {
        filter: {
          must: [
            { key: 'user_id', match: { value: user_id } },
            { key: 'is_user_document', match: { value: true } }
          ]
        }
      });
      
      console.log(`  ✅ Deleted from global collection`);
    }
    
    console.log('\n✅ Migration complete!');
    
  } finally {
    client.release();
  }
}

migrateUserCollections().catch(console.error);
```

### Phase 2: Re-Processing mit willi-extractor

**Problem**: Legacy-Uploads haben nur 1 Chunk (text_content_sample)

**Script: `reprocess-legacy-documents.ts`**

```typescript
async function reprocessLegacyDocuments() {
  const client = await pool.connect();
  
  try {
    // Find documents with only 1 chunk (= legacy upload)
    const legacyDocs = await client.query(`
      SELECT 
        ud.id,
        ud.user_id,
        ud.file_path,
        ud.title,
        COUNT(udc.id) as chunk_count
      FROM user_documents ud
      LEFT JOIN user_document_chunks udc ON udc.document_id = ud.id
      WHERE ud.is_processed = true
      GROUP BY ud.id
      HAVING COUNT(udc.id) <= 1
    `);
    
    console.log(`Found ${legacyDocs.rows.length} legacy documents to reprocess`);
    
    for (const doc of legacyDocs.rows) {
      console.log(`\nReprocessing: ${doc.title}`);
      
      // Trigger willi-extractor processing
      const response = await fetch('http://localhost:3010/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc.id,
          userId: doc.user_id,
          filePath: doc.file_path
        })
      });
      
      if (response.ok) {
        console.log(`  ✅ Queued for reprocessing`);
      } else {
        console.error(`  ❌ Failed:`, await response.text());
      }
    }
    
  } finally {
    client.release();
  }
}
```

### Phase 3: Deployment

```bash
# 1. Build mit neuen Changes
npm run build:backend

# 2. Deploy (OHNE Migration - noch alte Collections nutzen)
./quick-deploy.sh

# 3. Run Migration Script auf Server
ssh root@10.0.0.2
cd /opt/willi_mako
node dist/scripts/migrate-user-collections.js

# 4. Verify Migration
# Check: Sind alle User-Collections erstellt?
curl -H "api-key: str0mda0" http://10.0.0.2:6333/collections | grep user_

# 5. Test mit einem User
# Neues Dokument hochladen → sollte in User-Collection landen

# 6. Wenn OK: Legacy Documents reprocessen
node dist/scripts/reprocess-legacy-documents.js

# 7. Monitor Logs
pm2 logs willi_mako_backend_4101
```

## Rollback Plan

Falls Probleme auftreten:

```typescript
// Rollback: User Collections → Global Collection
async function rollbackMigration() {
  const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
  });
  
  const collections = await qdrantClient.getCollections();
  const userCollections = collections.collections.filter(c => 
    c.name.startsWith('willi_mako_user_')
  );
  
  for (const collection of userCollections) {
    // 1. Scroll all points from user collection
    const points = await qdrantClient.scroll(collection.name, {
      limit: 10000,
      with_payload: true,
      with_vector: true
    });
    
    // 2. Copy back to global collection
    if (points.points.length > 0) {
      await qdrantClient.upsert('willi_mako', {
        wait: true,
        points: points.points
      });
    }
    
    // 3. Delete user collection
    await qdrantClient.deleteCollection(collection.name);
    
    console.log(`Rolled back ${collection.name}`);
  }
}
```

## Testing Checklist

- [ ] Migration Script erstellt und getestet (lokal)
- [ ] User Collection wird automatisch bei Upload erstellt
- [ ] Suche findet Dokumente in User Collection
- [ ] Document Delete funktioniert in User Collection
- [ ] User Account Delete löscht Collection komplett
- [ ] Alte Dokumente aus globaler Collection gelöscht
- [ ] Kein Cross-User Access möglich (Test mit 2 Usern)
- [ ] Performance: Suche schneller als vorher
- [ ] Reprocessing: Legacy Docs haben >1 Chunk

## Security Verification

**Test Cases:**
1. User A lädt Dokument hoch → landet in `willi_mako_user_A`
2. User B sucht → findet NICHT Dokument von User A
3. User A löscht Account → Collection `willi_mako_user_A` wird gelöscht
4. Prozess-Suche (Mermaid) sucht nur in `willi_mako` (öffentlich)

## Performance Metrics

**Before Migration:**
- Global Collection: ~X points
- User Document Search: ~Y ms (mit Filter)
- Score: 55-60% (schlechte Chunks)

**After Migration:**
- User Collections: ~Z collections mit je ~N points
- User Document Search: ~XX ms (ohne Filter)
- Score: 75-90% (nach Reprocessing)

## Bekannte Einschränkungen

1. **Qdrant Collection Limit**: Abhängig von Qdrant Version/Config
2. **Migration Downtime**: Ca. X Minuten für Y User
3. **Disk Space**: Vorübergehend 2x Speicher (global + user collections)

## Related Files

- `src/services/qdrant.ts` - Core implementation
- `src/services/documentProcessor.ts` - Document chunking
- `src/services/workspaceService.ts` - Document management
- `CONTEXT-SUMMARY-QUALITY-IMPROVEMENT.md` - Related fix

## Next Steps

1. ✅ Code Changes implementiert
2. ⏳ Migration Script erstellen
3. ⏳ Testing auf Staging
4. ⏳ Production Migration planen
5. ⏳ Legacy Documents reprocessen
6. ⏳ Monitoring & Verification

## Notes

- Migration muss für **aktuellen User** (3a851622-0858-4eb0-b1ea-13c354c87bbe) getestet werden
- Dokument "20250715_BGH Beschluss_Batterispeicher.pdf" sollte nach Reprocessing bessere Scores haben
- Original-Anfrage "BESCHLUSS EnVR 1/24 vom 15. Juli 2025" sollte dann funktionieren
