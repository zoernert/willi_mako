const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const express = require('express');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 4100;

// Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Use an Express app to serve Next static assets explicitly
  const expressApp = express();

  // Serve Next build assets with proper cache headers
  expressApp.use(
    '/_next/static',
    express.static(path.join(__dirname, '.next', 'static'), {
      immutable: true,
      maxAge: dev ? 0 : '1y',
      fallthrough: true,
    })
  );

  // Delegate all other requests to Next.js handler
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      if (pathname.startsWith('/_next/static')) {
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
