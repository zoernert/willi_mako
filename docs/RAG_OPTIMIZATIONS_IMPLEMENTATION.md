# Implementierung der RAG-Optimierungen für Willi-Mako

## Überblick der implementierten Optimierungen

Basierend auf dem `OPTIMIZATION_GUIDE.md` wurden folgende Verbesserungen in der RAG (Retrieval-Augmented Generation) Pipeline implementiert:

## 1. Pre-Filtering-Logik basierend auf Metadaten ✅

### Neue Services:
- **QueryAnalysisService** (`src/services/queryAnalysisService.ts`): Intelligente Analyse von Nutzeranfragen
  - Erkennt Intent-Typen: `definition`, `table_data`, `document_specific`, `general`
  - Mapping von Dokumentnamen zu `document_base_name` Werten
  - Query-Expansion mit Abkürzungen
  - Automatische Filter-Generierung

### Erweiterte Filterung:
- **Definitionen erkennen**: Bei Fragen wie "Was ist...", "Definiere..." → Filter auf `chunk_type: ['definition', 'abbreviation']`
- **Tabellen-Fragen**: Bei "Liste", "Fristen", "Tabelle" → Filter auf `chunk_type: 'structured_table'`
- **Dokumentenbezug**: Bei Erwähnung von "GPKE", "MaBiS", etc. → Filter auf spezifischen `document_base_name`
- **Aktualitäts-Filter**: Standardmäßig nur die neuesten Dokumentversionen

### Verfügbare Metadaten-Felder:
```typescript
document_metadata: {
  document_base_name: string,  // z.B. "BK6-24-174_GPKE_Teil1_Lesefassung"
  publication_date: string,    // Format "YYYY-MM-DD"
  version: string             // z.B. "6_1b"
}
chunk_type: 'paragraph' | 'structured_table' | 'abbreviation' | 'definition' | 'visual_summary' | 'full_page'
```

## 2. Query-Transformation ✅

### HyDE (Hypothetical Document Embeddings):
- **Neue Methode**: `geminiService.generateHypotheticalAnswer(query)`
- Generiert hypothetische Antworten für bessere Vektor-Suche
- Prompt: *"Du bist ein Experte für die deutsche Energiewirtschaft. Beantworte prägnant..."*

### Query-Expansion:
- **Abkürzungs-Index**: In-Memory-Index aller `abbreviation` Chunks beim Service-Start
- Automatische Expansion: "MaBiS" → "MaBiS (Marktregeln für die Durchführung der Bilanzkreisabrechnung Strom)"
- Intent-basierte Query-Expansion

## 3. Intelligente Nachverarbeitung (Post-Processing) ✅

### Chunk-Type-bewusste Kontextualisierung:
- **Neue Methode**: `geminiService.synthesizeContextWithChunkTypes()`
- Gruppierung der Ergebnisse nach `chunk_type`
- Spezifische Prompt-Templates je Chunk-Typ:
  - `structured_table`: "Der folgende Auszug ist eine Markdown-Tabelle:"
  - `visual_summary`: "Die folgende ist eine textuelle Beschreibung eines Diagramms:"
  - `definition`: Priorisierung in "Definitionen und Begriffserklärungen" Sektion

### Re-Ranking (vereinfacht implementiert):
- **Neue Methode**: `geminiService.reRankResults()`
- Kombiniert Vektor-Score mit Text-Ähnlichkeit
- Sortiert Ergebnisse nach kombiniertem Score

## 4. Transparente Quellenangaben ✅

### Erweiterte Quellenmetadaten:
```typescript
sources: [{
  document: string,           // Dokumentname
  page: string,              // Seitenzahl
  chunk_type: string,        // Typ des Chunks
  score: number              // Relevanz-Score
}]
```

### Integrierte Quellenangaben:
- **Neue Methode**: `geminiService.generateResponseWithSources()`
- Automatische Quellenextraktion aus Metadaten
- Format: `[Dokumentname, Seite X]`
- Separater `sources` Array in der Antwort

## 5. Optimierte Suchfunktion ✅

### Neue Hauptmethode:
```typescript
QdrantService.searchWithOptimizations(
  query: string,
  limit: number = 10,
  scoreThreshold: number = 0.5,
  useHyDE: boolean = true
)
```

### Pipeline:
1. **Query-Analyse** → Intent-Erkennung & Filter-Kriterien
2. **Query-Expansion** → Abkürzungen erweitern
3. **HyDE** → Hypothetische Antwort generieren
4. **Pre-Filtering** → Metadaten-basierte Filter anwenden
5. **Vektor-Suche** → Optimierte Qdrant-Suche
6. **Post-Processing** → Chunk-Type-bewusste Verarbeitung

## 6. Integration in bestehende Services ✅

### ChatConfigurationService:
- Erweiterte `context_search` Verarbeitung
- Fallback zur Standard-Suche bei Fehlern
- Detaillierte Metriken und Logging
- Support für optimierte und Standard-Suche

### Chat-Routes:
- Aktualisierte `AdvancedRetrieval` Klasse
- Chunk-Type-bewusste Ergebnis-Verbesserung
- Erweiterte Metadaten in Antworten

## 7. Erweiterte Metadaten und Logging ✅

### Such-Metadaten:
```typescript
search_metadata: {
  original_query: string,
  expanded_query: string,
  search_query: string,           // HyDE-generiert oder expanded
  analysis_result: {
    intent_type: string,
    confidence: number,
    document_reference?: string,
    filter_summary: string
  },
  filter_applied: string[],
  used_hyde: boolean,
  latest_versions_available: number
}
```

## 8. Dokument-Mapping

### Unterstützte Dokumente:
```typescript
'GPKE' → 'BK6-24-174_GPKE_Teil1_Lesefassung'
'MaBiS' → 'MaBiS_Marktregeln_Bilanzkreisabrechnung_Strom'
'WiM' → 'WiM_Wechselprozesse_im_Messwesen'
'BDEW' → 'BDEW_Marktregeln'
'StromNEV' → 'StromNEV_Netzentgeltverordnung'
'EnWG' → 'EnWG_Energiewirtschaftsgesetz'
'MaKo' → 'MaKo_Marktkommunikation'
'EDIFACT' → 'EDIFACT_Standards'
'OBIS' → 'OBIS_Kennzahlen'
'UTILMD' → 'UTILMD_Stammdaten'
'MSCONS' → 'MSCONS_Verbrauchsdaten'
```

## Verwendung

### Aktivierung der optimierten Suche:
Die optimierte Suche ist standardmäßig in allen Chat-Konfigurationen aktiviert. Bei Fehlern erfolgt automatischer Fallback zur Standard-Suche.

### Beispiel-Anfragen die von den Optimierungen profitieren:

1. **Definition**: "Was ist eine BDEW-Marktrolle?"
   - Intent: `definition`
   - Filter: `chunk_type: ['definition', 'abbreviation']`
   - Dokumentfilter: `BDEW_Marktregeln`

2. **Tabellendaten**: "Liste der Fristen in der GPKE"
   - Intent: `table_data`
   - Filter: `chunk_type: 'structured_table'`
   - Dokumentfilter: `BK6-24-174_GPKE_Teil1_Lesefassung`

3. **Allgemeine Frage**: "Wie funktioniert der Lieferantenwechsel?"
   - Intent: `general`
   - Filter: Nur neueste Dokumentversionen
   - Query-Expansion mit Abkürzungen

## Monitoring und Debugging

Alle optimierten Suchen werden mit erweiterten Metadaten geloggt:
- Intent-Typ und Confidence
- Angewendete Filter
- Query-Transformationen
- Verwendete Dokumente und Chunk-Types
- Performance-Metriken

Die Implementierung ist vollständig rückwärtskompatibel und bietet automatischen Fallback bei Fehlern.
