import { describe, it, expect } from 'vitest';
import { sanitizeConfig, constantTimeCompare } from '../config/security.js';

// Joue le middleware sanitizeConfig sur un body et renvoie le req muté.
const runSanitize = (body) => {
  const req = { body, query: {}, params: {} };
  let called = false;
  sanitizeConfig(req, {}, () => { called = true; });
  return { req, called };
};

describe('config/security — sanitizeConfig', () => {
  it('retire les clés d’injection NoSQL ($) et les clés pointées', () => {
    const { req, called } = runSanitize({ $gt: 1, 'a.b': 2, ok: 'val' });
    expect(req.body).not.toHaveProperty('$gt');
    expect(req.body).not.toHaveProperty('a.b');
    expect(req.body.ok).toBe('val');
    expect(called).toBe(true);
  });

  it('tronque les chaînes de plus de 10000 caractères', () => {
    const { req } = runSanitize({ big: 'x'.repeat(11000) });
    expect(req.body.big.length).toBe(10000);
  });

  it('nettoie récursivement les objets imbriqués', () => {
    const { req } = runSanitize({ nested: { $where: 'evil', keep: 1 } });
    expect(req.body.nested).not.toHaveProperty('$where');
    expect(req.body.nested.keep).toBe(1);
  });
});

describe('config/security — constantTimeCompare', () => {
  it('vrai pour deux chaînes identiques', () => {
    expect(constantTimeCompare('abc123', 'abc123')).toBe(true);
  });
  it('faux pour des chaînes différentes (même longueur)', () => {
    expect(constantTimeCompare('abc123', 'abc124')).toBe(false);
  });
  it('faux pour des longueurs différentes (sans planter)', () => {
    expect(constantTimeCompare('abc', 'abcd')).toBe(false);
  });
});
