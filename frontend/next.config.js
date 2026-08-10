/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Transpile framer-motion để fix lỗi "Unexpected token" khi build
  transpilePackages: ['framer-motion'],
  
  swcMinify: true,

  // Experimental config để handle ESM packages
  experimental: {
    esmExternals: 'loose',
  },

  // Webpack config để handle framer-motion
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'framer-motion': require.resolve('framer-motion'),
    };
    return config;
  },

  // Build gates: TypeScript and ESLint errors WILL fail the build
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '18080',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '18080',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
    domains: ['localhost', 'via.placeholder.com', 'images.unsplash.com', 'api.dicebear.com'],
    formats: ['image/avif', 'image/webp'],
  },
  env: {
    NEXT_PUBLIC_API_GATEWAY: process.env.NEXT_PUBLIC_API_GATEWAY || 'http://localhost:18080',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_GATEWAY || 'http://localhost:18080',
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:18080/api/ws',
  },
}

module.exports = nextConfig
