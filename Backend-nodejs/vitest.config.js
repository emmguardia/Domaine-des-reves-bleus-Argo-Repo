import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Variables d'env injectées AVANT le chargement des modules testés
    // (jwt.js / auth.js lisent JWT_SECRET au load). NODE_ENV=test empêche
    // server.js d'ouvrir un vrai port (cf. garde dans server.js).
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-suffisamment-long-pour-les-tests-0123456789',
      JWT_ADMIN_SECRET: 'test-admin-secret-different-du-user-pour-isolation-0123456789',
    },
  },
});
