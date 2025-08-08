import { NextApiRequest, NextApiResponse } from 'next';

// Produktionsumgebung: Backend läuft auf Port 4101
// Entwicklungsumgebung: Backend läuft auf Port 3009
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'http://127.0.0.1:4101' 
  : (process.env.API_URL || 'http://127.0.0.1:3009');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Build the target URL
    const { slug, ...restQuery } = req.query as { [key: string]: string | string[] | undefined } & { slug?: string | string[] };
    const path = Array.isArray(slug) ? slug.join('/') : slug || '';

    // Reconstruct query string (preserve all params like q)
    const searchParams = new URLSearchParams();
    Object.entries(restQuery).forEach(([key, value]) => {
      if (typeof value === 'undefined') return;
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, v));
      } else {
        searchParams.append(key, value);
      }
    });
    const queryString = searchParams.toString();
    const targetUrl = `${API_URL}/api/${path}${queryString ? `?${queryString}` : ''}`;
    
    // Prepare headers
    const forwardedFor = Array.isArray(req.headers['x-forwarded-for']) 
      ? req.headers['x-forwarded-for'][0] 
      : req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    
    const headers: Record<string, string> = {
      // Only set Content-Type when a body is sent
      ...(req.method !== 'GET' && req.method !== 'HEAD' && {
        'Content-Type': (req.headers['content-type'] as string) || 'application/json'
      }),
      'Authorization': (req.headers.authorization as string) || '',
      'x-forwarded-for': String(forwardedFor),
      'x-forwarded-host': (req.headers.host as string) || '',
    };
    
    // Forward the request
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
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
