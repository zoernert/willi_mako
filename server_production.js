const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dotenv = require('dotenv');

// Initialize environment variables
dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 4100;
const backendPort = 4101; // Backend läuft auf separatem Port

// Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Express app für Proxy
const expressApp = express();

// Setup API Proxy to Backend
function setupAPIProxy() {
  const apiProxy = createProxyMiddleware({
    target: `http://localhost:${backendPort}`,
    changeOrigin: true,
    timeout: 10000,
    proxyTimeout: 10000,
    onError: (err, req, res) => {
      console.error('API Proxy Error:', err);
      if (!res.headersSent) {
        res.status(503).json({ 
          error: 'Backend service unavailable',
          message: 'The API backend is currently not available'
        });
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add headers for identification
      proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
      proxyReq.setHeader('X-Forwarded-Port', port);
    },
    onProxyRes: (proxyRes, req, res) => {
      // Log successful proxy responses for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Proxy response: ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
      }
    }
  });

  expressApp.use('/api', apiProxy);
  console.log(`✅ API proxy configured (Frontend:${port} -> Backend:${backendPort})`);
}

// Serve static files from public directory (including legacy app)
expressApp.use(express.static('public'));

app.prepare().then(async () => {
  // Setup API proxy to backend
  setupAPIProxy();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    // Handle API routes with Express proxy
    if (pathname.startsWith('/api/')) {
      expressApp(req, res);
    } else {
      // Handle everything else with Next.js
      handle(req, res, parsedUrl);
    }
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`Integrated server ready on http://${hostname}:${port}`);
    console.log('Available URLs:');
    console.log(`   - Frontend: http://localhost:${port}/`);
    console.log(`   - Legacy App: http://localhost:${port}/app/`);
    console.log(`   - Wissen: http://localhost:${port}/wissen/`);
    console.log(`   - Impressum: http://localhost:${port}/impressum`);
    console.log(`   - API (proxied): http://localhost:${port}/api/ -> http://localhost:${backendPort}/api/`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      process.exit(0);
    });
  });
}).catch((ex) => {
  console.error('Failed to start server:', ex);
  process.exit(1);
});
