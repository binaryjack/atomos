import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

// Strip UTF-8 BOM from output files for universal compatibility
function stripBomPlugin() {
  return {
    name: 'strip-bom',
    apply: 'build',
    writeBundle: async () => {
      const files = await glob('dist/**/*.{js,cjs,mjs}', { nodir: true })
      for (const file of files) {
        let content = readFileSync(file, 'utf8')
        if (content.charCodeAt(0) === 0xFEFF) {
          writeFileSync(file, content.slice(1), 'utf8')
        }
      }
    }
  }
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  plugins: [
    stripBomPlugin()
  ],
  server: {
    port: 4000,
    open: '/canvas.html',
    fs: {
      allow: ['..']
    }
  },
  resolve: {
    alias: {
      '/atomos-prime': resolve(__dirname, '../atomos-prime'),
      '/atomos-prime-style': resolve(__dirname, '../atomos-prime-style'),
      '/atomos-structura-core': resolve(__dirname, '../atomos-structura-core'),
      '/atomos-structura': resolve(__dirname, '.'),
      '/formular-dev': resolve(__dirname, '../formular-dev'),
      '@atomos-web/structura-core': resolve(__dirname, '../atomos-structura-core/src/index.ts'),
      '@atomos-web/prime-style': resolve(__dirname, '../atomos-prime-style/src/index.ts'),
      '@atomos-web/prime': resolve(__dirname, '../atomos-prime/src/index.ts')
    }
  }
});
