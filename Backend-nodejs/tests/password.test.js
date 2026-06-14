import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../utils/password.js';

describe('utils/password', () => {
  it('hache puis vérifie un mot de passe correct', async () => {
    const hash = await hashPassword('S3cret!Pass');
    expect(typeof hash).toBe('string');
    expect(hash).not.toBe('S3cret!Pass');
    expect(await verifyPassword('S3cret!Pass', hash)).toBe(true);
  });

  it('rejette un mauvais mot de passe', async () => {
    const hash = await hashPassword('S3cret!Pass');
    expect(await verifyPassword('mauvais', hash)).toBe(false);
  });

  it('tronque au-delà de 72 octets (limite bcrypt) sans planter', async () => {
    const hash = await hashPassword('a'.repeat(100));
    // Les 72 premiers octets sont identiques → match malgré la troncature
    expect(await verifyPassword('a'.repeat(72), hash)).toBe(true);
  });

  it('renvoie false (et ne jette pas) si le hash est invalide', async () => {
    expect(await verifyPassword('x', 'pas-un-hash')).toBe(false);
  });
});
