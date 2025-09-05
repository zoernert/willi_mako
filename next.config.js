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
  
  // Legacy app integration - handled by custom server
  async rewrites() {
  return [
      // Static assets für Legacy App
      {
        source: '/static/:path*',
        destination: '/app/static/:path*',
      },
      // Manifest und andere Root-Assets für Legacy App
      {
        source: '/manifest.json',
        destination: '/app/manifest.json',
      },
      // Fallback für Legacy App
      {
        source: '/app/:path*',
        destination: '/app/index.html',
      },
      // Public dataset files served under /data/<slug>/... (do not hijack /data/:slug page)
      {
        source: '/data/:slug/tables.json',
        destination: '/datasets/data/:slug/tables.json',
      },
      {
        source: '/data/:slug/table-:rest*.json',
        destination: '/datasets/data/:slug/table-:rest*.json',
      },
      {
        source: '/data/:slug/table-:rest*.csv',
        destination: '/datasets/data/:slug/table-:rest*.csv',
      },
    ];
  },

  // Redirects für alte Pfade
  async redirects() {
    return [
      {
        source: '/client/:path*',
        destination: '/app/:path*',
        permanent: true,
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
        source: '/data/:slug*.csv',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex' },
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/data/:slug*.json',
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
