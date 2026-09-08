/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@universe/ui", "@universe/auth", "@universe/api-client", "@universe/types"],
  output: "export", // static export — deploys to Azure Static Web Apps
};

module.exports = nextConfig;
