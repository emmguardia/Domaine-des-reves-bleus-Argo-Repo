// Script pour générer le hash du mot de passe admin
// Exécuter depuis le répertoire backend: node scripts/generateHash.js

import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Trouver le répertoire backend (où se trouve node_modules)
let backendDir = __dirname;
let found = false;
for (let i = 0; i < 5; i++) {
  const nodeModulesPath = join(backendDir, 'node_modules', 'bcryptjs');
  if (existsSync(nodeModulesPath)) {
    found = true;
    break;
  }
  backendDir = resolve(backendDir, '..');
}

if (!found) {
  console.error('Erreur: Impossible de trouver node_modules/bcryptjs');
  console.error('Assurez-vous d\'exécuter: cd backend && npm install');
  process.exit(1);
}

// Changer vers le répertoire backend pour résoudre les modules
process.chdir(backendDir);

const password = '9cku6XMJqmdMgs*.';

bcrypt.hash(password, 12)
  .then(hash => {
    console.log('\n========================================');
    console.log('Hash du mot de passe généré:');
    console.log(hash);
    console.log('========================================\n');
    console.log('Copiez ce hash dans init.js à la place de "HASH_À_GÉNÉRER"\n');
  })
  .catch(err => {
    console.error('Erreur:', err);
    console.error('\nAssurez-vous que bcryptjs est installé:');
    console.error('cd backend && npm install');
    process.exit(1);
  });
