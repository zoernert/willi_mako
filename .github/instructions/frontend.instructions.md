---
description: Regeln für Next.js/Frontend Änderungen
applyTo: "src/pages/**,src/components/**,lib/**,next.config.js,public/**"
---

# Frontend (Next.js) – Arbeitsanweisungen

- Bearbeite nur `next.config.js` (nicht `.ts`). Halte Rewrites/Redirects konsistent:
  - SPA-Fallback: `/app/*` (ohne `/app/static/*`) → `/app/index.html`.
  - Datenfiles: nur `/data/:slug/:file.(json|csv)` → `/datasets/data/:slug/:file`.
  - Redirects: `/client/*` → `/app/*`; Normalisierung `/wissen/thema/:topic`.
- `public/app` nicht editieren; Legacy Build kommt aus `app-legacy/`.
- Nutze VS Code Tasks zum Prüfen: erst „Type Check“, dann „Build Next.js“.
- Bevorzuge kleine, isolierte Patches. Änderungen an Headers/Caching minimal halten.
- Images: Domains in `next.config.js` beachten (`stromhaltig.de`).

## Entscheidungsbaum (wohin gehört meine Änderung?)
- UI/SEO/Feeds im öffentlichen Bereich? → Hier (Next.js: `src/pages/**`, Komponenten unter `src/components/**`).
- Legacy UI unter `/app`? → Nicht hier, sondern `app-legacy/**` (keine Änderungen an `public/app`).
- API/Serverlogik? → Nicht hier; Backend in `src/presentation/http/routes/**` bzw. `src/routes/**`.
- Build/Rewrites/Headers? → `next.config.js` (nicht `.ts`).

## Konventionen
- Dateistruktur: Seiten in `src/pages/**`, gemeinsame Utilities in `lib/**`.
- Datenabruf: Fetcher/Services in `lib/**` kapseln; keine direkten API‑URLs hart codieren in Komponenten.
- SEO: `next/head` oder projektweiten SEO‑Helper nutzen; Titles/Descriptions konsistent.
- Styling: Bestehendes Projekt‑Pattern respektieren (CSS/Modules/Tailwind – je nach Bestand), keine Vermischung einführen.
- Bilder: Domains/Loader gemäß `next.config.js` nutzen.
- Rewrites/Redirects: Nur minimal anpassen und mit SPA‑Fallback kompatibel halten.

## Tests & Validierung
- Typecheck: „Type Check“ Task ausführen.
- Build: „Build Next.js“ Task; bei Config‑Änderungen auch vollständigen Build testen.
- Manuell: Rewrites testen (`/app/*` Fallback), Datenfile‑Rewrites und Redirects überprüfen.

## Sensible Dateien
- `next.config.js` ist Quelle der Wahrheit (wenn `.ts` existiert, `.js` gewinnt). Änderungen klein halten und dokumentieren.
- `public/app` nicht anfassen; Änderungen gehören nach `app-legacy/**`.
