/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Skip ESLint during builds - we'll run it separately for frontend code
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Skip TypeScript errors during builds for backend files
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Legacy app integration and dataset file serving
  async rewrites() {
    return {
      // Rewrites applied before checking filesystem and pages
      beforeFiles: [
  // Legacy app SPA fallback: serve index.html for client routes under /app (except static assets)
  { source: '/app/login', destination: '/app/index.html' },
  { source: '/app/:path((?!static/).*)', destination: '/app/index.html' },
  // Keep root files as-is; legacy app assets are served by Express
      ],
      // Rewrites applied after checking filesystem and pages
      // Ensures that Next page /data/[slug] is NOT overridden by this rule
      afterFiles: [
        // Only rewrite actual data files (avoid hijacking /data/:slug page)
        {
          source: '/data/:slug/:file((?:[^/]+)\\.(?:json|csv))',
          destination: '/datasets/data/:slug/:file',
        },
      ],
      // Apply SPA fallback only if no page or static file matched
  fallback: [],
    };
  },

  // Redirects für alte Pfade
  async redirects() {
    return [
      {
        source: '/client/:path*',
        destination: '/app/:path*',
        permanent: true,
      },
      // Ensure /app lands on the login route (URL stays /app/login; content served via rewrite)
      {
        source: '/app',
        destination: '/app/login',
        permanent: false,
      },
      // Normalize legacy topic URLs that contain spaces or special chars
      // e.g., /wissen/thema/Fehlercode%20Z20 -> /wissen/thema/fehlercode-z20
      {
        source: '/wissen/thema/:topic*',
        has: [
          {
            type: 'query',
            key: 'normalize',
            value: '(.*)'
          }
        ],
        destination: '/wissen/thema/:topic',
        permanent: true,
      },
    ];
  },

  // Performance Optimierungen
  compress: true,
  poweredByHeader: false,

  // Für bessere SEO
  trailingSlash: false,
  
  // Environment Variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Image Optimization
  images: {
    domains: ['stromhaltig.de'],
    formats: ['image/webp', 'image/avif'],
  },

  // Experimental features für bessere Performance
  experimental: {
    optimizeCss: true,
  },

  // Headers für bessere SEO und Sicherheit
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      // Avoid indexing of raw data files; keep HTML pages indexable
      {
        source: '/data/:slug/:path*.csv',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex' },
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/data/:slug/:path*.json',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex' },
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/wissen/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
