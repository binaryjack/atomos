import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: "out",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  transpilePackages: [
    '@atomos-web/structura',
    '@atomos-web/prime',
    '@atomos-web/prime-style',
    '@atomos-web/structura-core',
    '@binaryjack/formular.dev',
  ],
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@atomos-web/structura-core': path.resolve(__dirname, '../../.codernic/packages/@atomos-web/structura/layers/frontend/atomos-structura-core'),
      '@atomos-web/structura': path.resolve(__dirname, '../../.codernic/packages/@atomos-web/structura/layers/frontend/atomos-structura'),
      '@atomos-web/prime-style': path.resolve(__dirname, '../../.codernic/packages/@atomos-web/structura/layers/frontend/atomos-prime-style'),
      '@atomos-web/prime': path.resolve(__dirname, '../../.codernic/packages/@atomos-web/structura/layers/frontend/atomos-prime'),
      '@binaryjack/formular.dev': path.resolve(__dirname, '../../.codernic/packages/@binaryjack/formular.dev/layers/frontend'),
    };
    return config;
  },
};

export default nextConfig;
