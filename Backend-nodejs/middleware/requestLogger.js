import pinoHttp from 'pino-http';
import logger from '../config/logger.js';
import { httpRequestsTotal, httpRequestDuration } from '../config/metrics.js';

// Normalise les routes dynamiques pour éviter la "cardinality explosion" dans Prometheus.
// ex: /api/products/42  →  /api/products/:id
//     /api/orders/123/items  →  /api/orders/:id/items
function normalizeRoute(url) {
  return url
    .split('?')[0]                       // supprimer la query string
    .replace(/\/\d+/g, '/:id')          // remplacer les segments numériques
    .replace(/\/[a-f0-9]{24}/g, '/:id') // MongoDB-style ObjectIDs si jamais
    .replace(/\/$/, '') || '/';          // supprimer le slash final
}

// Middleware pino-http : logue chaque requête HTTP en JSON structuré.
// En production ce log est capturé par le runtime de conteneur (Docker / K8s)
// et peut être ingéré par Loki, Datadog, CloudWatch, etc.
export const httpLogger = pinoHttp({
  logger,
  // Ne pas loguer les health-checks pour éviter le bruit (Kubernetes sonde toutes les 10s)
  autoLogging: {
    ignore: (req) => req.url === '/api/health',
  },
  // Personnalise les champs du log de réponse
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} ${res.statusCode} — ${err.message}`,
  // Niveaux de log selon le code HTTP
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Champs supplémentaires sur la réponse
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    responseTime: 'durationMs',
  },
  // Sérialiser uniquement les champs utiles pour éviter de loguer les headers entiers
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

// Middleware Prometheus : enregistre chaque requête dans les compteurs/histogrammes.
export const prometheusMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationSec = durationNs / 1e9;
    const route = normalizeRoute(req.originalUrl || req.url);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationSec);
  });

  next();
};
