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
  
  // Legacy app integration
  async rewrites() {
    return [
      // API Proxy zu Express.js Backend (Port 3001)
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
      // Fallback für Legacy App
      {
        source: '/app/:path*',
        destination: '/app/index.html',
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
