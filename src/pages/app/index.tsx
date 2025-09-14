import { useEffect } from 'react';

export default function AppLegacyRedirect() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.replace('/app/login');
    }
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <p>Weiterleitung zur App…</p>
      <noscript>
        JavaScript ist deaktiviert. Bitte öffnen Sie{' '}
        <a href="/app/login">/app/login</a>{' '}manuell.
      </noscript>
    </div>
  );
}
