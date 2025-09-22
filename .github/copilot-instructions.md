# Willi-Mako

Eine Webanwendung für Mitarbeiter in der Marktkommunikation bei Energieversorgern, die es ihnen ermöglicht, ihr Wissen zu testen und zu erweitern. Die Anwendung bietet eine Vielzahl von Quizfragen zu verschiedenen Themenbereichen, die den Mitarbeitern helfen, sich auf Prüfungen vorzubereiten und ihr Wissen zu vertiefen uns kollaborativ such auszutauschen.

Produktivumgebung: http://stromhaltig.de/

## Dokumentation
Die Dokumentation ist im Verzeichnis `docs` zu finden. Sie enthält Informationen zur Installation, Konfiguration und Nutzung der Anwendung.

## Entwicklung

Start der Umgebung:
```bash
npm run dev
```

Zugangsdaten für Postgress Datenbank ist in der [[.env]] Datei zu finden.

# Willi‑Mako – Copilot custom instructions

Kurze, klare Regeln für Copilot Chat und den Coding Agent. Bevorzuge kleine, sichere Änderungen und halte die Schichtentrennung ein.

## Architektur (Kontext)
- Public: Next.js 15 unter `src/pages/**`, Utilities unter `lib/**`.
- Legacy App: CRA unter `app-legacy/**`, Build wird nach `public/app` verschoben und unter `/app` als SPA ausgeliefert.
- Backend: Express in `src/server.ts` mit Routen in `src/routes/**` (legacy) und `src/presentation/http/routes/**` (v2). `server.js` startet Next, proxyt `/api/*` → 3009 und bedient `/app` (prod).

## Arbeitsanweisungen (Agent)
- Wähle die richtige Ebene:
	- Next/SEO/Feeds → `src/pages/**`, `next.config.js`.
	- Legacy UI (`/app`) → `app-legacy/**` (nicht `public/app` editieren).
	- APIs → `src/presentation/http/routes/**` (v2) oder `src/routes/**` (legacy) und in `src/server.ts` registrieren.
- Rewrites/Redirects erhalten:
	- SPA‑Fallback: `/app/*` (außer `/app/static/*`) → `/app/index.html`.
	- Datenfiles: nur `/data/:slug/:file.(json|csv)` → `/datasets/data/:slug/:file`.
	- Redirects: `/client/*` → `/app/*`; Normalisierung `/wissen/thema/:topic`.
- Next Config: wenn beide existieren, `.js` ist maßgeblich. Halte `.ts` synchron oder konsolidiere auf `.js` bei Änderungen.
- Prüfen mit Tasks: „Type Check“ → „Build Next.js“. Vollbuild bei Bedarf: `npm run build`.
- Backend nicht vereinfachen: Roh‑JSON‑Parsing, Timeouts, CORS, öffentliche `/api/public/*` Endpunkte beibehalten.

## Entscheidungsbaum (den richtigen Ort finden)
- UI/SEO/Feeds? → `src/pages/**` (Next)
- Legacy UI (`/app`)? → `app-legacy/**`
- API/Serverlogik? → `src/presentation/http/routes/**` (v2) und `src/server.ts`
- Rewrites/Redirects/Images? → `next.config.js`

## Konventionen
- Responses: JSON‑Objekte mit sinnvollen Statuscodes; Fehler `{ error, code? }`.
- Zeit: UTC serverseitig; Formatierung clientseitig.
- Logging: vorhandene Utilities; kein Rauschen im Hot‑Path.
- Sicherheit: Rate‑Limits/CORS respektieren; öffentliche Routen unter `/api/public/*`.
- Minimalprinzip: kleinste Änderung, keine unbeteiligten Refactorings.

## Do / Don’t
- Do: kleine Patches, minimale Änderungen an Routing/Headers, Tests bei API‑Änderungen.
- Do: Docs in `docs/` ergänzen bei größeren Änderungen.
- Don’t: `public/app` anfassen, Ports/Proxy in `server.js` brechen, unbedacht `express.json()` ersetzen.

## Build & Run (Referenz)
- Dev: `npm run dev`; Next: `npm run dev:next-only` (3003); Backend: `npm run dev:backend-only` (3009)
- Prod (Ein‑Port): `node server.js`
- Build Kette: Favicons → Backend (tsc) → Legacy CRA → Move → Next build

## Sicherung/Review
- Sensible Dateien: `server.js`, `src/server.ts`, `next.config.*`, `package.json`, `tsconfig*.json`, `.env*`, `app-legacy/package.json`.
- Terminal Auto‑Approve (Empfehlung): nur Type‑Check/Build/Dev erlauben; destruktive Befehle blocken.

## Links
- Changelog v1.104 (AGENTS.md, Edit‑Confirm, Auto‑Model): https://github.blog/changelog/2025-09-12-github-copilot-in-vs-code-august-release-v1-104/
- VS Code Custom Instructions (AGENTS.md, *.instructions.md): https://code.visualstudio.com/docs/copilot/customization/custom-instructions

Hinweis: Diese Datei wirkt automatisch in diesem Workspace. Für mehrere Agenten siehe `AGENTS.md` im Root.
