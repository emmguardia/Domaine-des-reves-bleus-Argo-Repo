// Génère un lien de réinitialisation du mot de passe admin (usage unique, 72 h).
// L'image ne contient pas scripts/ : on l'envoie dans le pod via stdin.
//   kubectl -n domaine-des-reves-bleus exec -i deploy/domaine-des-reves-bleus-backend -- \
//     sh -c 'cat > /tmp/l.mjs && cd /app && ADMIN_USERNAME=Laurence node /tmp/l.mjs; rm -f /tmp/l.mjs' < admin-reset-link.mjs
import { randomBytes, createHash } from 'crypto';
import { query } from '/app/config/database.js';

const username = process.env.ADMIN_USERNAME;
if (!username) {
  console.error('ADMIN_USERNAME requis');
  process.exit(1);
}

const token = randomBytes(32).toString('base64url');
const tokenHash = createHash('sha256').update(token).digest('hex');
const result = await query(
  'UPDATE admins SET reset_token_hash = ?, reset_token_expiry = DATE_ADD(NOW(), INTERVAL 72 HOUR) WHERE username = ?',
  [tokenHash, username]
);

if (result.affectedRows !== 1) {
  console.error(`Admin introuvable : ${username}`);
  process.exit(1);
}

const frontendUrl = process.env.FRONTEND_URL || 'https://domainedesrevesbleus.eu';
console.log(`\nLIEN : ${frontendUrl}/admin-panel/reset-password#token=${token}\n`);
process.exit(0);
