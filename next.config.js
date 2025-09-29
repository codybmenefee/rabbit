const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Silence workspace root inference warning in monorepo
  outputFileTracingRoot: path.resolve(__dirname, '..', '..'),
  experimental: {
    webpackBuildWorker: true,
    // Configure client-side router cache behavior
    staleTimes: {
      dynamic: 0,  // Don't cache dynamic content (user data pages)
      static: 300, // Cache static content for 5 minutes
    },
  },
  // Performance optimizations
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Configure fetch caching behavior
  headers: async () => { return [] },
  // Webpack configuration - disable cache in development to avoid corruption
  webpack: (config, { dev, isServer }) => {
    // Disable webpack persistent caching in development
    if (dev) {
      config.cache = false;
    }

    // Production optimizations
    if (!dev) {
      // Enable webpack optimizations
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            recharts: {
              test: /[\\/]node_modules[\\/]recharts[\\/]/,
              name: 'recharts',
              chunks: 'all',
              priority: 10,
            },
          },
        },
      }
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
