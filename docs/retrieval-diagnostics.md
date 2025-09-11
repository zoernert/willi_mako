# Retrieval Diagnostics: INVOIC / REMADV PRI+CAL Feld 6411

Dieses Dokument beschreibt, wie das Skript `scripts/test-invoic-remadv-pri-cal-retrieval.ts` verwendet wird, um Retrieval-Strategien zu vergleichen und Probleme bei fehlender Kontext-Anreicherung im Chat zu analysieren.

## Ziel
Die Frage:
```
Müssten in den Vorgängen 31002, 31003 und 31009 im Segment Preis PRI+CAL 00043 die Werte am Feld 6411 mit M[12] markiert sein, anstatt mit X[12]? (INVOIC / REMADV AHB 2.5d)
```
war vollständig durch vorhandene Chunks im Vector Store beantwortbar, wurde aber vom Chat nicht aufgelöst. Das Skript untersucht:
- Guided Retrieval vs. Plain Vector
- Multi-Query Expansion
- HyDE Optimized Search
- Struktur-fokussierte Queries

## Ausführen
```bash
# Optional ggf. Node-Module installieren
npm install

# (Optional) breitere Recall-Parameter
export CHAT_VECTOR_LIMIT=40
export CHAT_VECTOR_SCORE_THRESHOLD=0.25

# Diagnose laufen lassen
npx ts-node --transpile-only scripts/test-invoic-remadv-pri-cal-retrieval.ts
```

## Ausgabe-Interpretation
Für jede Variante werden angezeigt:
- Anzahl Ergebnisse & durchschnittlicher Score
- Anzahl Treffer mit Prozessen (31002/31003/31009), Segment (PRI+CAL) und Element (6411)
- Top Fragmente mit hervorgehobenen Treffern

## Erste Heuristiken
1. Multi-Query Guided sollte Plain Vector deutlich übertreffen → falls nicht: Embedding / Chunking prüfen.
2. Wenn Segment/Element kaum auftaucht: evtl. Normalisierung nötig (z.B. `PRI+CAL` → Tokenisierung sichern).
3. Niedrige Scores aber vorhandene Treffer → Threshold im Chatfluss weiter reduzieren oder Minimum-n-Ergebnisse erzwingen.
4. HyDE liefert bei strukturierten Element-Kardinalitätsfragen oft weniger Mehrwert als explizite strukturierte Queries.

## Nächste Schritte (Empfehlung)
- Dynamische Query-Erweiterung für Muster: Prozesse + Segment + DE-Nr.
- Re-Ranking (MMR) zur Reduktion redundanter Paragraphen.
- Forced Recall: Falls < N Treffer mit Segment + DE, zusätzliche gezielte Follow-up-Suche (`Segment <X> DE <Y>`).

## Anpassungen am Chatflow (vorgeschlagen)
- Vor Response Generation prüfen: Enthält Kontext mindestens 1 Chunk mit sowohl Segment `PRI+CAL` als auch `6411`? Wenn nein: Zusatz-Retrieval.
- Query-Rewriter einsetzen, der Kardinalitätsfragen erkennt (Regex auf `M\[|X\[` plus Segmentpattern) und strukturierte Zusatzqueries generiert.

---
Stand: 2025-09-11
