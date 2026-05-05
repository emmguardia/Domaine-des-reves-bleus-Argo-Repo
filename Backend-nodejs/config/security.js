import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';

export const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs || 15 * 60 * 1000,
    max: max || 100,
    message: message || 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return req.path === '/api/health';
    }
  });
};

export const authRateLimiter = createRateLimiter(
  15 * 60 * 1000,
  7,
  'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.'
);

export const passwordResetRateLimiter = createRateLimiter(
  60 * 60 * 1000,
  3,
  'Trop de tentatives de réinitialisation de mot de passe. Veuillez réessayer dans 1 heure.'
);

export const adminAuthRateLimiter = createRateLimiter(
  15 * 60 * 1000,
  3,
  'Trop de tentatives de connexion admin. Votre IP sera bannie après 3 tentatives échouées.'
);

export const publicRateLimiter = createRateLimiter(
  15 * 60 * 1000,
  100,
  'Trop de requêtes. Veuillez réessayer plus tard.'
);

export const apiRateLimiter = createRateLimiter(
  15 * 60 * 1000,
  200,
  'Trop de requêtes. Veuillez réessayer plus tard.'
);

export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "https:"],
      frameSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  dnsPrefetchControl: true,
  downloadOptions: {
    action: 'deny'
  },
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin"
  },
  permissionsPolicy: {
    geolocation: [],
    microphone: [],
    camera: []
  }
});

export const hppConfig = hpp({
  whitelist: ['category', 'status', 'page', 'limit']
});

export const sanitizeConfig = (req, res, next) => {
  next();
};

export const validateOrigin = (req, res, next) => {
  if (req.path === '/api/health' || req.path === '/api/webhook') {
    return next();
  }

  const origin = req.headers.origin || req.headers.referer;
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://domainedesrevesbleus.eu',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  if (!origin) {
    return next();
  }

  const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed));
  
  if (!isAllowed && process.env.NODE_ENV === 'production') {
    console.warn(`⚠️  [SECURITY] Requête depuis une origine non autorisée: ${origin} (IP: ${req.ip})`);
    return res.status(403).json({
      error: 'Accès refusé',
      detail: 'Origine non autorisée'
    });
  }

  next();
};

export const constantTimeCompare = (a, b) => {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
};
