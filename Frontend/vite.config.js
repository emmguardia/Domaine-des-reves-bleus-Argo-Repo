import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://176.181.59.85:3002',
        changeOrigin: true,
        secure: false
      },
    },
    headers: {
      'Content-Security-Policy': `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' data: https:;
        font-src 'self' https://fonts.gstatic.com;
        connect-src 'self' https://api.stripe.com http://localhost:3002 http://176.181.59.85:3002 https://domainedesrevesbleus.eu https://api-adresse.data.gouv.fr;
        frame-src 'self' https://js.stripe.com;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
      `.replace(/\s+/g, ' ').trim()
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {

          if (id.includes('node_modules')) {

            if (id.includes('@stripe')) {
              return 'stripe';
            }

            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }

            if (id.includes('react-router')) {
              return 'react-router';
            }

            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
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
  // Ne pas définir VITE_API_URL en build pour utiliser l'URL par défaut (domainedesrevesbleus.eu)
  // En développement, on peut utiliser une variable d'environnement .env.local
  define: {
    // 'process.env.VITE_API_URL': JSON.stringify('http://176.181.59.85:3002') // Commenté pour production
  }
})