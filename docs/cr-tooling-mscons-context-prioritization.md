# Change Request – Kontext-Priorisierung für MSCONS Skripterstellung

## Motivation
- **Problem:** Bei der Tool-Generierung verdrängten generische UTILMD-Pseudocode-Snippets die mitgelieferte MSCONS-Datei.
- **Auswirkung:** Das LLM produzierte fehlerhafte oder unvollständige Skripte (häufiger Fehler `missing_code`) und driftete in falsche Segmentinterpretationen.
- **Ziel:** Attachments mit MSCONS-Inhalten müssen klar bevorzugt, fachfremde Snippets aktiv gefiltert und der Nachrichtentyp im Prompt betont werden.

## Backend-Änderungen
- **EDIFACT-Heuristiken:**
  - Analyse von Attachments, Anweisungen und Referenzen auf `UNH+…+MSCONS`, `BGM+Z06` etc. -> neue Felder `detectedMessageTypes` & `primaryMessageType`.
  - Attachments erhalten erhöhtes Gewicht (`weight ≥ 40`) und bleiben damit stets an der Spitze der Prompt-Kontexte.
- **Retrieval-Filter:**
  - Snippets, deren Payload oder Text einen abweichenden Nachrichtentyp (z. B. UTILMD) nennt, werden verworfen, wenn MSCONS erwartet wird.
  - Pseudocode-Retrieval nutzt dieselben Heuristiken und verweigert fachfremde Inhalte.
- **Prompt-Anreicherung:**
  - Primärer Nachrichtentyp wird explizit genannt („Fokus: MSCONS …“), um Modell-Drift zu reduzieren.
- **Repair-Hinweise:**
  - Automatische Repair-Prompts verweisen jetzt auf den erkannten Nachrichtentyp und fordern explizit die Nutzung der MSCONS-Segmente.

## Auswirkungen auf Clients
- Keine API-Änderung notwendig; Response-Schema bleibt unverändert.
- Jobs enthalten implizit genauere Hinweise, was die Fehleranalyse erleichtert.
- CLI/Frontend können optional `continuedFromJobId` + alte Fehlercodes nutzen, um MSCONS-spezifische Diagnosen darzustellen.

## Tests & Validierung
- `npm run type-check`
- Manuelle Kontrolle der Retrieval-Protokolle: Attachments erscheinen als erste Kontext-Snippets; UTILMD-Snippets werden verworfen, sobald MSCONS erkannt wurde.

## Follow-up
- Integrationstest schreiben, der eine MSCONS-Session mit UTILMD-Distraktoren simuliert.
- Telemetrie: Anteil verworfener Snippets nach Nachrichtentyp tracken, um weiteren Feinjustierungen eine Basis zu geben.
