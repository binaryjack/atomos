import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: "out", // this is the default
  basePath: '/atomos-monorepo',
  assetPrefix: '',
  images: {
    // Allows next/image to be used without 3rd party optimization service. - necessary for static export
    unoptimized: true,
  },
  experimental: {
  },
};

export default nextConfig;
