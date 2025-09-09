import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/static/:path*', destination: '/app/static/:path*' },
        { source: '/manifest.json', destination: '/app/manifest.json' },
      ],
      afterFiles: [
        {
          source: '/data/:slug/:file((?:[^/]+)\\.(?:json|csv))',
          destination: '/datasets/data/:slug/:file',
        },
      ],
      // Apply SPA fallback only if no page or static file matched
      fallback: [
        { source: '/app/:path*', destination: '/app/index.html' },
      ],
    }
  },
  async redirects() {
    return [
      { source: '/client/:path*', destination: '/app/:path*', permanent: true },
      {
        source: '/wissen/thema/:topic*',
        has: [{ type: 'query', key: 'normalize', value: '(.*)' }],
        destination: '/wissen/thema/:topic',
        permanent: true,
      },
    ]
  },
  compress: true,
  poweredByHeader: false,
  trailingSlash: false,
  env: { CUSTOM_KEY: process.env.CUSTOM_KEY },
  images: { domains: ['stromhaltig.de'], formats: ['image/webp', 'image/avif'] },
  experimental: { optimizeCss: true },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
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
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
    ]
  },
}

export default nextConfig
