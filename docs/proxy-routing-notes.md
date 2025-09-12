# Proxy routing notes: aligning /app behavior between dev and production

Summary
- Dev (`start-dev-limited.sh`): runs Next dev on :3003 and backend on :3009. Next handles redirects/rewrites (e.g., `/app -> /app/login`) and serves the legacy SPA from `public/app`.
- Prod (`quick-deploy.sh`): runs a hybrid Node server (`server.js`) on :4100 via PM2. It:
  - Proxies `/api` to the backend (:4101)
  - Serves `/app` from `public/app` with correct MIME types
  - Redirects `/app` and `/app/` to `/app/login`
  - Adds diagnostic header `X-App-Origin: node-4100` on all `/app` responses

If https://stromhaltig.de/app does not redirect or shows an older legacy build:
- Cause: The public domain is likely served by an Nginx/Proxy Manager static root or a different upstream (not Node :4100). In that case, Next/Node redirects and headers won’t apply.

Diagnosis
1) Compare direct Node vs. public domain:
   - Direct (host): `curl -I http://127.0.0.1:4100/app` should show `302 ... Location: /app/login` and `X-App-Origin: node-4100`.
   - Public: `curl -I https://stromhaltig.de/app` should show the same redirect and ideally the header. If not, proxy bypass is happening.

2) Look for static docroots that may host `/app` directly, serving an outdated build.
   - Common locations: `/usr/share/nginx/html/app`, `/var/www/html/app`.

Remediation options
- Preferred: Update the reverse proxy (Nginx Proxy Manager) to proxy all `/app` and `/app/*` to `http://127.0.0.1:4100`, not a filesystem path. Ensure "Block Common Exploits" and header pass-through keep `X-App-Origin` for troubleshooting.
- Alternative: If you must keep static serving at the proxy, sync the latest legacy SPA to the proxy docroot after each deploy. The updated `quick-deploy.sh` supports an opt-in sync to common docroots by setting `SYNC_NGINX_DOCROOT=1` (best-effort) and reloads nginx if present on the host.

Notes
- The legacy SPA login route (`/app/login`) is client-side. The server returns `index.html` for non-static `/app/*` paths and the app router takes over.
- In development, Next dev rewrites mask proxy issues, so the behavior appears correct locally.
- Keep the `X-App-Origin` header until the proxy is confirmed to route to Node :4100 in production.
