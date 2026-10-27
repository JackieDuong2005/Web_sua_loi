/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {},
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/android_app/**',
          '**/python_service/**',
          '**/*.sys',
          '**/*.tmp',
          '**/System Volume Information/**',
        ],
      }
    }
    return config
  },
}

export default nextConfig
