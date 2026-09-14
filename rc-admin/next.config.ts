import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  transpilePackages: ['@rc/types', '@rc/api-client', '@rc/theme'],
}

export default nextConfig
