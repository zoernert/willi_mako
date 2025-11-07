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
    const isProd = process.env.NODE_ENV === 'production';
    return {
      // Rewrites applied before checking filesystem and pages
      beforeFiles: [
        // Map legacy CRA static/PWA assets when serving via Next in dev
        { source: '/static/:path*', destination: '/app/static/:path*' },
        { source: '/manifest.json', destination: '/app/manifest.json' },
        // Dev-only proxies for backend API when running Next without server.js
        ...(!isProd ? [
          {
            source: '/api/:path*',
            destination: 'http://localhost:3009/api/:path*',
          },
          {
            source: '/api/public/community/:path*',
            destination: 'http://localhost:3009/api/public/community/:path*',
          },
        ] : []),
  // Keep root files as-is; legacy app assets are served by Express
      ],
      // Rewrites applied after checking filesystem and pages
      // Ensures that Next page /data/[slug] is NOT overridden by this rule
      afterFiles: [
        // SEO-friendly URL: /articles -> /wissen/artikel
        {
          source: '/articles',
          destination: '/wissen/artikel',
        },
        // SEO-friendly URL: /articles/[slug] -> /wissen/artikel/[slug]
        {
          source: '/articles/:slug',
          destination: '/wissen/artikel/:slug',
        },
        // Only rewrite actual data files (avoid hijacking /data/:slug page)
        {
          source: '/data/:slug/:file((?:[^/]+)\\.(?:json|csv))',
          destination: '/datasets/data/:slug/:file',
        },
      ],
      // Apply SPA fallback only if no page or static file matched
      fallback: [
        // Legacy CRA: serve index.html for client-routed paths like /app/login
        // Explicitly exclude static assets to avoid returning HTML for JS/CSS
        {
          source: '/app/:path((?!static/).*)',
          destination: '/app/index.html',
        },
      ],
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
            key: 'X-App-Origin',
            value: 'next-4100',
          },
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
