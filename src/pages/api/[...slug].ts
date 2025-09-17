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
    
    // Build forward headers: start from original headers, drop hop-by-hop/forbidden ones, and ensure auth stays
    const forwardHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) continue;
      const lower = key.toLowerCase();
      // Skip headers that shouldn't be forwarded/set by fetch
      if (['host', 'connection', 'content-length', 'transfer-encoding'].includes(lower)) continue;
      // Handle array headers
      forwardHeaders[lower] = Array.isArray(value) ? value.join(', ') : String(value);
    }
    // Ensure Authorization and forwarded headers are present
    forwardHeaders['authorization'] = (req.headers.authorization as string) || '';
    forwardHeaders['x-forwarded-for'] = String(forwardedFor);
    forwardHeaders['x-forwarded-host'] = (req.headers.host as string) || '';

    // For GET/HEAD no body. For JSON, buffer and forward as Buffer (lets undici set Content-Length).
    // For multipart/others, stream the raw request.
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const contentTypeIncoming = (req.headers['content-type'] as string) || '';
    let bodyToSend: any = undefined;
    if (hasBody) {
      if (contentTypeIncoming.includes('application/json')) {
        // Buffer the incoming JSON body
        const chunks: Buffer[] = [];
        for await (const chunk of req as any as AsyncIterable<Buffer>) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        bodyToSend = Buffer.concat(chunks);
      } else {
        // Stream other bodies (e.g., multipart/form-data)
        bodyToSend = req as any;
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: bodyToSend,
    } as any);

    // Forward the response (handle JSON and non-JSON)
    const contentType = response.headers.get('content-type') || '';
    res.status(response.status);
    // Copy response headers
    response.headers.forEach((value, key) => {
      // Avoid setting forbidden headers in Next response
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        try { res.setHeader(key, value); } catch {}
      }
    });

    if (response.status === 204) {
      res.end();
      return;
    }

    if (contentType.includes('application/json')) {
      const data = await response.json().catch(() => ({}));
      res.json(data);
    } else {
      const arrayBuf = await response.arrayBuffer();
      res.end(Buffer.from(arrayBuf));
    }
  } catch (error) {
    console.error('API Proxy Error:', error);
    res.status(503).json({ 
      error: 'API Gateway Error', 
      message: 'Backend service temporarily unavailable'
    });
  }
}

// Disable Next.js body parsing to allow streaming/proxying multipart and other bodies
export const config = {
  api: {
    bodyParser: false,
  },
};
