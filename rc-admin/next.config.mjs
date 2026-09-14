/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  transpilePackages: ['@rc/types', '@rc/api-client', '@rc/theme'],
};

export default nextConfig;
