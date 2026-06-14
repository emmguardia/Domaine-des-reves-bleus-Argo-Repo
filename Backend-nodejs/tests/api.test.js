import { describe, it, expect, vi } from 'vitest';

// On mocke DB et Stripe AVANT d'importer l'app : vi.mock est hoisté par Vitest,
// donc tous les routers importeront ces versions factices (aucune vraie connexion).
vi.mock('../config/database.js', () => ({
  default: { end: vi.fn() },
  query: vi.fn(async () => []),
  transaction: vi.fn(async (cb) => cb({ query: vi.fn(async () => []) })),
}));
vi.mock('../config/stripe.js', () => ({
  getStripe: vi.fn(() => ({})),
}));

import request from 'supertest';
import app from '../server.js';

describe('API HTTP (Supertest)', () => {
  it('GET /api → 200 avec un message', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body.message).toBeTruthy();
  });

  it('GET /api/health → 200, db connectée', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/products/ → 200 et renvoie un tableau', async () => {
    const res = await request(app).get('/api/products/');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // Régression directe du bug paiement : la route de checkout DOIT exiger un token.
  it('POST /api/payment/checkout/init sans token → 401', async () => {
    const res = await request(app).post('/api/payment/checkout/init').send({});
    expect(res.status).toBe(401);
  });

  it('GET /api/cart/ sans token → 401', async () => {
    const res = await request(app).get('/api/cart/');
    expect(res.status).toBe(401);
  });

  it('GET /api/inconnue → 404', async () => {
    const res = await request(app).get('/api/route-qui-nexiste-pas');
    expect(res.status).toBe(404);
  });

  it('GET /api/user/ sans token → 401', async () => {
    const res = await request(app).get('/api/user/');
    expect(res.status).toBe(401);
  });

  it('GET /api/addresses sans token → 401', async () => {
    const res = await request(app).get('/api/addresses');
    expect(res.status).toBe(401);
  });

  it('POST /api/webhook avec signature invalide → 400', async () => {
    // On fournit les secrets pour atteindre la vérif de signature ; getStripe étant
    // mocké (pas de .webhooks valide), constructEvent échoue → 400 (comportement attendu).
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_dummy');
    const res = await request(app)
      .post('/api/webhook')
      .set('stripe-signature', 'signature-bidon')
      .set('Content-Type', 'application/json')
      .send({ type: 'payment_intent.succeeded' });
    expect(res.status).toBe(400);
    vi.unstubAllEnvs();
  });
});
