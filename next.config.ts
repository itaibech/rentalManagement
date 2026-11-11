import type { NextConfig } from 'next';

// Static export for GitHub Pages at /rentalManagement/.
const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/rentalManagement',
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: { root: import.meta.dirname },
};
export default nextConfig;
