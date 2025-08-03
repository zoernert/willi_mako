import { NextApiRequest, NextApiResponse } from 'next';
import httpProxy from 'http-proxy-middleware';

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Proxy alle API-Calls zum Express.js Backend
const proxy = httpProxy({
  target: API_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api', // Keep the /api prefix
  },
  onError: (err, req, res) => {
    console.error('API Proxy Error:', err);
    res.writeHead(500, {
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify({ 
      error: 'API Gateway Error', 
      message: 'Backend service temporarily unavailable' 
    }));
  },
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Disable Next.js body parsing so proxy can handle it
  return new Promise<void>((resolve) => {
    proxy(req, res, (result) => {
      if (result instanceof Error) {
        throw result;
      }
      resolve();
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
