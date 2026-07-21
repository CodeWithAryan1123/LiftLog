import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Improve chunking for better caching and parallel loading
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split React runtime into its own chunk — cached separately
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
        },
      },
    },
    // Smaller output with modern target
    target: 'es2020',
    // Inline small assets to reduce requests
    assetsInlineLimit: 4096,
    // Keep build lean — no source maps in production
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
