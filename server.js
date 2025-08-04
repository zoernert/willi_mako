const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { spawn } = require('child_process');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dotenv = require('dotenv');

// Initialize environment variables
dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3003;
const backendPort = 3009;

// Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Express app für Proxy
const expressApp = express();

let backendProcess = null;

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
    target: `http://localhost:${backendPort}`,
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
  console.log('✅ API proxy configured');
}

app.prepare().then(async () => {
  try {
    // Try to start backend first
    await startBackend();
    setupAPIProxy();
  } catch (error) {
    console.log('⚠️  Backend not available - continuing with Next.js only');
  }

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
