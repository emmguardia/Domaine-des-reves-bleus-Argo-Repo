// Matchers DOM (toBeInTheDocument, toBeVisible…) ajoutés à expect de Vitest.
import '@testing-library/jest-dom';

// ── Compatibilité Node 26 : fournir un Web Storage aux tests ─────────────────
//
// À partir de Node 26, `localStorage` et `sessionStorage` existent comme
// accesseurs globaux natifs. Sans l'option `--localstorage-file` ils renvoient
// `undefined`, et Node émet un ExperimentalWarning.
//
// Ces accesseurs sont posés sur `globalThis` avant que Vitest ne monte son
// environnement jsdom. Or dans Vitest, `window === globalThis` : jsdom voit la
// clé déjà présente, n'installe pas son propre `Storage`, et c'est la valeur
// `undefined` de Node qui subsiste. Vérifié sous node:26-alpine — ni `window`,
// ni le prototype de `window` ne portent de `localStorage` exploitable.
// Résultat : tout `localStorage.clear()` échoue en
// « Cannot read properties of undefined ».
//
// On installe donc une implémentation mémoire conforme à l'API Web Storage.
// Elle ne sert qu'aux tests : dans un vrai navigateur l'application utilise le
// Storage natif. Sur Node 24 et antérieurs le global n'existe pas, jsdom fait
// son travail normalement, et ce bloc ne s'active pas.
function creerStockageMemoire(): Storage {
  const donnees = new Map<string, string>();
  return {
    get length(): number {
      return donnees.size;
    },
    clear(): void {
      donnees.clear();
    },
    getItem(cle: string): string | null {
      const valeur = donnees.get(String(cle));
      return valeur === undefined ? null : valeur;
    },
    key(index: number): string | null {
      return Array.from(donnees.keys())[index] ?? null;
    },
    removeItem(cle: string): void {
      donnees.delete(String(cle));
    },
    setItem(cle: string, valeur: string): void {
      donnees.set(String(cle), String(valeur));
    },
  } as Storage;
}

for (const nom of ['localStorage', 'sessionStorage'] as const) {
  const existant = (globalThis as unknown as Record<string, unknown>)[nom];
  if (existant === undefined) {
    Object.defineProperty(globalThis, nom, {
      value: creerStockageMemoire(),
      configurable: true,
      writable: true,
    });
  }
}
