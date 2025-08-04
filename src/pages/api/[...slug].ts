import { NextApiRequest, NextApiResponse } from 'next';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3009';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Build the target URL
    const { slug } = req.query;
    const path = Array.isArray(slug) ? slug.join('/') : slug || '';
    const targetUrl = `${API_URL}/api/${path}`;
    
    // Prepare headers
    const forwardedFor = Array.isArray(req.headers['x-forwarded-for']) 
      ? req.headers['x-forwarded-for'][0] 
      : req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    
    // Forward the request
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Authorization': req.headers.authorization || '',
        'x-forwarded-for': forwardedFor,
        'x-forwarded-host': req.headers.host || '',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Forward the response
    const data = await response.json().catch(() => ({}));
    
    res.status(response.status);
    Object.entries(response.headers).forEach(([key, value]) => {
      if (value) res.setHeader(key, value);
    });
    
    res.json(data);
  } catch (error) {
    console.error('API Proxy Error:', error);
    res.status(503).json({ 
      error: 'API Gateway Error', 
      message: 'Backend service temporarily unavailable'
    });
  }
}
