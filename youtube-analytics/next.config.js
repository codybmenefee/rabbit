/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    webpackBuildWorker: true,
    // Configure client-side router cache behavior
    staleTimes: {
      dynamic: 0,  // Don't cache dynamic content (user data pages)
      static: 300, // Cache static content for 5 minutes
    },
  },
  // Configure fetch caching behavior
  headers: async () => {
    return [
      {
        // Disable caching for API routes that handle user data
        source: '/api/blob/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        // Ensure proper CORS for blob storage
        source: '/api/blob/upload',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ]
  },
  // Webpack configuration - disable cache in development to avoid corruption
  webpack: (config, { dev, isServer }) => {
    // Disable webpack persistent caching in development
    if (dev) {
      config.cache = false;
    }
    
    // Client-side fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
      };
    }
    
    return config;
  },
}

module.exports = nextConfig