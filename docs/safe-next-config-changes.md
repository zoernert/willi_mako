# Safe Next config changes

Keep `next.config.js` the source of truth. Make minimal edits and verify rewrites that protect legacy and datasets.

## Do
- Edit `next.config.js` only (not `.ts`); keep changes small
- Preserve:
  - SPA fallback for legacy: `fallback: /app/:path((?!static/).*) → /app/index.html`
  - Dataset rewrites: `/data/:slug/:file.(json|csv) → /datasets/data/:slug/:file`
  - Redirects: `/client/* → /app/*`, topic normalization under `/wissen/thema/:topic`
- In dev-only scenarios, allow proxy rewrites to `http://localhost:3009` for `/api/*`
- Keep image domains minimal (e.g., `stromhaltig.de`)
- Document intent in PR if adjusting headers/caching

## Don’t
- Don’t remove the static exclusion from legacy fallback
- Don’t add broad rewrites that shadow real pages (e.g., `/data/:slug/*` without file guard)
- Don’t loosen security headers without a reason

## Verify
1) Type check and build:
```
npm run type-check
npm run build:next
```
2) Manual checks:
- `/app/login` loads; `/app/static/*` returns assets (not HTML)
- `/data/demo/sample.json` serves static dataset
- `/client/foo` redirects to `/app/foo`
- In dev Next-only: `/api/health` proxies to backend on 3009

## Rollback
- If unsure, revert to the previous working `next.config.js` and reapply changes incrementally.
