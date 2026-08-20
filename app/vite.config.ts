import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite dev server for Creator OS.
 *
 * Binds 127.0.0.1 explicitly — not 0.0.0.0 — so the UI is unreachable from the network.
 * `/api` is proxied to the local backend, which keeps a single origin in the browser and
 * means the frontend never needs to know the backend's port or hold a credential of any kind.
 */
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.BFO_PORT ?? 8787}`,
        changeOrigin: false,
      },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
