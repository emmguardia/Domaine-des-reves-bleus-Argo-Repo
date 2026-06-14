import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // `any` est pervasif et intentionnel dans ce code : le bannir = risque inutile
      // pour une règle de style. On le désactive (pas une faille de sécu).
      '@typescript-eslint/no-explicit-any': 'off',
      // Respecte la convention `_` (déjà utilisée pour « inutilisé volontaire ») et
      // passe en warn : plus d'alertes Error « Security » pour du style.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // Catch vides intentionnels (best-effort) autorisés ; le reste de no-empty reste actif.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Conseils, pas des failles : on les garde en warn (visibles en dev, pas en alerte Error).
      'no-useless-catch': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  }
);
