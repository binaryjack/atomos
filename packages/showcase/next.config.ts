import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: "out", // this is the default
  basePath: process.env.NODE_ENV === 'production' ? '/atomos' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/atomos/' : '',
  images: {
    // Allows next/image to be used without 3rd party optimization service. - necessary for static export
    unoptimized: true,
  },
  experimental: {
  },
};

export default nextConfig;
