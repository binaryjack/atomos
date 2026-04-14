import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 4000,
    open: true
  },
  resolve: {
    alias: {
      '@atomos-web/structura-core': resolve(__dirname, '../atomos-structura-core/src/index.ts'),
      '@atomos-web/prime-style': resolve(__dirname, '../atomos-prime-style/src/index.ts'),
      '@atomos-web/prime': resolve(__dirname, '../atomos-prime/src/index.ts')
    }
  }
});
