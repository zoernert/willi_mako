const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const express = require('express');
const path = require('path');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 4100;

// Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Use an Express app to serve Next static assets explicitly
  const expressApp = express();

  // Resolve base directory depending on runtime (project root vs dist)
  const baseDir = fs.existsSync(path.join(__dirname, '.next'))
    ? __dirname
    : path.join(__dirname, '..');
  // Serve Legacy CRA app (public/app) with correct content types
  const legacyDir = path.join(baseDir, 'public', 'app');
  // Mark responses to help diagnose proxy path
  expressApp.use('/app', (req, res, next) => {
    res.set('X-App-Origin', 'node-4100');
    next();
  });

  // Redirect entry points to login BEFORE static file middleware
  // Catch both GET and HEAD (and others) to ensure consistent behavior
  expressApp.all('/app', (req, res) => {
    res.redirect(302, '/app/login');
  });
  expressApp.all('/app/', (req, res) => {
    res.redirect(302, '/app/login');
  });
  expressApp.all('/app/index', (req, res) => {
    res.redirect(301, '/app/login');
  });
  expressApp.all('/app/index.html', (req, res) => {
    // Canonicalize deep links to index.html
    res.redirect(301, '/app/login');
  });

  // Now serve legacy static assets under /app
  expressApp.use(
    '/app',
    express.static(legacyDir, {
      index: ['index.html'],
      maxAge: dev ? 0 : '30d',
  // Allow fallthrough so our SPA fallback can serve index.html for client routes like /app/login
  // We still protect /app/static with an explicit 404 handler below
  fallthrough: true,
      redirect: false,
    })
  );

  // Serve Next build assets with proper cache headers
  expressApp.use(
    '/_next/static',
    express.static(path.join(baseDir, '.next', 'static'), {
      immutable: true,
      maxAge: dev ? 0 : '1y',
      fallthrough: true,
    })
  );

  // Serve index.html as SPA fallback for client-side routes (login page will mount there)
  // Only trigger when previous static middleware didn't answer (fallthrough)
  expressApp.use('/app', (req, res, next) => {
    if (req.path.startsWith('/static/')) return next();
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(legacyDir, 'index.html'));
  });

  // Simple health endpoint for frontend service
  expressApp.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'frontend', ts: Date.now() });
  });

  // Explicit 404 for unknown assets under /app/static to avoid serving HTML by mistake
  expressApp.use('/app/static', (req, res) => {
    // If we reached here, express.static did not find the asset
    res.status(404).type('text/plain').send('Not Found');
  });

  // Delegate all other requests to Next.js handler
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

  if (pathname.startsWith('/_next/static') || pathname.startsWith('/app')) {
        // Let Express serve static chunks
        expressApp(req, res);
        return;
      }

      // Let Next.js handle everything else (including data routes)
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
