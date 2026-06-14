import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateToken, generateAdminToken, decodeToken } from '../utils/jwt.js';

const USER_SECRET = process.env.JWT_SECRET;
const ADMIN_SECRET = process.env.JWT_ADMIN_SECRET;

describe('utils/jwt', () => {
  it('génère un token user vérifiable contenant id', () => {
    const token = generateToken(42);
    const decoded = jwt.verify(token, USER_SECRET);
    expect(decoded.id).toBe(42);
    expect(decoded.userId).toBe(42);
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('rememberMe allonge l’expiration à ~30 jours', () => {
    const decoded = jwt.verify(generateToken(1, true), USER_SECRET);
    const days = (decoded.exp - Math.floor(Date.now() / 1000)) / 86400;
    expect(days).toBeGreaterThan(29);
  });

  it('génère un token admin avec role=admin', () => {
    const decoded = jwt.verify(generateAdminToken(7), ADMIN_SECRET);
    expect(decoded.role).toBe('admin');
    expect(decoded.id).toBe(7);
  });

  it('un token user n’est PAS valide avec le secret admin (isolation des privilèges)', () => {
    const token = generateToken(1);
    expect(() => jwt.verify(token, ADMIN_SECRET)).toThrow();
  });

  it('decodeToken lit le payload sans vérifier la signature', () => {
    expect(decodeToken(generateToken(5)).id).toBe(5);
  });
});
