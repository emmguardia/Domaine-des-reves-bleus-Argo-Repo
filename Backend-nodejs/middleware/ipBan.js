/**
 * Middleware de ban IP pour sécuriser le panel admin
 * Ban automatique après 3 tentatives échouées
 */

// Stockage en mémoire des tentatives échouées et IPs bannies
const failedAttempts = new Map(); // IP -> { count: number, firstAttempt: Date, lastAttempt: Date }
const bannedIPs = new Map(); // IP -> { bannedUntil: Date }

// Durée du ban (1 heure par défaut)
const BAN_DURATION_MS = 60 * 60 * 1000; // 1 heure
// Nombre maximum de tentatives avant ban
const MAX_ATTEMPTS = 3;
// Fenêtre de temps pour compter les tentatives (15 minutes)
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Récupère l'IP réelle du client
 */
const getClientIP = (req) => {
  return req.ip || 
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         'unknown';
};

/**
 * Vérifie si une IP est bannie
 */
export const isIPBanned = (req) => {
  const ip = getClientIP(req);
  const banInfo = bannedIPs.get(ip);
  
  if (!banInfo) {
    return false;
  }
  
  // Si le ban a expiré, le supprimer
  if (banInfo.bannedUntil < new Date()) {
    bannedIPs.delete(ip);
    failedAttempts.delete(ip);
    return false;
  }
  
  return true;
};

/**
 * Enregistre une tentative échouée
 */
export const recordFailedAttempt = (req) => {
  const ip = getClientIP(req);
  const now = new Date();
  
  const attemptInfo = failedAttempts.get(ip) || {
    count: 0,
    firstAttempt: now,
    lastAttempt: now
  };
  
  attemptInfo.count += 1;
  attemptInfo.lastAttempt = now;
  
  // Si c'est la première tentative, enregistrer la date
  if (attemptInfo.count === 1) {
    attemptInfo.firstAttempt = now;
  }
  
  // Si la fenêtre de temps a expiré, réinitialiser le compteur
  if (now - attemptInfo.firstAttempt > ATTEMPT_WINDOW_MS) {
    attemptInfo.count = 1;
    attemptInfo.firstAttempt = now;
  }
  
  failedAttempts.set(ip, attemptInfo);
  
  // Si le nombre de tentatives dépasse le maximum, bannir l'IP
  if (attemptInfo.count >= MAX_ATTEMPTS) {
    const bannedUntil = new Date(now.getTime() + BAN_DURATION_MS);
    bannedIPs.set(ip, { bannedUntil });
    console.warn(`🚫 [IP-BAN] IP ${ip} bannie jusqu'à ${bannedUntil.toISOString()} (${attemptInfo.count} tentatives échouées)`);
    
    // Nettoyer les tentatives pour cette IP
    failedAttempts.delete(ip);
  }
};

/**
 * Réinitialise les tentatives échouées pour une IP (en cas de succès)
 */
export const resetFailedAttempts = (req) => {
  const ip = getClientIP(req);
  failedAttempts.delete(ip);
};

/**
 * Middleware pour vérifier si l'IP est bannie
 */
export const checkIPBan = (req, res, next) => {
  if (isIPBanned(req)) {
    const ip = getClientIP(req);
    const banInfo = bannedIPs.get(ip);
    const remainingTime = Math.ceil((banInfo.bannedUntil - new Date()) / 1000 / 60); // en minutes
    
    console.warn(`🚫 [IP-BAN] Tentative de connexion depuis IP bannie: ${ip} (ban expire dans ${remainingTime} minutes)`);
    
    return res.status(403).json({
      error: 'Accès refusé',
      detail: `Trop de tentatives échouées. Votre IP est temporairement bannie. Réessayez dans ${remainingTime} minute(s).`
    });
  }
  
  next();
};

/**
 * Nettoie périodiquement les anciennes entrées (pour éviter les fuites mémoire)
 */
setInterval(() => {
  const now = new Date();
  
  // Nettoyer les IPs bannies expirées
  for (const [ip, banInfo] of bannedIPs.entries()) {
    if (banInfo.bannedUntil < now) {
      bannedIPs.delete(ip);
      failedAttempts.delete(ip);
    }
  }
  
  // Nettoyer les tentatives échouées anciennes
  for (const [ip, attemptInfo] of failedAttempts.entries()) {
    if (now - attemptInfo.firstAttempt > ATTEMPT_WINDOW_MS) {
      failedAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Nettoyage toutes les 5 minutes
