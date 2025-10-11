# Chatflow-Architektur der Legacy-App

## Ziel und Kontext
Dieses Dokument beschreibt, wie der Chatflow in der Legacy-Anwendung aufgebaut ist – von der Benutzerinteraktion über die Retrieval- und Analysephasen bis zur Antwortgenerierung. Es benennt die zentralen Methoden und Funktionen, die Prompting, Thinking, Analyse und Grounding steuern. Das Ziel ist, neue spezialisierte Chat-Flows (Agenten) entwickeln zu können, ohne die bestehende Implementierung zu gefährden.

## High-Level-Überblick
- **UI & State-Management:** `app-legacy/src/pages/Chat.tsx` ist der primäre Einstieg. Für ältere Workflows existiert `app-legacy/src/components/ChatFlow.jsx`.
- **Client-Services:** `chatApi.ts`, `OptimizedSearchService.js`, `EnhancedQueryAnalysisService.js`, `ContextExtractionService.js`, `embeddingService.js` orchestrieren Vorverarbeitung und API-Aufrufe.
- **Backend-API:** `/api/chat/chats/:chatId/messages` (implementiert in `src/routes/chat.ts`) koordiniert die gesamte Server-Sequenz inkl. Safeguards, Reasoning und Persistenz.
- **Reasoning-Engine:** `advancedReasoningService.ts` kapselt Thinking-/Analyse-Schritte, `contextManager.ts` und `flip-mode.ts` liefern Grounding- und Präzisierungslogik. Vektor-Suche erfolgt über `QdrantService`.
- **Antwortausgabe:** Responses werden gespeichert, optional um CS/30-Inhalte erweitert (`generateCs30AdditionalResponse`) und mit Timeline/Gamification verknüpft.

## Clientseitiger Ablauf
### 1. UI-Interaktion (`Chat.tsx`)
- `sendMessage` (Zeilen ~520ff) validiert Eingabe, verwaltet Anhänge/Screenshots und ruft `chatApi.sendMessage` bzw. `chatApi.sendMessageWithScreenshot` auf.
- Kontext-Flags (`ContextSettings`) steuern Serververhalten z. B. `useDetailedIntentAnalysis`, `includeUserDocuments`, `useWorkspaceOnly`.
- Das UI reagiert auf Antworttypen:
  - `type === 'clarification'` → `pendingClarification` Workflow.
  - `hasCs30Additional` → Anzeige eines zweiten `assistantMessage` für CS/30.
- Timeline-Logging via `captureActivity('chat', …)` sorgt für Verlaufstracking.

### 2. Redux-basierter Legacy-Flow (`ChatFlow.jsx`)
- `handleSubmit` sendet sofort Benutzer-Nachrichten an den Store (`sendMessage` aus `../actions/chatActions`).
- **Clientseitiges Thinking/Grounding:**
  - `OptimizedSearchService.search(query, options)` kombiniert Query-Expansion, HyDE (`generateHypotheticalAnswer`), Filterung (`EnhancedQueryAnalysisService.createIntelligentFilter`) und Vektor-Suche (`performVectorSearch`).
  - `ContextExtractionService.extractContext(results, collection)` gruppiert Treffer nach Dokumenttyp und baut `rawText` für den Prompt.
- Anschließend wird `sendChatRequest` → POST `/api/chat` ausgeführt; Response wird via Redux gespeichert.

### 3. Service-Funktionen & reusable Utilities
- `chatApi.ts`
  - `sendMessage(chatId, content, contextSettings?)`
  - `generateResponse` (für Flip-Mode-Queries)
  - `sendClarification`, `updateShareSettings`, `getPublicChat`
- `OptimizedSearchService`
  - `search`, `performVectorSearch`, `reRankResults`, `fallbackSearch`
- `EnhancedQueryAnalysisService`
  - `optimizeQuery`, `generateHypotheticalAnswer`, `expandQuery`, `createIntelligentFilter`
- `embeddingService`
  - `generateEmbedding`, `generateHypotheticalAnswer`, `expandQueryForSearch`, `fetchCollectionDimension`

## Serversseitiger Ablauf (Route `POST /chat/chats/:chatId/messages`)
1. **Validierung & Deduping**
   - Prüft Eigentümer, nutzt `ensureChatColumns`.
   - Verhindert Doppel-Submits durch Vergleich der letzten Nachricht (Sektion „Deduplicate rapid duplicate submissions“).
2. **Flip-Mode / Clarification**
   - `flipModeService.analyzeClarificationNeed(content, userId)` erkennt Unklarheiten.
   - Bei Bedarf Speichern eines `clarification`-Message-Objekts und frühzeitige Response.
3. **Vorbereitung**
   - `previousMessages` & `userPreferences` laden.
   - `contextSettings` aus dem Frontend werden weitergereicht.
4. **Reasoning (Thinking & Analyse)**
   - `advancedReasoningService.generateReasonedResponse(query, history, prefs, contextSettings)` führt mehrstufige Pipeline aus:
     - **Quick Retrieval:** `QdrantService.semanticSearchGuided` (Outline-Scoping, Filter) → `analyzeContext` bewertet Qualität.
     - **Detailed Intent (optional):** `llm.generateStructuredOutput` für Intent & Query-Expansion, gesteuert durch `useDetailedIntentAnalysis`.
     - **Enhanced Retrieval:** `generateOptimalSearchQueries`, `performParallelSearch`, LLM-Re-Ranking (`rerankResultsLLM`), Hybrid-Suche.
     - **Response-Erstellung:** `generateDirectResponse` oder `generateRefinedResponse` (iterativ, heuristische Continuation via `llm.generateText`).
     - **Fallbacks:** Timeout → `AdvancedRetrieval.getContextualCompressedResults` + `llm.generateResponse`; Fehler → vereinfachte Suche.
     - Rückgabestruktur enthält `reasoningSteps`, `contextAnalysis`, `qaAnalysis`, `pipelineDecisions`, `apiCallsUsed`.
5. **Grounding mit Benutzerkontext**
   - `contextManager.determineOptimalContext(query, userId, history, contextSettings)` entscheidet, ob Workspace-Dokumente/Notizen genutzt werden.
   - Bei positivem Entscheid: `llm.generateResponseWithUserContext` kombiniert AI-Antwort mit `userContext.userDocuments` & `userNotes`.
6. **Persistenz & Metadaten**
   - Einfügen von User- und Assistant-Messages (Postgres).
   - `responseMetadata` speichert u. a. `reasoningSteps`, `contextSources`, `llmInfo`, Flags zu Hybridsuche & Nutzerkontext.
   - `llm.generateChatTitle` setzt nach erster Antwort den Chat-Titel.
7. **CS/30 Zusatzantwort (optional)**
   - `generateCs30AdditionalResponse` nutzt `qdrantService.searchCs30` und `llm.generateResponse` mit CS/30-Kontext.
   - Ergebnis als zusätzliche Nachricht mit `metadata.type = 'cs30_additional'` gespeichert.
8. **Timeline & Gamification**
   - `TimelineActivityService.captureActivity` (dynamisch importiert) protokolliert Chat-Ergebnisse.
   - `GamificationService.awardDocumentUsagePoints` vergibt Punkte bei Nutzung persönlicher Dokumente.

## Backend-Hilfsdienste und ihre Rollen
| Bereich | Datei/Funktion | Aufgabe |
| --- | --- | --- |
| Retrieval | `QdrantService.semanticSearchGuided`, `QdrantService.searchCs30` | Vektor-Suche, Guided Retrieval, CS/30 Collections |
| Thinking | `advancedReasoningService.generateReasonedResponse`, `generateDirectResponse`, `generateRefinedResponse` | Steuerung der Reasoning-Pipeline, Iteration, Continuation |
| Analyse | `analyzeContext`, `performQAAnalysis`, `computeContextMetrics` (implizit in `buildContextMetrics`) | Qualitätseinschätzung der Treffer, Confidence, Topics |
| Grounding | `contextManager.determineOptimalContext`, `workspaceService.searchWorkspaceContent`, `notesService` | Nutzerbezogene Kontexteinbindung |
| Clarification | `flipModeService.analyzeClarificationNeed`, `buildEnhancedQuery` | Abfragepräzisierung, Fragebögen, Enhanced Prompts |
| Prompting | `llm.generateResponse`, `llm.generateResponseWithUserContext`, `llm.generateText`, `llm.generateStructuredOutput`, `llm.generateChatTitle` | Kommunikation mit LLM inkl. Varianten (Gemini/Mistral) |
| Fallback | `AdvancedRetrieval.getContextualCompressedResults`, `retrieval.performVectorSearch` | Kompakter Kontext bei Timeouts/Fehlern |

## Erweiterungspunkte für neue Agenten
1. **Frontend-Konfiguration**
   - Neue Flows können `ContextSettings` erweitern (`overridePipeline`, `workspacePriority` o. Ä.).
   - Zusätzliche Buttons/Modi in `Chat.tsx` aktivieren gezielt Features (z. B. „Expert Flow“ → `useDetailedIntentAnalysis = true`).
2. **Service-Layer**
   - Spezifische Retrieval-Strategien: eigene Services analog zu `OptimizedSearchService` implementieren und Ergebnisse an `chatApi.sendMessage` hängen.
   - Clientseitige Grounding-Varianten können über `ContextExtractionService` erweitert werden.
3. **Backend-Pipeline**
   - `advancedReasoningService` bietet klare Einstiegspunkte: weitere `ReasoningStep`-Generatoren, z. B. Spezialagenten, können vor/nach `generateReasonedResponse` eingefügt werden.
   - Über `contextSettings.overridePipeline` (siehe Kommentare im Service) lassen sich alternative Iterationsstrategien aktivieren.
   - Zusätzliche Agenten können als eigene Endpunkte im selben Router registriert werden, solange `flipModeService`/`contextManager` wiederverwendet werden.
4. **Sicherheit & Isolation**
   - Neue Flows sollten eigene Feature-Flags nutzen und vorhandene Tabellen (`chats`, `messages`) unverändert lassen.
   - Antwort-Metadaten bieten Raum für Agent-Kennzeichen (`metadata.agent = 'compliance-audit'`).

## 📌 Anforderung: Agent für Node.js-Tooling (MSCONS → InfluxDB)

### Nutzung des bestehenden Chatflows
- **Wissensakquise (Prompting & Grounding):**
  - MSCONS-/EDIFACT-Dokumentation liegt in der `willi_mako`-Collection (Chunk-Typen `pseudocode_*`, `structured_table`, `definition`).
  - Der Agent kann mittels vorhandener Retrieval-Pipeline (`advancedReasoningService` → `QdrantService.semanticSearchGuided`) gezielt Fragen zur Struktur stellen; in Antworten sollten Quellen (`metadata.contextSources`, `reasoningSteps`) den Doc-Nachweis liefern.
  - Für fokussierte MSCONS-Abfragen empfiehlt sich ein neues Kontextprofil `contextSettings` mit `overridePipeline` → Forced iterative refinement + `useDetailedIntentAnalysis`, damit `generateStructuredOutput` Domain-Entitäten extrahiert.
- **Domänenspezifische Extraktion:**
  - Ergänzend zur bestehenden Pipeline kann ein optionaler Reasoning-Step eingefügt werden, der MSCONS-Segmente (z. B. `UNH`, `BGM`, `DTM`, `MEA`) identifiziert und als strukturierte JSON-Antwort zurückliefert. Dies lässt sich über `advancedReasoningService` um einen weiteren `ReasoningStep` erweitern, bevor die finale Antwort generiert wird.
- **Script-Planung:**
  - Der Agent kann auf Basis der Retrieval-Ergebnisse einen Implementierungsplan erzeugen (Segment-Mapping → JSON → InfluxDB Line Protocol). Dieser Plan wird weiterhin im Chat präsentiert; Persistenz erfolgt über das bestehende `messages`-System.

### Fehlende/zu ergänzende Informationen
- **Sandbox/Code-Ausführung:** Aktuell gibt es keinen eingebauten Execution- bzw. Build-Service. Für das Erstellen und Testen von Node.js-Skripten muss eine neue Tool-Schnittstelle geschaffen werden (z. B. Service oder Worker, der npm-Projekte in isolierten Containern ausführt). Dieser Schritt ist _nicht_ Teil der vorhandenen Chat-Pipeline und muss separat angebunden werden (neuer `ReasoningStep`, der Toolaufrufe orchestriert).
- **Artefaktverwaltung:** Ergebnisse (z. B. generierte Skripte, `package.json`) werden derzeit nicht automatisch abgelegt. Für NPM-Publishing sind zusätzliche Mechanismen nötig (Dateiablage, Zugriff auf Git/Registry-Credentials). In der bestehenden Struktur ließe sich das über einen dedizierten Backend-Endpunkt erledigen, der die vom Agenten erzeugten Artefakte entgegennimmt und versioniert.
- **InfluxDB-Verbindungsdetails:** Die Pipeline kennt keine spezifischen Zielsysteme. Für Tests müssen entweder Dummy-Credentials hinterlegt oder ein Mock-Service verwendet werden. Dokumentation dazu sollte, sobald definiert, im Workspace (z. B. `docs/integrations/INFLUX.md`) ergänzt und via `ContextExtractionService` referenzierbar sein.

### Vorgehensmodell für den MSCONS-Agenten
1. **Vorbereitende Abfragen:** Agent nutzt Standard-Chat, um MSCONS-Segmentstruktur, Datentypen, Messwertlogik zu extrahieren (Retrieval + `reasoningSteps` dokumentieren).
2. **Transformationslogik ableiten:** Über zusätzliche Reasoning-Schritte werden Mapping-Tabellen (Segment → Influx-Measurement) aufgebaut und als Zwischenergebnis gespeichert (`assistantMessage.metadata.agentPlan`).
3. **Script-Generierung:** Ein neuer Pipeline-Schritt erzeugt das Node.js-Skript (z. B. `mscons-to-influx/index.js`, `package.json`). Ohne Sandbox bleibt dies Text; mit Tool-Schnittstelle kann das Artefakt in einer isolierten Umgebung ausgeführt und getestet werden.
4. **Validierung & Feedback:** Testergebnisse / Linting werden als weitere Nachrichten (`metadata.agentResult`) zurückgemeldet. Fehlermeldungen fließen in die nächste Reasoning-Iteration.

Damit lässt sich der Agent auf Basis des bestehenden Chatflows konzipieren; die eigentliche Code-Ausführung erfordert jedoch eine zusätzliche Tooling-Schicht, die noch nicht implementiert ist.

## Empfehlungen für die Implementierung neuer Flows
- **Keine bestehenden Routen ersetzen**, sondern neue Pfade oder Flags verwenden.
- **ReasoningSteps dokumentieren**: Neue Agenten sollten eigene `step`-Bezeichner setzen, um Debugging im Admin-Interface zu erleichtern.
- **Hybride Kontexte klar kennzeichnen**: Wenn zusätzliche Datenquellen genutzt werden, Quellen im `metadata`-Feld des Assistant-Messages ablegen.
- **Timeouts respektieren**: Die Pipeline nutzt ein Budget; neue Agenten sollten entweder ihren eigenen Timeout mitbringen oder den bestehenden `reasoningBudgetMs` berücksichtigen.
- **Tests**: Für Backend-Erweiterungen `npm run type-check` und relevante Jest-Suites (`jest.integration.config.js`) ausführen.

## Quick Reference
- **Einstiegspunkt UI:** `Chat.tsx -> sendMessage`
- **API-Client:** `chatApi.sendMessage`
- **Server-Route:** `router.post('/chats/:chatId/messages')`
- **Reasoning Core:** `advancedReasoningService.generateReasonedResponse`
- **Clarification:** `flipModeService.analyzeClarificationNeed`
- **User Context:** `contextManager.determineOptimalContext`
- **CS/30 Zusatz:** `generateCs30AdditionalResponse`

Diese Struktur erlaubt es, spezialisierte Agenten aufzubauen, indem neue Retrieval-/Reasoning-Schritte hinzugefügt, konfigurierbare Flags genutzt oder separate Endpunkte eingeführt werden – ohne den vorhandenen Flow zu destabilisieren.
