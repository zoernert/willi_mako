# Multi-Collection Integration - Legacy App Analyse

**Datum:** 17. November 2025  
**Status:** Analyse & Empfehlung  
**Betrifft:** Integration von willi-netz Collection in Legacy React App

## Problem

Die Legacy React App (`/app`, unter `app-legacy/**`) nutzt **ausschließlich die `willi_mako` Collection** für:
- Chat-Antworten  
- Semantische Suche
- Kontextextraktion

Die zweite Collection `willi-netz` (Regulatorik, BNetzA, TAB, Asset Management) ist nur über:
- ✅ API v2 (`/api/v2/willi-netz/*`, `/api/v2/combined/*`)
- ✅ MCP Service Tools

verfügbar, **nicht aber in der Haupt-UI** der Legacy App.

---

## Aktuelle Architektur

### Legacy App Chat-Flow

**Frontend:** `app-legacy/src/components/ChatFlow.jsx`
```javascript
// Line 162: Hardcodiert auf /api/chat
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ query, context, metadata })
});
```

**Backend:** `src/routes/chat.ts` (Line 823+)
```typescript
router.post('/chats/:chatId/messages', async (req, res) => {
  // ...
  // Nutzt QdrantService.semanticSearchGuided() 
  // -> Standardmäßig QDRANT_COLLECTION_NAME = 'willi_mako'
  const results = await retrieval.getContextualCompressedResults(
    content, userPreferencesRow, 5
  );
});
```

**Qdrant Service:** `src/services/qdrant.ts`
```typescript
// semanticSearchGuided() ruft intern auf:
static async semanticSearchGuidedByCollection(
  query: string,
  options?,
  collectionName: string = QDRANT_COLLECTION_NAME  // <- willi_mako
)
```

### Problem-Punkte

1. **ChatFlow.jsx** sendet an `/api/chat` (legacy endpoint)
2. **chat.ts Route** nutzt `retrieval.getContextualCompressedResults()`
3. **AdvancedRetrieval** ruft `QdrantService.semanticSearchGuided()` 
4. Diese Methode nutzt **nur `willi_mako`** Collection

→ **Willi-netz Wissen ist nicht verfügbar**

---

## Lösungsoptionen

### Option 1: Combined Search als Standard (Empfohlen)

**Änderungen:**
1. `AdvancedRetrieval.getContextualCompressedResults()` nutzt `semanticSearchCombined()`
2. Automatisch parallele Abfrage beider Collections
3. Score-basiertes Merging wie in API v2

**Vorteile:**
- ✅ Keine Breaking Changes für Nutzer
- ✅ Maximale Wissensabdeckung automatisch
- ✅ Konsistent mit API v2 Combined Endpoint
- ✅ Transparenz durch `sourceCollection` Marker

**Nachteile:**
- ⚠️ Doppelte Qdrant-Abfragen (Performance)
- ⚠️ Potenziell gemischte Antworten ohne expliziten Kontext

**Code-Änderung:** (ca. 30 Zeilen)
```typescript
// src/services/qdrant.ts - Neue Methode
static async semanticSearchCombined(
  query: string,
  options?: SearchOptions
): Promise<any[]> {
  const [resultsWilliMako, resultsWilliNetz] = await Promise.all([
    this.semanticSearchGuidedByCollection(query, options, 'willi_mako'),
    this.semanticSearchGuidedByCollection(query, options, 'willi-netz')
  ]);
  
  // Merge + markiere Herkunft
  const combined = [
    ...resultsWilliMako.map(r => ({ ...r, sourceCollection: 'willi_mako' })),
    ...resultsWilliNetz.map(r => ({ ...r, sourceCollection: 'willi-netz' }))
  ];
  
  // Sort by score
  return combined.sort((a, b) => 
    (b.merged_score ?? b.score ?? 0) - (a.merged_score ?? a.score ?? 0)
  );
}

// src/routes/chat.ts - AdvancedRetrieval anpassen
async getContextualCompressedResults(...) {
  // Ersetze:
  // const guidedResults = await QdrantService.semanticSearchGuided(...)
  
  // Mit:
  const guidedResults = await QdrantService.semanticSearchCombined(
    query, 
    { limit: limit * 2, outlineScoping: true, excludeVisual: true }
  );
}
```

---

### Option 2: Collection Switcher in UI

**Änderungen:**
1. UI Toggle/Dropdown in ChatFlow für Collection-Auswahl
2. Context Settings übergeben `targetCollection` Parameter
3. Backend nutzt entsprechende Collection

**Vorteile:**
- ✅ Explizite Kontrolle für User
- ✅ Keine unnötigen Abfragen
- ✅ Klare Trennung Marktkommunikation vs. Regulatorik

**Nachteile:**
- ❌ Breaking Change in UX
- ❌ User muss wissen, welche Collection zu nutzen ist
- ❌ Zusätzliche UI-Komplexität

**Code-Änderung:** (ca. 80 Zeilen)
```typescript
// app-legacy/src/components/ChatFlow.jsx
const [targetCollection, setTargetCollection] = useState<'willi_mako' | 'willi-netz' | 'combined'>('combined');

// UI Element hinzufügen
<FormControl>
  <InputLabel>Wissensbereich</InputLabel>
  <Select value={targetCollection} onChange={...}>
    <MenuItem value="combined">Alle Bereiche</MenuItem>
    <MenuItem value="willi_mako">Marktkommunikation</MenuItem>
    <MenuItem value="willi-netz">Regulatorik & Netz</MenuItem>
  </Select>
</FormControl>

// In sendChatRequest():
contextSettings: { targetCollection }

// Backend in chat.ts:
const collectionName = contextSettings?.targetCollection || 'willi_mako';
const results = await QdrantService.semanticSearchGuidedByCollection(
  query, options, collectionName
);
```

---

### Option 3: Intelligente Auto-Routing (Intent Detection)

**Änderungen:**
1. LLM-basierte Klassifikation der User-Frage
2. Automatische Collection-Auswahl
3. Fallback auf Combined bei Unsicherheit

**Vorteile:**
- ✅ Beste UX (unsichtbar für User)
- ✅ Effizient (nur relevante Collection)
- ✅ Skalierbar für weitere Collections

**Nachteile:**
- ❌ Zusätzlicher LLM-Call (Latenz + Kosten)
- ❌ Potenzielle Fehlklassifikation
- ❌ Komplexere Fehlerbehandlung

**Code-Änderung:** (ca. 120 Zeilen, neuer Service)
```typescript
// Neuer Service: src/services/collectionRouter.service.ts
class CollectionRouterService {
  async determineTargetCollection(query: string): Promise<{
    collection: 'willi_mako' | 'willi-netz' | 'combined',
    confidence: number,
    reasoning: string
  }> {
    const prompt = `Klassifiziere diese Frage:
    - "willi_mako": Marktkommunikation, EDIFACT, Lieferantenwechsel
    - "willi-netz": Regulatorik, BNetzA, Netzentgelte, TAB
    - "combined": Übergreifend oder unklar
    
    Frage: "${query}"
    
    Antworte JSON: {"collection": "...", "confidence": 0-1}`;
    
    const result = await llm.classify(prompt);
    return result;
  }
}

// In chat.ts:
const routing = await collectionRouter.determineTargetCollection(content);
const collectionName = routing.confidence > 0.8 
  ? routing.collection 
  : 'combined';
```

---

## Empfehlung

**Kurzfristig (Quick Win):**  
→ **Option 1: Combined Search als Standard**

- Minimale Code-Änderung (~30 Zeilen)
- Sofortige Verfügbarkeit beider Collections
- Konsistent mit API v2
- Keine UX-Änderung

**Mittelfristig (optimiert):**  
→ **Option 1 + Option 2 kombiniert**

1. Combined Search als Default
2. Optional: UI-Toggle für fortgeschrittene User
3. Speicherung der Präferenz in User Settings

**Langfristig (bei >3 Collections):**  
→ **Option 3: Auto-Routing mit Caching**

- Intent-Klassifikation mit Result-Caching
- Fallback-Logik auf Combined
- Monitoring & Metrics für Klassifikationsqualität

---

## Performance-Überlegungen

### Combined Search Performance

**Aktuell (single collection):**
- 1 Qdrant Query: ~150-300ms
- Total: ~500-800ms (mit LLM)

**Combined (parallel):**
- 2 Qdrant Queries parallel: ~150-350ms (nicht 2x!)
- Merging: ~5-10ms
- Total: ~550-850ms (+50-100ms overhead)

**Mitigation:**
- ✅ Parallel Queries (Promise.all)
- ✅ Shared Embedding Cache
- ✅ Result Limit pro Collection reduzieren (z.B. 15 statt 20)

---

## Migration Plan (Option 1)

### Phase 1: Backend (30min)
1. ✅ `QdrantService.semanticSearchCombined()` hinzufügen
2. ✅ `AdvancedRetrieval` anpassen
3. ✅ Type Check + Build

### Phase 2: Testing (15min)
1. ✅ Lokale Tests mit bekannten Queries
2. ✅ Verifizierung `sourceCollection` Marker
3. ✅ Performance Baseline

### Phase 3: Deployment (5min)
1. ✅ Deploy auf Staging
2. ✅ Smoke Tests
3. ✅ Production Rollout

### Phase 4: Monitoring (laufend)
1. ✅ Response Times überwachen
2. ✅ Source Distribution analysieren (willi_mako vs. willi-netz)
3. ✅ User Feedback sammeln

---

## Offene Fragen

1. **Soll willi-netz Wissen in allen Chats verfügbar sein?**  
   → Ja, empfohlen für maximale Nützlichkeit

2. **Performance-Budget akzeptabel?**  
   → +50-100ms sind vertretbar bei deutlichem Mehrwert

3. **Benötigen wir UI-Feedback zu Collection-Quellen?**  
   → Nice-to-have: Source-Badges in Message-Komponenten

4. **Feature Flag für Rollback?**  
   → Empfohlen: `ENABLE_COMBINED_SEARCH=true` in `.env`

---

## Nächste Schritte

- [ ] Entscheidung für Option 1, 2 oder 3
- [ ] Code-Änderungen implementieren
- [ ] Testing (lokal + staging)
- [ ] Deployment
- [ ] Monitoring & Metriken

**Geschätzter Aufwand (Option 1):**  
- Development: 1 Stunde
- Testing: 30 Minuten  
- Deployment: 15 Minuten
- **Total: ~2 Stunden**
