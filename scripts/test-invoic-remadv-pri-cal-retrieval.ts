/*
 * Retrieval Diagnostic Script for INVOIC / REMADV PRI+CAL 00043 Feld 6411 Frage
 * Ziel: Vergleich verschiedener Such-Strategien (Guided, Multi-Query, HyDE, Raw) um zu prüfen,
 * ob relevante Chunks im Vector Store vorhanden sind und warum sie im Chat evtl. nicht genutzt wurden.
 *
 * Ausführen (Beispiele):
 *  npx ts-node --transpile-only scripts/test-invoic-remadv-pri-cal-retrieval.ts
 *  or:  node -r ts-node/register scripts/test-invoic-remadv-pri-cal-retrieval.ts
 *
 * Optional ENV:
 *  CHAT_VECTOR_LIMIT=40 CHAT_VECTOR_SCORE_THRESHOLD=0.25 npx ts-node --transpile-only scripts/test-invoic-remadv-pri-cal-retrieval.ts
 */

import { QdrantService } from '../src/services/qdrant';
import { generateEmbedding as providerEmbedding } from '../src/services/embeddingProvider';

interface RetrievalVariantResult {
  variant: string;
  query: string;
  results: any[];
  durationMs: number;
}

// --- 1. Ausgangssituation ---
const userQuestion = 'Müssten in den Vorgängen 31002, 31003 und 31009 im Segment Preis PRI+CAL 00043 die Werte am Feld 6411 mit M[12] markiert sein, anstatt mit X[12]?';
const userFollowup = 'Es geht um INVOIC / REMADV AHB 2.5d - konsolidierte Lesefassung mit Fehlerkorrekturen Stand: 23.06.2025';

// Extrahierte Kern-Entities (heuristisch)
const entities = {
  processes: ['31002','31003','31009'],
  segment: 'PRI+CAL',
  segmentQualifier: '00043',
  dataElement: '6411',
  doc: 'INVOIC / REMADV AHB 2.5d',
  date: '23.06.2025'
};

// Normalisierte Query-Bausteine
const canonicalFocus = `${entities.doc} Segment ${entities.segment} ${entities.segmentQualifier} DE ${entities.dataElement} Vorgänge ${entities.processes.join(' ')}`;
const cardinalityIntent = 'Prüfung ob Feld 6411 Pflicht (M) oder bedingt (X) für Vorgänge';

// Query Varianten für Multi-Query
const expandedQueries: string[] = [
  `${canonicalFocus} ${cardinalityIntent}`,
  `INVOIC REMADV 2.5d PRI CAL 00043 6411 ${entities.processes.join(' ')} Pflicht oder Bedingt Kardinalität`,
  `INVOIC AHB 2.5d Vorgang 31002 PRI CAL 00043 Daten Element 6411 M oder X`,
  `REMADV AHB 2.5d PRI+CAL 00043 DE6411 Prozesse ${entities.processes.join(' ')}`,
  // Variante mit englischen Signalwörtern für Embedding Diversität
  `INVOIC REMADV version 2.5d segment PRI CAL 00043 data element 6411 processes ${entities.processes.join(', ')} mandatory vs conditional`,
];

// Hilfsfunktion: Score extrahieren (merge aware)
function getScore(r: any): number {
  return (typeof r.merged_score === 'number' ? r.merged_score : (typeof r.score === 'number' ? r.score : 0));
}

function shortText(r: any, max = 140): string {
  const t = r.payload?.contextual_content || r.payload?.text || r.payload?.content || r.payload?.full_text || ''; 
  return t.replace(/\s+/g,' ').slice(0, max);
}

function highlightHits(text: string): string {
  return text
    .replace(/(3100[239])/g, '[$1]')
    .replace(/(6411)/g, '[$1]')
    .replace(/(PRI\+CAL)/gi, '[$1]')
    .replace(/\b(M|X)\[12\]/g, '[$1[12]]');
}

async function runVariant(name: string, query: string, fn: () => Promise<any[]>): Promise<RetrievalVariantResult> {
  const start = Date.now();
  const results = await fn();
  return { variant: name, query, results, durationMs: Date.now() - start };
}

async function main() {
  const service = new QdrantService();
  const variants: RetrievalVariantResult[] = [];

  // 1) Guided für Follow-up (voller Kontext)
  variants.push(await runVariant('guided_full', userFollowup, () => QdrantService.semanticSearchGuided(userFollowup, { limit: 40 })));

  // 2) Guided für kombinierte Frage (Frage + Follow-up verschmolzen)
  const mergedQuery = `${userQuestion} ${userFollowup}`;
  variants.push(await runVariant('guided_merged', mergedQuery, () => QdrantService.semanticSearchGuided(mergedQuery, { limit: 40 })));

  // 3) Multi-Query guided (vereinigt & dedupliziert)
  const multiResults: any[] = [];
  for (const q of expandedQueries) {
    const r = await QdrantService.semanticSearchGuided(q, { limit: 25 });
    multiResults.push(...r);
  }
  // Deduplizieren
  const seen = new Set();
  const multiUnique = multiResults.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
  variants.push({ variant: 'guided_multi_query', query: expandedQueries.join(' | '), results: multiUnique, durationMs: 0 });

  // 4) HyDE Optimized Suche (searchWithOptimizations) – nutzt interne Filter + HyDE
  variants.push(await runVariant('hyde_optimized', mergedQuery, () => service.searchWithOptimizations(mergedQuery, 40, 0.25, true)));

  // 5) Plain Vector ohne Guided (baseline)
  variants.push(await runVariant('plain_vector', mergedQuery, () => service.searchByText(mergedQuery, 40, 0.2)));

  // 6) Fokus Query nur auf Struktur & Elemente
  const structuralQuery = 'INVOIC REMADV 2.5d PRI CAL Segment 00043 Daten Element 6411 Kardinalität Prozesse 31002 31003 31009';
  variants.push(await runVariant('guided_structural', structuralQuery, () => QdrantService.semanticSearchGuided(structuralQuery, { limit: 40 })));

  // Reporting
  console.log('\n=== Retrieval Diagnose PRI+CAL / 6411 ===');
  console.log(`User Frage: ${userQuestion}`);
  console.log(`Follow-up:  ${userFollowup}`);
  console.log(`Expanded Queries (${expandedQueries.length}):`);
  expandedQueries.forEach(q => console.log('  • ' + q));

  for (const v of variants) {
    const scored = v.results.map(r => ({ id: r.id, score: getScore(r), r }));
    scored.sort((a,b) => b.score - a.score);
    const top = scored.slice(0, 8);
    const avg = scored.length ? (scored.reduce((s,x)=>s+x.score,0)/scored.length).toFixed(4) : '0';
    const withProcessHits = scored.filter(s => /3100[239]/.test(JSON.stringify(s.r.payload || {})) || /3100[239]/.test(shortText(s.r))).length;
    const withSegment = scored.filter(s => /PRI\+CAL/i.test(JSON.stringify(s.r.payload || {})) || /PRI\+CAL/i.test(shortText(s.r))).length;
    const withElement = scored.filter(s => /6411/.test(JSON.stringify(s.r.payload || {})) || /6411/.test(shortText(s.r))).length;

    console.log(`\n--- Variante: ${v.variant} ---`);
    console.log(`Query: ${v.query}`);
    console.log(`Dauer: ${v.durationMs} ms | Ergebnisse: ${scored.length} | ⌀Score: ${avg}`);
    console.log(`Treffer mit ProzessNr: ${withProcessHits} | Segment PRI+CAL: ${withSegment} | Element 6411: ${withElement}`);

    top.forEach(t => {
      const chunkType = t.r.payload?.chunk_type || 'n/a';
      const source = t.r.payload?.document_metadata?.document_base_name || t.r.payload?.source || t.r.payload?.title || 'unknown';
      const textFrag = highlightHits(shortText(t.r));
      console.log(`  ▹ ${t.score.toFixed(4)} | ${chunkType} | ${source} | ${textFrag}`);
    });
  }

  // Heuristische Empfehlung basierend auf Varianten
  console.log('\n=== Heuristische Auswertung ===');
  const guidedMulti = variants.find(v => v.variant === 'guided_multi_query');
  const plain = variants.find(v => v.variant === 'plain_vector');
  if (guidedMulti && plain) {
    const gain = guidedMulti.results.length - plain.results.length;
    console.log(`Multi-Query Guided liefert ${gain >= 0 ? '+' + gain : gain} mehr (unique) Chunks als Plain Vector.`);
  }
  console.log('Empfehlung: Für EDIFACT Kardinalitätsfragen Pattern-Extraction durchführen und strukturierte Multi-Queries + Guided Retrieval einsetzen.');

  console.log('\nFertig.');
}

main().catch(err => {
  console.error('Fehler im Diagnose-Skript:', err);
  process.exit(1);
});
