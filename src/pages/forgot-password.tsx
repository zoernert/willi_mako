import { useEffect } from 'react';
import Head from 'next/head';

/**
 * Redirect page for forgot password
 * Redirects to the legacy app where the functionality is implemented
 */
export default function ForgotPasswordRedirect() {
  useEffect(() => {
    window.location.href = '/app/forgot-password';
  }, []);

  return (
    <>
      <Head>
        <title>Passwort vergessen - Willi-Mako</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '3px solid #147a50',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#333' }}>
            Weiterleitung...
          </h1>
          <p style={{ color: '#666' }}>
            Sie werden zur Passwort-Vergessen-Seite weitergeleitet.
          </p>
        </div>
      </div>
    </>
  );
}
