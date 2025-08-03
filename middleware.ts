import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Edge-Caching für FAQ-Seiten
  if (pathname.startsWith('/wissen/')) {
    const response = NextResponse.next();
    
    // Cache-Headers für bessere Performance
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    );
    
    // Security Headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
    
    return response;
  }

  // Cache für RSS/Atom Feeds
  if (pathname.match(/\.(xml)$/)) {
    const response = NextResponse.next();
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    );
    return response;
  }

  // Default Response
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/wissen/:path*',
    '/feed.xml',
    '/atom.xml',
    '/sitemap.xml'
  ],
};
