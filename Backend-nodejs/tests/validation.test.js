import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import {
  validateRegister,
  validateLogin,
  validateCreatePaymentIntent,
} from '../middleware/validation.js';

// Monte un validateur sur une mini-app jetable : on teste la logique de validation
// sans toucher ni la DB ni Stripe (les validateurs sont purs).
const makeApp = (validators) => {
  const app = express();
  app.use(express.json());
  app.post('/t', validators, (_req, res) => res.json({ ok: true }));
  return app;
};

describe('middleware/validation — validateRegister', () => {
  const app = makeApp(validateRegister);
  const valid = {
    firstName: 'Jean', lastName: 'Dupont', phone: '0612345678',
    email: 'jean@example.com', password: 'Abcdef1!',
  };

  it('accepte un payload valide', async () => {
    expect((await request(app).post('/t').send(valid)).status).toBe(200);
  });
  it('refuse un email invalide', async () => {
    expect((await request(app).post('/t').send({ ...valid, email: 'pas-un-email' })).status).toBe(400);
  });
  it('refuse un mot de passe faible', async () => {
    expect((await request(app).post('/t').send({ ...valid, password: 'faible' })).status).toBe(400);
  });
  it('refuse un téléphone qui n’a pas 10 chiffres', async () => {
    expect((await request(app).post('/t').send({ ...valid, phone: '123' })).status).toBe(400);
  });
});

describe('middleware/validation — validateLogin', () => {
  const app = makeApp(validateLogin);
  it('accepte email + password', async () => {
    expect((await request(app).post('/t').send({ email: 'a@b.com', password: 'x' })).status).toBe(200);
  });
  it('refuse sans email', async () => {
    expect((await request(app).post('/t').send({ password: 'x' })).status).toBe(400);
  });
});

describe('middleware/validation — validateCreatePaymentIntent', () => {
  const app = makeApp(validateCreatePaymentIntent);
  it('accepte un montant entier positif (centimes)', async () => {
    expect((await request(app).post('/t').send({ amount: 1500 })).status).toBe(200);
  });
  it('refuse un montant non entier', async () => {
    expect((await request(app).post('/t').send({ amount: 12.5 })).status).toBe(400);
  });
  it('refuse une devise non autorisée', async () => {
    expect((await request(app).post('/t').send({ amount: 100, currency: 'gbp' })).status).toBe(400);
  });
});
