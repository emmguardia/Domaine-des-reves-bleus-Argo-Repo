import { describe, it, expect, vi, beforeEach } from 'vitest';

// État mutable du panier, défini dans le scope hoisté pour être accessible au mock.
const h = vi.hoisted(() => ({ cartItems: [] }));
const stripeCreate = vi.hoisted(() => vi.fn());

// DB entièrement mockée : la vraie MariaDB n'est JAMAIS connectée → zéro trace.
vi.mock('../config/database.js', () => ({
  default: { end: vi.fn() },
  query: vi.fn(async (sql) => (/FROM users/i.test(sql) ? [{ id: 1, role: 'user' }] : [])),
  transaction: vi.fn(async (cb) => cb({
    query: vi.fn(async (sql) => {
      if (/FROM carts/i.test(sql)) return [{ id: 1 }];
      if (/cart_items/i.test(sql)) return h.cartItems;
      return [];
    }),
  })),
}));

// Stripe mocké : aucun appel réseau vers Stripe (ni live ni test).
vi.mock('../config/stripe.js', () => ({
  getStripe: () => ({ paymentIntents: { create: stripeCreate } }),
}));

import request from 'supertest';
import app from '../server.js';
import { generateToken } from '../utils/jwt.js';

const bearer = () => `Bearer ${generateToken(1)}`;

beforeEach(() => {
  // Panier par défaut : 2 × 10,00 € = 2000 centimes
  h.cartItems = [{ item_id: 1, name: 'Savon', quantity: 2, unit_price: '10.00', volume: null, fragrance: null, weight_grams: 100 }];
  stripeCreate.mockReset();
  stripeCreate.mockResolvedValue({ id: 'pi_test', client_secret: 'cs_test_123', amount: 2000, status: 'requires_payment_method' });
});

describe('POST /api/payment/create-payment-intent — anti-fraude montant', () => {
  it('accepte un montant = total du panier et renvoie un clientSecret', async () => {
    const res = await request(app).post('/api/payment/create-payment-intent')
      .set('Authorization', bearer()).send({ amount: 2000 });
    expect(res.status).toBe(200);
    expect(res.body.clientSecret).toBe('cs_test_123');
    expect(stripeCreate).toHaveBeenCalledOnce();
  });

  it('refuse (400) un montant qui ne correspond pas au panier — sans appeler Stripe', async () => {
    const res = await request(app).post('/api/payment/create-payment-intent')
      .set('Authorization', bearer()).send({ amount: 5000 });
    expect(res.status).toBe(400);
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it('refuse (400) un montant nul (validateur)', async () => {
    const res = await request(app).post('/api/payment/create-payment-intent')
      .set('Authorization', bearer()).send({ amount: 0 });
    expect(res.status).toBe(400);
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it('refuse (400) un panier vide', async () => {
    h.cartItems = [];
    const res = await request(app).post('/api/payment/create-payment-intent')
      .set('Authorization', bearer()).send({ amount: 2000 });
    expect(res.status).toBe(400);
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it('refuse (401) sans token', async () => {
    const res = await request(app).post('/api/payment/create-payment-intent').send({ amount: 2000 });
    expect(res.status).toBe(401);
  });
});
