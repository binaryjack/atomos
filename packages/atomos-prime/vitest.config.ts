import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@atomos/structura-core': resolve(__dirname, '../atomos-structura-core/src/index.ts'),
      '@atomos/prime-style': resolve(__dirname, '../atomos-prime-style/src/index.ts'),
      '@atomos/prime': resolve(__dirname, '../atomos-prime/src/index.ts')
    }
  }
});
