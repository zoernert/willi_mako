# QDrant Retrieval-Guidelines + Rezepte (willi_mako)

Die QDrant Collection „willi_mako“ wurde optimiert. Nutzt die folgenden Richtlinien, um die semantische Suche bestmöglich auf die neuen Chunks abzustimmen.

## Was ist im Vektorstore (relevant fürs Retrieval)

- chunk_type:
  - pseudocode_header
  - pseudocode_flow
  - pseudocode_validations_rules
  - pseudocode_table_maps
  - pseudocode_functions
  - pseudocode_examples
  - pseudocode_anchors
  - pseudocode_entities_segments
  - pseudocode_outline
  - structured_table
  - visual_structure
- Metadaten:
  - source_document
  - page_number
  - section_name
  - keywords
  - pseudocode_functions
  - pseudocode_rules

## Empfohlene Retrieval‑Rezepte

### Default (empfohlen): Dual‑Search + Merge
1. Zwei Suchen ausführen und gewichten:
   - S1: Filter chunk_type IN pseudocode_* (Flow/Rules/Functions/TableMaps), Gewicht α=0.7–0.8
   - S2: Ungefiltert oder mit leichtem Filter (z. B. visual_structure ausschließen), Gewicht (1−α)
2. Scores mergen, nach Score sortieren, Duplikate per id entfernen.
3. Optional: leichte Payload‑Heuristik zum Re‑Ranking (Chunk‑Typ/Keywords boosten).

### Outline‑Scoping (hierarchisch)
- Schritt A: Suche nur in chunk_type = pseudocode_outline, Top‑Seiten extrahieren.
- Schritt B: Danach Suche innerhalb dieser Seiten (payload filter page_number IN …) mit Fokus auf pseudocode_* + structured_table.

### Tabellen‑Anfragen
- Direkt auf chunk_type IN [pseudocode_table_maps, structured_table] filtern.
- Query bei Bedarf mit Begriffen wie „Segment“, „Feld“, „Code“, „Qualifier“ erweitern.

### Regelfragen/Validierungen
- chunk_type = pseudocode_validations_rules priorisieren (oder darauf filtern).

### Funktionen/Flows
- chunk_type IN [pseudocode_functions, pseudocode_flow] priorisieren.
- Zusätzlich payload‑Matches in pseudocode_functions (Array) nutzen.

## Minimaler Node‑Client: Dual‑Search mit Gewichtung + optionales Outline‑Scoping

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { QdrantClient } from "@qdrant/js-client-rest";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const client = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY!,
});

async function embed(text: string): Promise<number[]> {
  const res = await genAI.embedContent({
    model: "models/text-embedding-004",
    content: { parts: [{ text }] },
  });
  return res.embedding.values;
}

function mergeWeighted<T extends { id: string | number; score: number }>(
  resultsA: T[],
  resultsB: T[],
  alpha = 0.7
) {
  const map = new Map<string | number, { point: T; score: number }>();
  for (const r of resultsA) map.set(r.id, { point: r, score: alpha * r.score });
  for (const r of resultsB) {
    const prev = map.get(r.id);
    if (prev) prev.score += (1 - alpha) * r.score;
    else map.set(r.id, { point: r, score: (1 - alpha) * r.score });
  }
  return [...map.values()]
    .sort((a, b) => b.score - a.score)
    .map((x) => ({ ...x.point, merged_score: x.score }));
}

function filterPseudocode() {
  return {
    must: [
      {
        key: "chunk_type",
        match: {
          any: [
            "pseudocode_flow",
            "pseudocode_validations_rules",
            "pseudocode_functions",
            "pseudocode_table_maps",
            "pseudocode_entities_segments",
            "pseudocode_header",
            "pseudocode_examples",
            "pseudocode_anchors",
          ],
        },
      },
    ],
  } as const;
}

function filterExcludeVisual() {
  return { must_not: [{ key: "chunk_type", match: { value: "visual_structure" } }] } as const;
}

function filterByPages(pages: number[]) {
  return { must: [{ key: "page_number", match: { any: pages } }] } as const;
}

async function searchQdrant({
  vector,
  filter,
  limit = 20,
}: {
  vector: number[];
  filter?: any;
  limit?: number;
}) {
  return client.search({
    collection_name: process.env.QDRANT_COLLECTION!,
    vector,
    limit,
    with_payload: true,
    with_vectors: false,
    filter,
  }); // -> Array<{ id, score, payload, ... }>
}

async function outlineScope(query: string, topPages = 3): Promise<number[]> {
  const v = await embed(query);
  const outline = await searchQdrant({
    vector: v,
    filter: { must: [{ key: "chunk_type", match: { value: "pseudocode_outline" } }] },
    limit: topPages,
  });
  const pages = [...new Set(outline.map((p: any) => p.payload.page_number))].filter(
    (x) => x != null
  );
  return pages;
}

export async function semanticSearch(query: string) {
  const v = await embed(query);

  // Optional: erst Outline‑Seiten bestimmen
  let pageFilter: any = null;
  try {
    const pages = await outlineScope(query, 3);
    if (pages.length) pageFilter = filterByPages(pages);
  } catch (_) {}

  const combineFilters = (...filters: any[]) => {
    const must: any[] = [];
    const must_not: any[] = [];
    for (const f of filters.filter(Boolean)) {
      if (f.must) must.push(...f.must);
      if (f.must_not) must_not.push(...f.must_not);
    }
    return { ...(must.length ? { must } : {}), ...(must_not.length ? { must_not } : {}) };
  };

  // S1: Pseudocode‑only
  const filterA = combineFilters(filterPseudocode(), pageFilter);
  const resA = await searchQdrant({ vector: v, filter: filterA, limit: 30 });

  // S2: Breiter, aber visual_structure ausschließen
  const filterB = combineFilters(filterExcludeVisual(), pageFilter);
  const resB = await searchQdrant({ vector: v, filter: filterB, limit: 30 });

  // Gewichten und mergen
  const merged: any[] = mergeWeighted(resA as any, resB as any, 0.75);

  // Optional: leichte Payload‑basierte Re‑Rank‑Heuristik
  const boost = (p: any) => {
    const t = p.payload?.chunk_type || "";
    let b = 0;
    if (t.includes("pseudocode_validations_rules")) b += 0.06;
    else if (t.includes("pseudocode_flow")) b += 0.04;
    else if (t.includes("pseudocode_table_maps")) b += 0.03;
    if ((p.payload?.keywords || []).some((k: string) => /AHB|MIG|EDIFACT|ORDCHG|PRICAT/i.test(k))) b += 0.02;
    return b;
  };

  for (const p of merged) p.merged_score += boost(p);
  merged.sort((a, b) => b.merged_score - a.merged_score);
  return merged.slice(0, 20);
}
```

### Benötigte Umgebungsvariablen

- GOOGLE_API_KEY
- QDRANT_URL
- QDRANT_API_KEY
- QDRANT_COLLECTION

## Query‑Erweiterung (für bessere Treffer)

- Füge bekannte Domänenanker ein (wenn vorhanden):
  - AHB/MIG‑Version
  - Nachrichtentyp (PRICAT, ORDCHG, APERAK, IFTSTA …)
  - Relevante Segmente/Codes (BGM, NAD, LIN, QTY, PRI, DTM, RFF, UNS, UNH …)
- Beispiel: „Wie wird Preis in PRICAT AHB 2.0e gemappt?“ →
  - „PRICAT AHB 2.0e Preis Mapping QTY PRI Segment LIN Felder Regeln“

## Antwort‑Synthese (LLM Prompt‑Hinweise)

- Cite‑and‑ground: Nur Inhalte aus den bereitgestellten Chunks nutzen und chunk_type/Seite nennen.
- Pseudocode bevorzugen: Falls vorhanden, zuerst pseudocode_* nutzen; tabellarische Details aus structured_table ergänzen.

## Schnelle Verifikation

- Outline‑Seiten testen:

```bash
node retrieval_harness.js ORDCHG_MIG_1_1_20230331.pdf 1 ORDERS
```

- Chunk‑Typen eines Dokuments prüfen:

```bash
npm run verify:index -- PRICAT_AHB_2_0e_20240619.pdf 2 QTY
```

---

Diese Rezepte reichen aus, um die semantische Suche sofort zu verbessern: Outline‑Scoping, Pseudocode‑Priorisierung, Dual‑Search‑Merging und leichte Payload‑Booster.