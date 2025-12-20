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
        connect-src 'self' https://api.stripe.com http://localhost:3002 http://176.181.59.85:3002 https://domainedesrevesbleus.famillemntmata.eu;
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
          // Séparer les node_modules en chunks distincts
          if (id.includes('node_modules')) {
            // Stripe dans un chunk séparé (utilisé uniquement sur la page checkout)
            if (id.includes('@stripe')) {
              return 'stripe';
            }
            // Framer Motion dans un chunk séparé (utilisé pour les animations)
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            // React Router dans un chunk séparé
            if (id.includes('react-router')) {
              return 'react-router';
            }
            // React et React DOM ensemble
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // React Icons (peut être volumineux)
            if (id.includes('react-icons')) {
              return 'react-icons';
            }
            // Autres vendors
            return 'vendor';
          }
        },
        // Optimiser les noms de fichiers
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    copyPublicDir: true,
    // Augmenter la limite pour éviter les warnings si nécessaire
    // mais on préfère optimiser avec manualChunks
    chunkSizeWarningLimit: 600
  },
  publicDir: 'public',
  define: {
    'process.env.VITE_API_URL': JSON.stringify('http://176.181.59.85:3002')
  }
})