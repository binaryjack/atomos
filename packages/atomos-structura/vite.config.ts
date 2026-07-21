import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { createRequire } from 'module';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, PluginOption } from 'vite';
import dts from 'vite-plugin-dts';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const pkg = createRequire(import.meta.url)('./package.json') as { version: string };

// Strip UTF-8 BOM from output files for universal compatibility
function stripBomPlugin(): PluginOption {
  return {
    name: 'strip-bom',
    apply: 'build',
    writeBundle: async () => {
      const files = await glob('./dist/**/*.{js,cjs,mjs}', { nodir: true })
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
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'Structura',
          fileName: 'index',
          formats: ['es']
        },
        rollupOptions: {
          external: [
            'react',
            'react-dom',
            'react-redux',
            '@reduxjs/toolkit',
            '@atomos-web/structura-core',
            '@atomos-web/prime',
            '@xyflow/react'
          ],
          output: {
            // Preserve module structure so dist/ mirrors src/:
            // canvas.html and demos import deep paths like
            // dist/preview/create-canvas-page.js which must exist as
            // individual files, not merged chunks.
            preserveModules: true,
            preserveModulesRoot: 'src',
            entryFileNames: '[name].js',
          }
        }
      },
  plugins: [
    stripBomPlugin(),
    !isIife && dts({ insertTypesEntry: true, rollupTypes: false })
  ],
  css: {
    modules: {
      generateScopedName: 'structura_[name]__[local]___[hash:base64:5]'
    }
  },
  server: {
    port: 4000,
    open: '/canvas.html',
    fs: {
      allow: ['..']
    }
  },
  optimizeDeps: {
    // Only scan the working entry points — exclude demos that reference
    // atomos-prime test bundles (test-decision-matrix.js, test-stepper.js,
    // test-settings-page.js) which do not exist yet.
    entries: [
      'canvas.html',
      'demos/test-consumer-simulator.html',
      'demos/test-persistence.html',
      'demos/test-property-persistence.html',
      'demos/test-neura.html',
    ],
  },
  resolve: {
    alias: {
      '/atomos-prime': resolve(__dirname, '../atomos-prime'),
      '/atomos-prime-style': resolve(__dirname, '../atomos-prime-style'),
      '/atomos-structura-core': resolve(__dirname, '../atomos-structura-core'),
      '/atomos-structura': resolve(__dirname, '.'),
      '/formular-dev': resolve(__dirname, '../formular-dev')
    }
  }
});
