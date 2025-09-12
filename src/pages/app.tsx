import { useEffect } from 'react';

/**
 * Lightweight Next.js page for "/app" that immediately redirects
 * to the embedded legacy SPA entry at /app/index.html.
 *
 * This ensures Next dev generates the chunk for "/app" (preventing
 * 404 on /_next/static/chunks/pages/app.js) while the actual UI
 * continues to be served from the legacy build in public/app.
 */
export default function AppLegacyRedirect() {
  useEffect(() => {
    // Use replace to avoid keeping the intermediate Next page in history
  window.location.replace('/app/login');
  }, []);

  // Minimal fallback content for a split-second before redirect
  return (
    <div style={{ padding: 24 }}>
      <p>Weiterleitung zur App…</p>
      <noscript>
        JavaScript ist deaktiviert. Bitte öffnen Sie
        {' '}
  <a href="/app/login">/app/login</a>
        {' '}manuell.
      </noscript>
    </div>
  );
}
