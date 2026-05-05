import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

const normalizeJwtValue = (value) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeJwtValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeJwtValue(nestedValue)])
    );
  }

  return value;
};

if (!JWT_SECRET) {
  console.error('⚠️  JWT_SECRET n\'est pas défini dans les variables d\'environnement');
}

/**
 * Génère un token JWT pour un utilisateur
 */
export const generateToken = (userId, rememberMe = false, options = {}) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET non configuré');
  }

  let expiresIn = rememberMe ? '30d' : '24h';
  let expiresAt = rememberMe 
    ? Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 jours
    : Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 heures

  // Si options.expiresIn est fourni, l'utiliser
  if (options.expiresIn) {
    expiresIn = options.expiresIn;
    if (expiresIn === '24h') {
      expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
    } else if (expiresIn === '1h') {
      expiresAt = Math.floor(Date.now() / 1000) + (60 * 60);
    }
  }

  const safeUserId = normalizeJwtValue(userId);
  const safeOptions = normalizeJwtValue(options);

  const payload = {
    id: safeUserId,
    userId: safeUserId, // Alias pour compatibilité
    exp: expiresAt,
    ...safeOptions // Inclure les options supplémentaires (resetToken, type, etc.)
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
};

/**
 * Génère un token JWT pour un admin
 */
export const generateAdminToken = (adminId) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET non configuré');
  }

  const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 jours

  const payload = {
    id: normalizeJwtValue(adminId),
    role: 'admin',
    exp: expiresAt
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
};

/**
 * Décode un token JWT (sans vérification, pour debug uniquement)
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};
