## Willi‑Mako — Agent guide (experimental)

Use these short, action‑oriented rules to keep changes safe and consistent across the public Next.js site, the legacy React app, and the Express backend.

### Architecture boundaries
- Public site: Next.js 15 under `src/pages/**` and common libs under `lib/**`.
- Legacy app: Create React App in `app-legacy/**`. Built output is moved to `public/app` and served as an SPA under the base path `/app`.
- Backend: Express server in `src/server.ts` with routes in `src/routes/**` and new v2 presentation routes in `src/presentation/http/routes/**`.
- Single-port runner: `server.js` boots Next.js and proxies `/api/*` to the Express backend (port 3009) and serves legacy static under `/app` in production.

### Source of truth per area
- Next config: Prefer editing `next.config.js` (this is the file Next picks when both `.js` and `.ts` exist). Keep rewrites/redirects aligned with `/app` SPA fallback and dataset file rules.
- Legacy CRA: Keep `homepage: "/app"` in `app-legacy/package.json`. Do not break SPA fallback. Build with `npm run build` inside `app-legacy` and rely on repo root `move:legacy`.
- Backend endpoints: Add/modify routes in `src/presentation/http/routes/**` (v2) or `src/routes/**` (legacy). Wire via `src/server.ts` only.
- Typescript configs: Frontend uses `tsconfig.json` (noEmit). Backend compiles with `tsconfig.backend.json` to `dist/`.

### Build and run
- Dev (combined limited): `npm run dev` (script wrapper). Alternatives:
  - Next only: `npm run dev:next-only` (port 3003)
  - Backend only: `npm run dev:backend-only` (port 3009)
- Production one‑port server: `node server.js` (starts backend via `tsx` and proxies; serves `/app`).
- Build order: `npm run build` runs favicons → backend (`tsc`) → legacy CRA → move → Next build.
- Tasks (VS Code): Use “Build Next.js” and “Type Check”. Prefer tasks over ad‑hoc commands.

### Routing and rewrites (do not break)
- Keep SPA fallback for legacy: requests to `/app/*` (except `/app/static/*`) should return `/app/index.html`.
- Keep dataset rewrites: only rewrite real files `/data/:slug/:file.(json|csv)` → `/datasets/data/:slug/:file`.
- Keep redirects: `/client/*` → `/app/*` and topic normalization for `/wissen/thema/:topic`.

### Backend behavior you must preserve
- CORS allows 3003 (Next), 3000/3002 (dev), and production `stromhaltig.de`.
- Rate limiting on `/api/*` and increased timeouts on chat/admin routes.
- Raw JSON parsing with safe handling of empty bodies; do not replace with `express.json()` without preserving behavior.
- Public endpoints under `/api/public/*` (community, edifact, market-partners) must remain unauthenticated.
- Compatibility aliases: `/admin` (without `/api`) must continue to work.

### Safety and approvals
- Treat these as sensitive; prefer small, deliberate edits and run type‑check/build after:
  - `server.js`, `src/server.ts`, `next.config.js`, `next.config.ts`, `package.json`, `tsconfig*.json`, `.env*`, `app-legacy/package.json`.
- Suggested VS Code settings (for humans to enable):
  - Require confirm for edits: `chat.tools.edits.autoApprove` with deny patterns like `**/server.js`, `**/src/server.ts`, `**/next.config.*`, `**/package.json`, `**/.env*`, `**/tsconfig*.json`, `**/app-legacy/**`.
  - Terminal auto‑approve: allow only non‑destructive commands (type‑check/build/dev). Block `rm -rf`, package manager changes, and DB migrations unless explicitly requested.

### Implementation checklist (use for any change)
- Pick the correct area (Next page, legacy CRA, or backend route) based on the user‑facing path.
- Update only one of `next.config.*` (prefer `.js`) and keep rewrites/headers parity.
- Add tests when changing public behavior (see `jest` setup). At minimum, run type‑check.
- Use workspace tasks to validate: Type Check → Build Next.js (and root `npm run build` for a full check when relevant).
- For new APIs: add route/controller, register in `src/server.ts`, and document the path and auth.
- For legacy UI changes: verify `/app` base path and that deep links load via SPA fallback.

### Quick references
- Ports: Next 3003, backend 3009, legacy dev 3002; one‑port server listens on 3003 by default.
- Images: `next.config.*` restricts domains to `stromhaltig.de`.
- Data: Postgres via `.env`; vector search via Qdrant service.

### Known pitfalls
- Duplicate Next config files (`next.config.js` and `.ts`): Next loads `.js`. Keep them in sync or consolidate to `.js` when you touch them.
- Do not move/remove `public/app` artifacts; CRA routing depends on them.
- Preserve custom raw JSON body handling and request timeouts on chat/admin routes.

— End of AGENTS.md —
