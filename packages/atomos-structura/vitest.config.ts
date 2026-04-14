import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@atomos-web/structura-core': resolve(__dirname, '../atomos-structura-core/src/index.ts'),
      '@atomos-web/structura-mcp': resolve(__dirname, '../atomos-structura-mcp/src/index.ts'),
      '@atomos-web/prime': resolve(__dirname, '../atomos-prime/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
});
