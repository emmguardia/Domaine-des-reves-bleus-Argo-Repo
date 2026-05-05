import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('scheduler') ||
              id.includes('react-router')
            ) {
              return 'react-vendor';
            }
            if (id.includes('@stripe')) {
              return 'stripe';
            }
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            if (id.includes('react-icons')) {
              return 'react-icons';
            }
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    copyPublicDir: true,
    chunkSizeWarningLimit: 600
  },
  publicDir: 'public',
});