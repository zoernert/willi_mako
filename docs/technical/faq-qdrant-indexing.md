# FAQ Qdrant Indexierung - Technische Implementierung

## Übersicht

Neue FAQ-Einträge werden automatisch in die Qdrant Vector Database indiziert, um semantische Suche und KI-gestützte Abfragen zu ermöglichen.

## Implementierungsdetails

### 1. Funktion: `indexFAQIntoQdrant()`

**Datei**: `src/routes/faq.ts`

**Zweck**: Indiziert einen FAQ-Eintrag in Qdrant mit intelligenter Chunking-Strategie

**Chunking-Strategie**:
- Maximale Chunk-Größe: **1000 Zeichen**
- Chunking erfolgt auf **Absatzgrenzen** (`\n\s*\n`) für besseren semantischen Kontext
- Große Absätze werden bei Bedarf aufgeteilt
- Mindestens ein Chunk wird immer erstellt

**Embedding-Modell**: `text-embedding-004` (Google Gemini)
- Wird über `embeddingProvider.ts` abgerufen
- Vektorgröße: 768 Dimensionen (Standard Gemini)
- Unterstützt auch Mistral als alternativen Provider

**UUID-Generierung**:
- Deterministisch via UUIDv5
- Format: `faq:{faq_id}:{chunk_index}`
- Namespace: `uuidv5.URL`
- Ermöglicht idempotente Updates

### 2. Payload-Struktur

Jeder Chunk enthält folgende Metadaten:

```typescript
{
  content_type: 'faq',              // Typ-Identifikation
  faq_id: string,                    // UUID des FAQ-Eintrags
  title: string,                     // FAQ-Titel (Frage)
  description: string,               // Kurzbeschreibung
  tags: string[],                    // Tags für Kategorisierung
  chunk_index: number,               // Position des Chunks (0-basiert)
  total_chunks: number,              // Gesamtzahl der Chunks
  text: string,                      // Der tatsächliche Chunk-Text
  chunk_type: 'faq_content',         // Konsistent mit anderen Chunk-Typen
  source: 'faq_api',                 // Herkunft des Eintrags
  created_at: string                 // ISO Timestamp
}
```

### 3. Collection-Konfiguration

**Collection Name**: Dynamisch via `getCollectionName()`
- Standard: `willi_mako`
- Bei Mistral: `willi_mako_mistral`
- Konfigurierbar über `QDRANT_COLLECTION` Umgebungsvariable

**Qdrant Client Konfiguration**:
```typescript
{
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false  // Bypass version check
}
```

### 4. Nicht-blockierende Ausführung

Die Indexierung erfolgt asynchron:

```typescript
// Fire-and-forget pattern
(async () => {
  try {
    await indexFAQIntoQdrant(faqData);
  } catch (err) {
    console.error('Background FAQ indexing failed:', err);
  }
})();
```

**Vorteile**:
- Sofortige API-Antwort (201 Created) nach DB-Insert
- Keine Verzögerung durch Embedding-Generierung
- Fehler bei der Indexierung beeinflussen nicht die FAQ-Erstellung
- Fehler werden geloggt für Monitoring

### 5. Fehlerbehandlung

**Graceful Degradation**:
- Bei Qdrant-Fehlern wird der FAQ trotzdem erstellt
- Fehler werden geloggt: `console.error('Error indexing FAQ into Qdrant:', error)`
- Keine Exception wird zum Client weitergegeben

**Typische Fehlerszenarien**:
- Qdrant-Server nicht erreichbar
- API-Key ungültig
- Embedding-Service-Fehler
- Netzwerk-Timeouts

Alle werden abgefangen ohne die FAQ-Erstellung zu blockieren.

### 6. Text-Vorbereitung für Chunking

**Volltext-Zusammenstellung**:
```typescript
const fullText = [
  faq.title,
  faq.description || '',
  faq.context,
  faq.answer,
  faq.additional_info || ''
].filter(Boolean).join('\n\n');
```

**Chunking-Algorithmus**:
1. Split auf doppelte Newlines (`\n\s*\n`) → Absätze
2. Für jeden Absatz:
   - Wenn ≤ 1000 Zeichen → direkt als Chunk verwenden
   - Wenn > 1000 Zeichen → in 1000-Zeichen-Segmente aufteilen
3. Falls keine Chunks entstehen → ersten 1000 Zeichen als Fallback

### 7. Logging und Monitoring

**Erfolgreiche Indexierung**:
```
✓ Indexed FAQ {faq_id} into Qdrant collection '{collection}': {n} chunks
```

**Fehler**:
```
Error indexing FAQ into Qdrant: {error}
Background FAQ indexing failed: {error}
```

### 8. Integration im POST-Endpunkt

**Route**: `POST /api/faqs`

**Ablauf**:
1. Validierung der Request-Daten
2. Insert in PostgreSQL `faqs`-Tabelle
3. Parsen der Tags für Response
4. **Asynchrone Qdrant-Indexierung starten**
5. Sofortige Antwort an Client (201 Created)

```typescript
router.post('/faqs', authenticateBearerToken('str0mda0'), asyncHandler(async (req: Request, res: Response) => {
  // ... validation & insert ...
  
  const newFaq = result.rows[0];
  
  // Non-blocking indexing
  (async () => {
    await indexFAQIntoQdrant({ ...faqData });
  })();
  
  res.status(201).json({ success: true, data: newFaq });
}));
```

## Suchintegration

FAQs können über die bestehende Qdrant-Suchinfrastruktur gefunden werden:

**QdrantService Methoden**:
- `QdrantService.searchByText()` - Einfache Textsuche
- `QdrantService.semanticSearchGuided()` - Erweiterte semantische Suche mit Filters

**Filter nach FAQ-Content**:
```typescript
filter: {
  must: [
    { key: 'content_type', match: { value: 'faq' } }
  ]
}
```

## Performance-Überlegungen

### Chunk-Größe: 1000 Zeichen

**Gründe**:
- Optimal für `text-embedding-004` Kontext-Fenster
- Balance zwischen Granularität und semantischem Kontext
- Konsistent mit Admin-Dokumenten-Chunking
- Ermöglicht präzise Suchtreffer

### Embedding-Caching

`QdrantService` nutzt einen LRU-Cache für Embeddings:
- Max. 500 Einträge (konfigurierbar via `EMBED_CACHE_SIZE`)
- Reduziert redundante API-Calls
- Beschleunigt wiederholte Anfragen

### Batch-Upsert

Alle Chunks werden in einem `upsert`-Call übertragen:
```typescript
await client.upsert(collection, { wait: true, points });
```

- `wait: true` stellt sicher, dass die Indizierung abgeschlossen ist
- Effizienter als einzelne Upserts pro Chunk

## Wartung und Troubleshooting

### FAQ neu indizieren

Bei Bedarf kann ein FAQ manuell neu indiziert werden:

```typescript
const faq = await pool.query('SELECT * FROM faqs WHERE id = $1', [faqId]);
await indexFAQIntoQdrant(faq.rows[0]);
```

### Alle FAQs re-indizieren (Admin-Skript)

```typescript
const faqs = await pool.query('SELECT * FROM faqs WHERE is_active = true');
for (const faq of faqs.rows) {
  try {
    await indexFAQIntoQdrant(faq);
    console.log(`✓ Re-indexed FAQ ${faq.id}`);
  } catch (err) {
    console.error(`✗ Failed to re-index FAQ ${faq.id}:`, err);
  }
}
```

### FAQ-Chunks aus Qdrant entfernen

```typescript
// Alle Chunks eines FAQs finden und löschen
const client = new QdrantClient({ url, apiKey });
await client.delete(collection, {
  filter: {
    must: [
      { key: 'content_type', match: { value: 'faq' } },
      { key: 'faq_id', match: { value: faqId } }
    ]
  }
});
```

## Zukunftserweiterungen

Mögliche Verbesserungen:

1. **Update-Funktion**: Bei FAQ-Änderungen automatisch re-indizieren
2. **Delete-Funktion**: Bei FAQ-Löschung aus Qdrant entfernen
3. **Batch-Import**: Effiziente Massen-Indexierung von bestehenden FAQs
4. **Qualitätsprüfung**: Embedding-Qualität messen und validieren
5. **A/B-Testing**: Alternative Chunking-Strategien testen
6. **Multi-Language**: Sprachspezifische Collections

## Umgebungsvariablen

Relevante Konfiguration:

```bash
# Qdrant Connection
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_api_key
QDRANT_COLLECTION=willi_mako

# Embedding Provider
EMBEDDING_PROVIDER=gemini  # oder 'mistral'
GEMINI_EMBED_DIM=768
MISTRAL_EMBED_DIM=1024

# Caching
EMBED_CACHE_SIZE=500
```

## Dependencies

**NPM Packages**:
- `@qdrant/js-client-rest` - Qdrant Client
- `uuid` - UUID v5 Generierung
- `@google/generative-ai` - Gemini Embeddings (via geminiService)

**Interne Services**:
- `embeddingProvider.ts` - Zentralisierte Embedding-Generierung
- `qdrant.ts` - QdrantService für Suche
- `gemini.ts` - Google Gemini Integration

---

**Autor**: GitHub Copilot  
**Datum**: 2025-10-07  
**Version**: 1.0
