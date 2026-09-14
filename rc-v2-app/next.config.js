/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  transpilePackages: ['@rc/types', '@rc/api-client', '@rc/theme'],
  images: {
    unoptimized: true,
    remotePatterns: [
      // Sanity CDN for CMS images
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      // Azure Blob Storage CDN for videos / audio thumbnails
      {
        protocol: 'https',
        hostname: '*.blob.core.windows.net',
      },
      {
        protocol: 'https',
        hostname: '*.azureedge.net',
      },
    ],
  },
  // Note: security headers are in public/staticwebapp.config.json
  // (Next.js async headers() is not supported in static export mode)
}

module.exports = nextConfig
