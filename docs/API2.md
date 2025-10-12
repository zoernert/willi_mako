# API v2 – Parallel REST-Architektur Plan

## Ziele
- Eine neue REST-Schicht `api/v2` einführen, ohne die bestehende Chat-Infrastruktur zu verändern.
- Schrittweise Entkopplung der Kernfunktionen (Session/Context, Retrieval, Reasoning, Tooling) über klar definierte Endpunkte.
- Parität mit der bestehenden Chat-Erfahrung sicherstellen, bevor Legacy-Code refaktoriert oder abgelöst wird.
- Erkenntnisse aus `docs/CHATFLOW.md` als fachlicher Referenzrahmen nutzen, damit API v2 den bestehenden Chatflow exakt widerspiegelt.

## Leitprinzipien
1. **Top-down Iteration:** Zuerst einen neuen Chat-Endpunkt schaffen, der intern den bestehenden Code nutzt („Parity Mode“). Danach Komponentenschnitt folgen lassen.
2. **Session-first:** Benutzerkontext (Session, Workspace, Policies) als eigenes REST-Konzept einführen, damit spätere Dienste ihn referenzieren können.
3. **Kompatibilität:** Alte Routen bleiben unverändert. Feature-Flags/Config entscheiden, ob neue Clients `api/v2` nutzen.
4. **Dokumentation & Verträge:** Für jeden neuen Endpunkt OpenAPI-Skizze / JSON-Schema pflegen, um Konsumenten (Agenten, Worker, UIs) zu unterstützen.
5. **Security & Observability:** AuthN/AuthZ, Rate-Limits und Monitoring mitdenken, auch wenn erste Iteration noch interne Nutzung hat.

## Bezug zum bestehenden Chatflow
Die Legacy-Architektur (siehe `docs/CHATFLOW.md`) liefert die fachliche Vorlage für API v2. Relevante Zuordnungen:
- **UI/Client-Verhalten:** `Chat.tsx` & `ChatFlow.jsx` → `POST /api/v2/chat` muss dieselben States (`type`, `metadata`, CS30-Responses) zurückliefern.
- **Services:**
   - `advancedReasoningService` ↔ zukünftiger `ReasoningService` (`/api/v2/reasoning/generate`).
   - `contextManager` ↔ `SessionService` + `ContextService` (`/api/v2/sessions`, `/api/v2/context/resolve`).
   - `QdrantService` ↔ Retrieval-Endpunkte.
   - `flip-mode` ↔ optionale Clarification-API.
- **Metadaten & Timeline:** Informationen, die heute in `responseMetadata` und Timeline-Events landen, müssen über API v2 transportiert oder emitierbar bleiben.
- **Agenten-Erweiterung:** Die in `CHATFLOW.md` skizzierten Agentenpfade (MSCONS → InfluxDB) verwenden künftig API v2 Endpunkte – insbesondere Session, Retrieval, Reasoning und Tooling.

Diese Verknüpfung sorgt dafür, dass API v2 nicht isoliert entsteht, sondern direkt die bestehende Logik reproduziert und erweitert.

## Laufzeitumgebung & Datenquellen
- **Primäre Datenbank:** MongoDB (konfiguriert via `MONGO_URI` in `.env`) dient als Schreib-/Lesespeicher für neue API-v2-Services (Sessions, Artefakte, Tool-Jobs etc.).
- **Postgres (bestehende `DATABASE_URL`):** bleibt read-only für Legacy-Daten (Chats, Timeline, Gamification). API v2 liest bei Bedarf, führt aber keine schreibenden Operationen aus.
- Services müssen explizit kennzeichnen, ob sie Mongo- oder Postgres-Zugriffe benötigen, damit spätere Migrationen klar bleiben.

### Authentifizierung & Autorisierung
- JWT bleibt das zentrale Authentifizierungsverfahren (Kompatibilität zur Legacy-App).
- Neuer Endpoint `POST /api/v2/auth/token`:
   - Body: `{ email, password }`.
   - Validierung gegen bestehende User-Tabelle / Service.
   - Antwort: `{ accessToken, expiresAt }` mit Gültigkeit ≥ 30 Tage.
   - Signing-Key & Claims kompatibel zum bisherigen Token-Format.
- Alle `api/v2`-Endpoints erwarten `Authorization: Bearer <token>`.
- Langfristig Refresh-/Revoke-Mechanismus prüfen, initial genügt langer JWT ohne Refresh.

### Rate Limiting (Phase 1 Basis)
- In-Memory Token Bucket / Sliding Window pro `sessionId` + Endpoint.
- Konfiguration via Env (`API_V2_RATE_LIMIT_*`).
- Neustart setzt Limits zurück (keine externe Abhängigkeit).
- Später optional Redis/Cluster-Storage, aber erst nach Stabilisierung.

### Metriken & Logging
- Per Endpoint: Requests, Fehlerquote, Latenz (P50/P95), Rate-Limit-Hits.
- Per Session: Anzahl Requests, verwendete Services (retrieval, reasoning, tooling).
- Implementierungsidee: Middleware, die `sessionId` aus Header extrahiert und in Metrics-Namespace schreibt (`api_v2.<endpoint>.<metric>`).
- Export zunächst via Prometheus-Endpoint oder strukturierte Logs (JSON) für spätere Analyse.

## Phasenplan

### Phase 0 – Foundations
- Ordnerstruktur `src/presentation/http/api/v2` (Express-Router) + `docs/api/v2/*.md`.
- Gemeinsame DTOs/Interfaces in `src/domain/api-v2` (z. B. `SessionEnvelope`, `ReasoningRequest`).
- Feature-Flag `API_V2_ENABLED` (Env + config service).

### Phase 1 – Session & Parity Chat
1. **Session Endpoint**
   - `POST /api/v2/sessions`
     - Input: `userId`, optional `preferences`, `contextSettings` override.
     - Output: `sessionId`, `workspaceContext`, `policyFlags`, TTL/refresh hints.
   - Implementation: Wrap existierenden `contextManager` + User-Profile-Lookups in Service `SessionService`.
2. **Chat Parity Endpoint**
   - `POST /api/v2/chat`
     - Input: `sessionId`, `message`, optionale `contextSettings` (übersteuern Session).
     - Output: Gleiches Schema wie alte Route (`userMessage`, `assistantMessage`, `metadata`).
   - Implementation: interner Aufruf der Legacy-Route (z. B. via `ChatFlowService`), damit Verhalten identisch bleibt.
3. **Auth Token Endpoint**
   - `POST /api/v2/auth/token`
     - Input: `{ email, password }`.
     - Output: `{ accessToken, expiresAt }` (JWT ≥ 30 Tage gültig).
   - Implementation: nutzt bestehende Auth-Service-Logik; Signing-Key identisch zur Legacy.
4. **Rate Limiting & Metrics Middleware**
   - Globale Middleware für In-Memory-Limits (`sessionId` + Endpoint) und metric hooks.
   - Logging erweitert um `sessionId`, `endpoint`, `durationMs`, `rateLimited`.
5. **OpenAPI & Test-Client**
   - Automatisch generierte `openapi.json` (Build-Step oder Express-Middleware) nach Phase 1 verfügbar.
   - Minimales Test-Client-Skript oder Insomnia/Postman Collection, um Token holen + Chat-Call gegen `api/v2` zu demonstrieren.
3. **Monitoring**
   - Request-Logging, Metriken (`session_created`, `chat_v2_request_time`).

### Phase 2 – Komponenten-Refinement
1. ✅ **Retrieval API** – umgesetzt in `POST /api/v2/retrieval/semantic-search`; nutzt den neuen `RetrievalService` als Wrapper um `QdrantService` inklusive Options-Handling und Ergebnis-Metadaten.
2. ✅ **Reasoning API** – umgesetzt in `POST /api/v2/reasoning/generate`; kapselt `advancedReasoningService.generateReasonedResponse` über den neuen `ReasoningService` und liefert strukturierte Metadaten.
3. ✅ **Context Resolution** – umgesetzt in `POST /api/v2/context/resolve`; verwendet den neuen `ContextService`, der `contextManager.determineOptimalContext` mit Session-Settings kombiniert.
4. ✅ **Clarification / Flip Mode** – umgesetzt in `POST /api/v2/clarification/analyze`; stellt die Flip-Analyse inklusive optionaler Enhanced-Query bereit.

### Phase 3 – Erweiterte Fähigkeiten
1. ✅ **Tooling / Sandbox (POC)**
   - `POST /api/v2/tools/run-node-script` nimmt Jobs entgegen, validiert Source & Timeout und legt einen geprüften Queue-Eintrag an.
   - `GET /api/v2/tools/jobs/:id` liefert Status, Hash/Preview und Sicherheits-Hinweise; Ausführung bleibt manuell (diagnostics `executionEnabled=false`).
   - Persistenz aktuell In-Memory; Nachfolger-Schritt: Worker/Queue für echte Sandbox-Runner.
2. ✅ **Artefakt-Service (POC)**
   - `POST /api/v2/artifacts` legt Inline-Artefakte (UTF-8/Base64) mit Hash, Preview und Metadaten ab.
   - Unterstützt optionale Tags, Versionen und sanitisierte Metadata; Speicherung erfolgt vorerst in-memory.
3. **Integration Hooks**
   - Webhooks oder Queue-Events (z. B. `reasoning.completed`) für Timeline/Gamification.

### Phase 4 – Legacy Alignment
- Evaluation: Welche Legacy-Routen können auf API v2 umgestellt werden?
- Refactoring-Plan für `src/routes/chat.ts` → Nutzung von `SessionService`, `ReasoningService` anstelle direkter Aufrufe.
- Cleanup: doppelte Implementierungen entfernen, sobald API v2 stabil ist.

## Endpunktübersicht (Startversion)
| Endpoint | Zweck | Status |
| --- | --- | --- |
| `POST /api/v2/auth/token` | JWT aus Credentials erzeugen | Phase 1 |
| `POST /api/v2/sessions` | Session/Context anlegen | Phase 1 |
| `POST /api/v2/chat` | Chat-Interaktion mit Parität | Phase 1 |
| `POST /api/v2/retrieval/semantic-search` | Vektor-Suche | Phase 2 |
| `POST /api/v2/reasoning/generate` | LLM-Reasoning | Phase 2 |
| `POST /api/v2/context/resolve` | Workspace-Kontext bestimmen | Phase 2 |
| `POST /api/v2/tools/run-node-script` | Sandbox-Job registrieren (manuelle Freigabe) | Phase 3 (POC) |
| `GET /api/v2/tools/jobs/:id` | Tool-Job Status/Diagnostik abrufen | Phase 3 (POC) |
| `POST /api/v2/artifacts` | Artefakte speichern | Phase 3 (POC) |

## Security Considerations
- **Token-Härtung:** Langlebige JWTs werden nur über TLS ausgeliefert; beim Ausbau der Refresh-Mechanik müssen wir Refresh-Token getrennt absichern und Rotations-Logs führen. Signing-Keys bleiben via Secrets-Manager versioniert.
- **Least Privilege:** Session- und Service-Scopes definieren, sodass Retrieval/Reasoning nur die minimal notwendigen Ressourcen verwenden (z. B. getrennte API-Schlüssel für Qdrant/LLM mit klaren Rollen).
- **Input-Validierung:** Alle `POST /api/v2/*` Endpunkte validieren Payloads strikt (z. B. Zod/JSON-Schema) und rejecten unbekannte Felder, damit kein Injection-Surface entsteht.
- **Datenklassifizierung:** Responses enthalten keine Roh-Personendaten; sensible Felder werden maskiert, Telemetrie erhält nur Hashes (`sessionId`, nicht `userId`).
- **Observability & Audit:** Auth-Fehler, Rate-Limit-Treffer und Admin-Aktionen werden revisionssicher geloggt (PII-safe) und 30 Tage aufbewahrt.
- **Sandbox-Gating:** Tooling-Jobs werden mit Hash/Preview gespeichert, nicht ausgeführt; zukünftig nur in isolierten Containern mit erlaubten APIs freigeben.

## Performance Considerations
- **Vektor-Retrieval:** Qdrant-Abfragen nutzen `search_batch` mit Top-K Limit ≤ 10, Filter-Indexierung für häufige Suchen und optionales Cache-Layer (Redis) für identische Queries pro Session.
- **Reasoning-Latenzen:** LLM-Aufrufe laufen mit Timeout/Abbruchsignal (z. B. 45 s) und optionaler Teil-Streaming-Unterstützung, damit Frontends früh reagieren können.
- **Session-Kontext:** Context-Resolution cached Workspace-Metadaten pro `sessionId`, invalidiert bei expliziten Overrides und reduziert DB-Hits.
- **Rate Limiting:** Token-Bucket Parameter werden per Env getuned; Reasoning-Endpunkte haben strengere Limits. Drosselung wird früh (Middleware) durchgeführt, um CPU-intensive Services zu schonen.
- **Throughput-Scaling:** Backend-Knoten starten mit gepoolten HTTP/DB-Clients; horizontales Scaling erfolgt stateless (Sessions in Mongo), Qdrant erhält separate Auto-Scaling-Policy.
- **Job Queue:** Aktuell In-Memory; Migration auf Redis/Worker vorgesehen, damit Sandbox-Aufträge resilient und parallel ausführbar werden.

## Qualitätssicherung & Tests
- **Unit-Tests:** Services (Session, Auth, Reasoning-Adapter) erhalten isolierte Tests mit Fixtures für Mongo/Postgres-Stubs.
- **Integrationstests:** Endpunkt-Tests über Supertest oder Pact, die Feature-Flag-Flow, Auth und Parity-Verhalten gegen Legacy-Route verifizieren.
- **Contract-Tests:** OpenAPI-Schema als Quelle für Consumer-Tests (z. B. Insomnia CLI, Schemathesis) zur Sicherstellung stabiler Verträge.
- **Load-/Spike-Checks:** Mindestens synthetische Lasttests für `POST /chat`, um Rate-Limit-Umschaltung zu verifizieren.
- **CI-Anbindung:** Pipeline-Schritte ergänzen (`npm run test:api-v2`, `npm run lint`, OpenAPI-Validation), bevor Merge in `main` möglich ist.

## Datenmodellierung & Migration
- **Collections/Tabellen:** Schema-Definitionen für Mongo (`sessions`, `artifacts`, `tool_jobs`) in `docs/api/v2/schema/*.json` hinterlegen; Mongoose/Prisma-Models später ableiten.
- **Migration Pfad:** Skripte für initiale Collections anlegen (`npm run db:migrate:api-v2`) und Backfill-Strategie für Legacy-Sessions beschreiben (nur lesend).
- **Retention & Cleanup:** TTL-Index für Sessions (z. B. 30 Tage) und Archivierungskonzept für Artefakte.
- **Cross-DB-Zugriffe:** Klare Adapter-Layer, die Postgres-Reads kapseln, damit Deployment ohne PG optional bleibt (Fallbacks dokumentieren).

## Betrieb & Deployment
- **Feature-Flag-Rollout:** `API_V2_ENABLED` zuerst nur in Staging aktivieren; Canary-Routing für ausgewählte interne Nutzer.
 - **Konfiguration:** `.env.example` um neue Variablen (`API_V2_RATE_LIMIT_*`, `API_V2_TOKEN_EXPIRES_IN`) ergänzen und in README beschreiben.
- **Observability:** Prometheus-Scrape-Pfad (`/metrics/api-v2`) und zentrale Log-Filter (z. B. Loki/ELK) vorbereiten.
- **Incident-Playbook:** Rückfall auf Legacy-Routen (Flag toggeln, Sessions invalidieren) muss dokumentiert werden.
- **Security-Review:** Threat-Model durchführen (Brute Force Token, Session Hijacking) und Checkliste im Projekt-Wiki ablegen.

## Implementierungsstatus (Oktober 2025)
- ✅ Feature-Flag `API_V2_ENABLED` und Router unter `src/presentation/http/routes/api/v2` integriert.
- ✅ Session-Service (`MongoDB` + `chats`-Backlink) inkl. Unit-Test (`tests/unit/api-v2/session.service.test.ts`).
- ✅ Paritäts-Chat (`POST /api/v2/chat`) ruft Legacy-Endpunkt mit Rate-Limiter & Metrics auf.
- ✅ Auth-Token Endpoint (`POST /api/v2/auth/token`) mit 30-Tage-JWT.
- ✅ In-Memory Rate-Limiter + Metrics (`/api/v2/metrics`) sowie OpenAPI-Skizze (`/api/v2/openapi.json`).
- ✅ Test-Client (`scripts/api-v2-test-client.ts`) via `npm run test:api-v2`.
- 🟡 Tooling-Sandbox POC (`POST /api/v2/tools/run-node-script`, `GET /api/v2/tools/jobs/:id`) mit In-Memory Queue, manueller Freigabe und Diagnostik-Hinweisen.
- 🟡 Artefakt-Service POC (`POST /api/v2/artifacts`) inklusive Hash/Preview, In-Memory-Storage und Validierung.

## Offene Fragen
- Authentifizierung: JWT aus bestehendem System übernehmen oder getrennte Token? Session-Endpunkt muss klar definieren, wie `userId` validiert wird.
- Rate Limiting: Session-Creation und Reasoning begrenzen (z. B. via Redis Token Bucket).
- Observability: Welche Metriken/Logs müssen wir erfassen? Pro Session? Pro Endpoint?
- Versionierung: API v2 Endpunkte sollen stabil bleiben → Breaking Changes nur via v3.
- Datenhaltung: Wie werden TTL/Cleanup-Prozesse operationalisiert und wer besitzt sie?
- Compliance: Gibt es Archivierungs-/Audit-Anforderungen, die Mongo-Collections erfüllen müssen?

## Nächste Schritte
1. Sandbox-Runner implementieren (Worker/Queue, isolierte Runtime) und bestehende Jobs migrieren.
2. Webhook-/Queue-Hooks für Reasoning & Tooling ausarbeiten (Gamification/Timeline).
3. Persistente Speicherung der Tool-Jobs (Mongo/Redis) + Admin-Dashboard zur Freigabe.
4. Artefakt-Speicher persistent machen (z. B. S3/Blob + Mongo-Metadaten) und Retrieval-Endpunkte ergänzen.
