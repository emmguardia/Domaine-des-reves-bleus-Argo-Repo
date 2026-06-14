import { describe, it, expect, beforeEach } from 'vitest';
import { validateFileType, validateFileSize, secureStorage } from './security';

describe('utils/security — validateFileType', () => {
  const fakeFile = (type: string) => ({ type } as File);

  it('accepte un type MIME exact', () => {
    expect(validateFileType(fakeFile('image/png'), ['image/png'])).toBe(true);
  });
  it('accepte un wildcard image/*', () => {
    expect(validateFileType(fakeFile('image/jpeg'), ['image/*'])).toBe(true);
  });
  it('refuse un type non autorisé', () => {
    expect(validateFileType(fakeFile('application/pdf'), ['image/*'])).toBe(false);
  });
});

describe('utils/security — validateFileSize', () => {
  const fakeFile = (size: number) => ({ size } as File);

  it('accepte un fichier sous la limite', () => {
    expect(validateFileSize(fakeFile(1_000_000), 2)).toBe(true);
  });
  it('refuse un fichier au-dessus de la limite', () => {
    expect(validateFileSize(fakeFile(3_000_000), 2)).toBe(false);
  });
});

describe('utils/security — secureStorage', () => {
  beforeEach(() => localStorage.clear());

  it('stocke en clair les clés normales', () => {
    secureStorage.setItem('lang', 'fr');
    expect(localStorage.getItem('lang')).toBe('fr');
    expect(secureStorage.getItem('lang')).toBe('fr');
  });

  it('encode (base64) les clés sensibles, insensible à la casse (adminToken…)', () => {
    // adminToken a un T majuscule : avant le fix il restait en clair. Régression gardée.
    secureStorage.setItem('adminToken', 'abc.def.ghi');
    expect(localStorage.getItem('adminToken')).not.toBe('abc.def.ghi'); // stocké encodé (base64)
    expect(secureStorage.getItem('adminToken')).toBe('abc.def.ghi');    // relu décodé
  });

  it('removeItem supprime la clé', () => {
    secureStorage.setItem('x', 'y');
    secureStorage.removeItem('x');
    expect(secureStorage.getItem('x')).toBeNull();
  });
});
