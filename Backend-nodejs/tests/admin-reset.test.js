import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';

vi.mock('../config/database.js', () => ({
  default: { end: vi.fn() },
  query: vi.fn(async () => []),
  transaction: vi.fn(async (cb) => cb({ query: vi.fn(async () => []) })),
}));
vi.mock('../config/stripe.js', () => ({
  getStripe: vi.fn(() => ({})),
}));

import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../server.js';
import { query } from '../config/database.js';
import { checkAdminPassword } from '../routes/admin.js';

const TOKEN = 'A'.repeat(43);
const TOKEN_HASH = createHash('sha256').update(TOKEN).digest('hex');
const GOOD_PASSWORD = 'Chiens-bleus';

describe('checkAdminPassword (10 car. mini, une lettre, un caractère spécial)', () => {
  it.each([
    ['court!a', false],
    ['abcdefghijk', false], // pas de caractère spécial
    ['1234567890!', false], // pas de lettre
    ['x'.repeat(72) + '!', false], // au-delà de la limite bcrypt
    ['Chien2026!', true],
    ['été-chiens', true],
  ])('%s → valide=%s', (password, valid) => {
    expect(checkAdminPassword(password) === null).toBe(valid);
  });
});

// Le rate-limiter autorise 10 requêtes/heure : ce fichier en fait moins.
describe('POST /api/admin/reset-password', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('token mal formé → 400 sans toucher la base', async () => {
    const res = await request(app).post('/api/admin/reset-password').send({ token: 'abc', password: GOOD_PASSWORD });
    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it('mot de passe trop faible → 400 avec la règle non respectée', async () => {
    const res = await request(app).post('/api/admin/reset-password').send({ token: TOKEN, password: 'abcdefghijk' });
    expect(res.status).toBe(400);
    expect(res.body.detail).toMatch(/caractère spécial/);
    expect(query).not.toHaveBeenCalled();
  });

  it('token inconnu ou expiré → 400', async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    const res = await request(app).post('/api/admin/reset-password').send({ token: TOKEN, password: GOOD_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.detail).toBe('Lien invalide ou expiré');
  });

  it('token valide → 200, mot de passe hashé, token consommé', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([{ id: 1, username: 'Laurence' }])
      .mockResolvedValueOnce({ affectedRows: 1 });
    const res = await request(app).post('/api/admin/reset-password').send({ token: TOKEN, password: GOOD_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, username: 'Laurence' });

    // Recherche par hash, jamais par le token brut
    const [, selectParams] = vi.mocked(query).mock.calls[0];
    expect(selectParams).toEqual([TOKEN_HASH]);

    const [updateSql, [hashed, adminId, hashParam]] = vi.mocked(query).mock.calls[1];
    expect(updateSql).toMatch(/reset_token_hash = NULL/);
    expect(adminId).toBe(1);
    expect(hashParam).toBe(TOKEN_HASH);
    expect(await bcrypt.compare(GOOD_PASSWORD, hashed)).toBe(true);
  });

  it('token déjà consommé entre-temps (double soumission) → 400', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([{ id: 1, username: 'Laurence' }])
      .mockResolvedValueOnce({ affectedRows: 0 });
    const res = await request(app).post('/api/admin/reset-password').send({ token: TOKEN, password: GOOD_PASSWORD });
    expect(res.status).toBe(400);
  });

  it('la route est publique mais le reste de /api/admin exige un token', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });
});
