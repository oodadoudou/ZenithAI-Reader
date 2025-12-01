import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  root: 'public',
  publicDir: 'static',
  server: {
    port: 4173,
    strictPort: true,
    fs: {
      strict: false,
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        index: 'public/index.html',
        reading: 'public/reading.html',
      },
    },
  },
  plugins: [
    {
      name: 'copy-public-files',
      closeBundle() {
        // Copy additional public files that aren't in static/
        const files = ['config.json', 'manifest.json', 'sw.js'];
        files.forEach(file => {
          try {
            copyFileSync(
              resolve(__dirname, 'public', file),
              resolve(__dirname, 'dist', file)
            );
          } catch (err) {
            console.warn(`Could not copy ${file}:`, err.message);
          }
        });
      }
    }
  ],
  test: {
    root: '.',
    include: ['public/js/__tests__/**/*.test.js'],
    environment: 'jsdom',
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json-summary'],
      include: ['public/js/utils/**', 'public/js/services/**', 'public/js/parser/**', 'public/js/storage/**'],
      exclude: ['public/js/reader-page.js', 'public/js/library-page.js', 'public/sw.js', 'public/js/ui/**', 'public/js/storage/filesystem.js'],
    },
  },
});
