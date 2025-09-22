const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { spawn } = require('child_process');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dotenv = require('dotenv');
const path = require('path');

// Initialize environment variables (prefer .env.production in production)
const envFile = process.env.ENV_FILE || (process.env.NODE_ENV === 'production' ? '.env.production' : '.env');
dotenv.config({ path: path.resolve(__dirname, envFile) });

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3003;
const backendPort = parseInt(process.env.BACKEND_PORT || '3009', 10);
// Resolve backend target:
// 1) Prefer INTERNAL_API_BASE_URL (primary)
// 2) Then API_BASE_URL / API_URL (compat)
// 3) In production without explicit target, default to local 4101 (known prod backend)
// 4) In dev, fallback to localhost:BACKEND_PORT (default 3009)
const explicitTarget = process.env.INTERNAL_API_BASE_URL || process.env.API_BASE_URL || process.env.API_URL || '';
const backendTarget = explicitTarget || (process.env.NODE_ENV === 'production' ? 'http://127.0.0.1:4101' : `http://localhost:${backendPort}`);

// Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Express app für Proxy
const expressApp = express();

let backendProcess = null;

// In production, explicitly serve Next static assets and legacy CRA to avoid 404/MIME issues
if (!dev) {
  // Next.js build assets
  expressApp.use(
    '/_next/static',
    express.static(path.join(__dirname, '.next', 'static'), {
      immutable: true,
      maxAge: '1y',
      fallthrough: true,
    })
  );

  // Legacy CRA build served from public/app with correct content types
  const legacyDir = path.join(__dirname, 'public', 'app');
  // Diagnostic header to confirm responses originate from Node server
  expressApp.use('/app', (req, res, next) => {
    res.set('X-App-Origin', 'node-4100');
    next();
  });

  // Redirect entry to login (as requested) and canonicalize trailing slash
  // Place BEFORE static middleware so file matches like /app/index.html don't bypass the redirect
  expressApp.all('/app', (req, res) => {
    // Temporary redirect to allow flexibility
    res.redirect(302, '/app/login');
  });
  expressApp.all('/app/', (req, res) => {
    res.redirect(302, '/app/login');
  });
  expressApp.all('/app/index.html', (req, res) => {
    // Canonicalize to /app/login so deep-links to index.html are avoided
    res.redirect(301, '/app/login');
  });
  expressApp.use(
    '/app',
    express.static(legacyDir, {
      index: ['index.html'],
      maxAge: '30d',
      fallthrough: true,
      redirect: false, // do not auto-redirect /app -> /app/
    })
  );

  // SPA fallback for legacy client routes but exclude static assets to prevent HTML for CSS/JS
  // Support GET and HEAD by responding with index.html; for HEAD we just send headers
  expressApp.all(/^\/app(?!\/static\/).+/, (req, res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(legacyDir, 'index.html'));
  });
}

// Start Express.js Backend als separaten Prozess (intern)
function startBackend() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Starting Express.js backend server...');
    
    backendProcess = spawn('npx', ['tsx', 'src/server.ts'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, PORT: backendPort }
    });

    let startupComplete = false;

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Backend:', output.trim());
      
      if (output.includes('Server running') || output.includes('ready') || output.includes('listening')) {
        if (!startupComplete) {
          startupComplete = true;
          resolve();
        }
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error('Backend Error:', data.toString().trim());
    });

    backendProcess.on('exit', (code) => {
      console.log(`Backend process exited with code ${code}`);
      if (!startupComplete) {
        reject(new Error(`Backend failed to start (exit code: ${code})`));
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!startupComplete) {
        console.log('⚠️  Backend startup timeout - continuing without backend');
        resolve();
      }
    }, 10000);
  });
}

// Setup API Proxy
function setupAPIProxy() {
  const apiProxy = createProxyMiddleware({
    target: backendTarget,
    changeOrigin: true,
    onError: (err, req, res) => {
      console.error('Proxy Error:', err.message);
      res.status(503).json({ 
        error: 'Backend service unavailable',
        message: 'The API backend is currently not available'
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add headers for identification
      proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
      proxyReq.setHeader('X-Forwarded-Port', port);
    }
  });

  expressApp.use('/api', apiProxy);
  console.log(`✅ API proxy configured → ${backendTarget}`);
}

app.prepare().then(async () => {
  try {
    // In development, start backend locally. In production, assume external backend.
    if (dev) {
      await startBackend();
    }
    setupAPIProxy();
  } catch (error) {
    console.log('⚠️  Backend not available - continuing with Next.js only');
  }

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

  // Handle API routes and (in prod) static assets with Express
    if (pathname.startsWith('/api/')) {
      expressApp(req, res);
      return;
    }
  if (!dev && (pathname.startsWith('/_next/static') || pathname.startsWith('/app'))) {
      expressApp(req, res);
      return;
    }

    // Handle everything else with Next.js
    handle(req, res, parsedUrl);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 Willi-Mako Single-Port Server ready on http://localhost:${port}`);
    console.log('📱 Frontend (Next.js): Available');
    console.log('🔗 Legacy App: http://localhost:' + port + '/app/');
    console.log('📊 FAQ Pages: http://localhost:' + port + '/wissen/');
    console.log('⚡ API (Express.js): http://localhost:' + port + '/api/');
    console.log('🔍 SEO Feeds: /feed.xml, /atom.xml, /sitemap.xml');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    if (backendProcess) {
      backendProcess.kill();
    }
    server.close(() => {
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    if (backendProcess) {
      backendProcess.kill();
    }
    server.close(() => {
      process.exit(0);
    });
  });
});
