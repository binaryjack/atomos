import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const pkg = createRequire(import.meta.url)('./package.json') as { version: string };

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

const isIife = process.env['BUILD_TARGET'] === 'webview-iife';

export default defineConfig({
  root: '.',
  publicDir: isIife ? false : 'public',
  define: {
    /** Injected at build time from package.json — available as `__APP_VERSION__` in source. */
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: isIife
    ? {
        // Single-file IIFE bundle — no dynamic imports — preferred for VS Code webviews.
        outDir: 'dist/webview',
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, 'src/webview/index.ts'),
          name: 'StructuraWebview',
          fileName: () => 'index.iife.js',
          formats: ['iife'],
        },
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
            entryFileNames: 'index.iife.js',
          },
        },
      }
    : {
        outDir: 'dist',
        emptyOutDir: true,
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
      '@atomos/structura-core': resolve(__dirname, '../atomos-structura-core/src/index.ts'),
      '@atomos/prime-style': resolve(__dirname, '../atomos-prime-style/src/index.ts'),
      '@atomos/prime': resolve(__dirname, '../atomos-prime/src/index.ts')
    }
  }
});
