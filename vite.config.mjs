import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',
  publicDir: 'public/static',
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
    rollupOptions: {
      input: {
        index: 'public/index.html',
        reading: 'public/reading.html',
      },
    },
  },
  test: {
    root: '.',
    include: ['public/js/__tests__/**/*.test.js'],
    environment: 'jsdom',
  },
});
