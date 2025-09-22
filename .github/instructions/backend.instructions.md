---
description: Regeln für Backend/Express Änderungen
applyTo: "src/server.ts,src/routes/**,src/presentation/**,src/middleware/**,src/services/**,tsconfig.backend.json,server.js"
---

# Backend (Express) – Arbeitsanweisungen

- Routen anlegen/ändern unter `src/presentation/http/routes/**` (v2) oder `src/routes/**` (legacy) und in `src/server.ts` registrieren.
- Roh‑JSON‑Parsing, Timeout‑Erhöhungen (Chat/Admin), CORS und öffentliche `/api/public/*` Endpunkte unverändert lassen.
- Kompatibilität‑Alias `/admin` (ohne `/api`) erhalten.
- Keine unbedachten Ersetzungen durch `express.json()`. Leere/Whitespace‑Bodies weiterhin robust behandeln.
- Bei Änderungen an `server.js`: Proxy `/api/*` → 3009 und das `/app`‑Serving in Prod nicht brechen.
- Prüfe Änderungen mit „Type Check“. Für öffentliche Änderungen idealerweise Tests ergänzen.

## Entscheidungsbaum (wohin gehört meine Änderung?)
- Öffentliche Seiten/SEO/Feeds? → Next.js unter `src/pages/**` (nicht Backend).
- Legacy SPA unter `/app`? → `app-legacy/**` (nicht `public/app` editieren).
- Neue/angepasste API? → Hier (Backend v2): `src/presentation/http/routes/**` + Registrierung in `src/server.ts`.
- Muss der Endpunkt öffentlich sein? → Nur unter `/api/public/*` und mit bestehendem Rate‑Limit/CORS.
- Admin/Chat‑Funktion? → Erhöhte Timeouts, Sicherheits-/Quota‑Regeln beachten.

## Konventionen
- Routing:
  - v2 Endpunkte unter `src/presentation/http/routes/**` logisch gruppieren (z. B. `quiz.routes.ts`, `admin/quiz.routes.ts`).
  - Legacy unter `src/routes/**` nur für Bugfixes anfassen.
- Responses:
  - Erfolgreich: strukturierte JSON‑Antworten (keine Rohstrings). Paginierung konsistent (z. B. `page`, `pageSize`, `total`).
  - Fehler: `{ error: string, code?: string }` mit passendem HTTP‑Status.
- Validierung: Eingaben strikt prüfen; keine Annahmen über optionale Felder.
- Logging: vorhandene Logger/Utilities nutzen; kein `console.log` im Hot‑Path.
- Zeit/Locale: UTC in Persistenz; Formatierung im Frontend.
- Sicherheit: Rate‑Limit/CORS beibehalten; keine Secrets im Code; Header nur minimal anpassen.

## Tests & Validierung
- Typecheck: VS Code Task „Type Check“ ausführen.
- API‑Änderungen: Kleine Jest‑Tests für Routen/Controller ergänzen (falls Testsetup vorhanden). Keine umfassenden Refactorings.
- Manuell prüfen: `npm run dev:backend-only` starten und Endpunkte via `curl`/REST‑Client testen.

## Sensible Dateien
- `server.js`, `src/server.ts`, `tsconfig.backend.json`, `.env*` nur mit Bedacht ändern; nach Änderungen Type‑Check.
- Bei Proxy/Timeout/CORS nur kleinste notwendige Änderungen; Verhalten dokumentieren.
