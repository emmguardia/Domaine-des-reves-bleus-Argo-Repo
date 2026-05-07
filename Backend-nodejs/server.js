import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pool, { query, transaction } from './config/database.js';
import { getStripe } from './config/stripe.js';
import logger from './config/logger.js';
import { register, ordersTotal, webhookEventsTotal } from './config/metrics.js';
import { httpLogger, prometheusMiddleware } from './middleware/requestLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  helmetConfig,
  hppConfig,
  sanitizeConfig,
  validateOrigin,
  publicRateLimiter,
  apiRateLimiter
} from './config/security.js';
import { sendOrderConfirmationEmail, sendNewOrderNotificationEmail } from './utils/email.js';

dotenv.config();

logger.info({ version: process.version, env: process.env.NODE_ENV || 'development' }, '🚀 Démarrage du serveur');

const app = express();
const PORT = process.env.PORT || 8000;

app.set('trust proxy', 1);

logger.info({ port: PORT }, '⚙️  Configuration du serveur');

// ── Observabilité ─────────────────────────────────────────────────────────────
app.use(prometheusMiddleware); // compteurs Prometheus (avant tous les autres middleware)
app.use(httpLogger);           // logs JSON structurés pino-http

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  [SERVER] STRIPE_SECRET_KEY n\'est pas défini - les webhooks Stripe ne fonctionneront pas');
}

app.use(helmetConfig);
app.use(hppConfig);
app.use(sanitizeConfig);
app.use(validateOrigin);
app.use(compression());

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.error('❌ [SERVER] FRONTEND_URL non défini en production — CORS refusera toutes les requêtes cross-origin');
}
app.use(cors({
  origin: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000', 'http://localhost:5173']),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({
  limit: '100kb', // 10 MB était un vecteur DoS (body inflation attack)
}));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Fichiers uploadés (images produits admin) — chemin sécurisé, pas d'exécution
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

app.get('/api', (req, res) => {
  res.json({ message: 'Backend Les Rêves Bleus est en ligne !' });
});

app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString(), db: 'disconnected' });
  }
});

// Endpoint de scrape Prometheus — protégé par token Bearer (defense-in-depth
// en plus de la NetworkPolicy qui limite l'accès au namespace monitoring).
app.get('/api/metrics', async (req, res) => {
  const metricsToken = process.env.METRICS_TOKEN;
  if (metricsToken) {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${metricsToken}`) {
      return res.status(401).end('Unauthorized');
    }
  }
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// Le webhook Stripe utilise express.raw() — corps brut nécessaire pour la validation
// de signature. Ce middleware est déclaré ICI (avant express.json global) pour
// intercepter /api/webhook avant que le JSON parser ne consomme le body.
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('⚠️  [WEBHOOK] STRIPE_WEBHOOK_SECRET n\'est pas défini');
    return res.status(500).json({ error: 'Configuration manquante' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️  [WEBHOOK] STRIPE_SECRET_KEY n\'est pas défini');
    return res.status(500).json({ error: 'Configuration Stripe manquante' });
  }

  let event;

  try {
    const stripeInstance = getStripe();
    // express.raw() garantit que req.body est le Buffer brut
    event = stripeInstance.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`❌ [WEBHOOK] Signature invalide: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`✅ [WEBHOOK] Événement reçu: type=${event.type}, id=${event.id}`);

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const paymentIntentId = paymentIntent.id;
    const userId = paymentIntent.metadata?.userId;

    console.log(`🎯 [WEBHOOK] payment_intent.succeeded pi=${paymentIntentId}, userId=${userId || 'MANQUANT'}, amount=${paymentIntent.amount}`);

    try {
      const existingOrders = await query(
        'SELECT id FROM orders WHERE payment_intent_id = ?',
        [paymentIntentId]
      );

      if (existingOrders && existingOrders.length > 0) {
        logger.warn({ pi: paymentIntentId, orderId: existingOrders[0].id }, '[WEBHOOK] Commande déjà existante, skip');
        webhookEventsTotal.inc({ event_type: event.type, result: 'duplicate' });
        return res.json({ received: true });
      }

      if (!userId) {
        console.error(`❌ [WEBHOOK] userId manquant dans metadata pi=${paymentIntentId}`);
        return res.json({ received: true });
      }

      const carts = await query(
        'SELECT id FROM carts WHERE user_id = ?',
        [parseInt(userId)]
      );

      if (!carts || carts.length === 0) {
        console.error(`❌ [WEBHOOK] Panier introuvable userId=${userId}, pi=${paymentIntentId}`);
        return res.json({ received: true });
      }

      const cart = carts[0];
      console.log(`🛒 [WEBHOOK] Panier trouvé userId=${userId}, cartId=${cart.id}`);

      // Récupérer les articles avec les vrais prix depuis la table products (anti-fraude).
      // COALESCE(NULLIF(ci.image,''), p.image) : image depuis products si cart ne l'a pas.
      const cartItems = await query(
        `SELECT ci.item_id, ci.name, COALESCE(p.price, ci.price) as price,
                ci.quantity, COALESCE(NULLIF(ci.image, ''), p.image) as image,
                ci.volume, ci.fragrance, ci.weight_grams
         FROM cart_items ci
         LEFT JOIN products p ON p.id = ci.item_id
         WHERE ci.cart_id = ?`,
        [cart.id]
      );

      if (!cartItems || cartItems.length === 0) {
        console.error(`❌ [WEBHOOK] Panier vide userId=${userId}, cartId=${cart.id}, pi=${paymentIntentId}`);
        return res.json({ received: true });
      }

      console.log(`🛒 [WEBHOOK] ${cartItems.length} article(s) dans le panier userId=${userId}`);

      const totalAmount = paymentIntent.amount / 100;
      const shippingCost = parseFloat(paymentIntent.metadata?.shippingCost || '0');
      const pickupLocation = paymentIntent.metadata?.pickupLocation || null;

      const shippingAddress = {
        firstName: paymentIntent.metadata?.firstName || '',
        lastName: paymentIntent.metadata?.lastName || '',
        email: paymentIntent.metadata?.email || '',
        phone: paymentIntent.metadata?.phone || '',
        address: (pickupLocation === 'Arnas' || pickupLocation === 'Mezeria')
          ? `Retrait sur place - ${pickupLocation}`
          : (paymentIntent.metadata?.address || ''),
        city: paymentIntent.metadata?.city || '',
        postalCode: paymentIntent.metadata?.postalCode || '',
        country: paymentIntent.metadata?.country || 'France',
        pickupLocation: pickupLocation || undefined
      };

      console.log(`💾 [WEBHOOK] Création commande userId=${userId}, pi=${paymentIntentId}, total=${totalAmount}€, fraisPort=${shippingCost}€`);

      let orderId;
      try {
        await transaction(async (conn) => {
          const orderResult = await conn.query(
            `INSERT INTO orders (user_id, payment_intent_id, total_amount, shipping_cost, shipping_address,
                                status, payment_status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'paid', 'succeeded', NOW(), NOW())`,
            [
              parseInt(userId),
              paymentIntentId,
              totalAmount,
              shippingCost,
              JSON.stringify(shippingAddress)
            ]
          );

          orderId = orderResult.insertId;
          console.log(`✅ [WEBHOOK] Commande insérée orderId=${orderId}, userId=${userId}`);

          for (const item of cartItems) {
            await conn.query(
              `INSERT INTO order_items (order_id, product_id, name, price, quantity, image, volume, fragrance, weight_grams)
               VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
              [
                orderId,
                item.name,
                item.price,
                item.quantity,
                item.image,
                item.volume || null,
                item.fragrance || null,
                item.weight_grams || 100
              ]
            );
          }

          console.log(`✅ [WEBHOOK] ${cartItems.length} order_items insérés orderId=${orderId}`);
          await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);
          console.log(`🗑️  [WEBHOOK] Panier vidé cartId=${cart.id}`);
        });
      } catch (txError) {
        // Doublon UNIQUE sur payment_intent_id : create-order a déjà traité ce paiement
        if (txError.errno === 1062 || txError.code === 'ER_DUP_ENTRY') {
          logger.warn({ pi: paymentIntentId }, '[WEBHOOK] Doublon ignoré (create-order plus rapide)');
          webhookEventsTotal.inc({ event_type: event.type, result: 'duplicate' });
          return res.json({ received: true }); // 200 → Stripe ne réessaie pas
        }
        throw txError; // Relancer pour le catch extérieur
      }

      const users = await query(
        'SELECT first_name, last_name, email, phone FROM users WHERE id = ?',
        [parseInt(userId)]
      );

      if (users && users.length > 0) {
        const user = users[0];
        console.log(`📧 [WEBHOOK] Envoi emails de confirmation userId=${userId}, email=${user.email}`);

        await sendOrderConfirmationEmail(user.email, {
          firstName: user.first_name,
          lastName: user.last_name,
          orderNumber: paymentIntentId,
          orderDate: new Date().toISOString(),
          items: cartItems.map(item => ({
            name: item.name,
            price: parseFloat(item.price),
            quantity: item.quantity,
            image: item.image
          })),
          totalAmount,
          shippingCost,
          shippingAddress
        });

        await sendNewOrderNotificationEmail({
          orderNumber: paymentIntentId,
          customerName: `${user.first_name} ${user.last_name}`,
          customerEmail: user.email,
          customerPhone: user.phone,
          items: cartItems.map(item => ({
            name: item.name,
            price: parseFloat(item.price),
            quantity: item.quantity
          })),
          totalAmount,
          shippingCost,
          shippingAddress,
          paymentMethod: 'Stripe'
        });

        console.log(`✅ [WEBHOOK] Emails envoyés userId=${userId}, orderId=${orderId}`);
      } else {
        console.warn(`⚠️  [WEBHOOK] Utilisateur introuvable pour email userId=${userId}, orderId=${orderId}`);
      }

      logger.info({ orderId, pi: paymentIntentId }, '[WEBHOOK] Commande traitée avec succès');
      ordersTotal.inc({ status: 'paid' });
      webhookEventsTotal.inc({ event_type: event.type, result: 'success' });
    } catch (error) {
      logger.error({ pi: paymentIntentId, err: error }, '[WEBHOOK] Erreur traitement payment_intent.succeeded');
      webhookEventsTotal.inc({ event_type: event.type, result: 'error' });
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    const paymentIntentId = paymentIntent.id;
    const userId = paymentIntent.metadata?.userId;

    console.log(`❌ [WEBHOOK] payment_intent.payment_failed pi=${paymentIntentId}, userId=${userId || 'MANQUANT'}`);

    try {
      const existingOrders = await query(
        'SELECT id FROM orders WHERE payment_intent_id = ?',
        [paymentIntentId]
      );

      if (!existingOrders || existingOrders.length === 0) {
        const shippingCost = parseFloat(paymentIntent.metadata?.shippingCost || '0');
        const pickupLocation = paymentIntent.metadata?.pickupLocation || null;
        const shippingAddress = {
          firstName: paymentIntent.metadata?.firstName || '',
          lastName: paymentIntent.metadata?.lastName || '',
          email: paymentIntent.metadata?.email || '',
          phone: paymentIntent.metadata?.phone || '',
          address: (pickupLocation === 'Arnas' || pickupLocation === 'Mezeria')
            ? `Retrait sur place - ${pickupLocation}`
            : (paymentIntent.metadata?.address || ''),
          city: paymentIntent.metadata?.city || '',
          postalCode: paymentIntent.metadata?.postalCode || '',
          country: paymentIntent.metadata?.country || 'France',
          pickupLocation: pickupLocation || undefined
        };

        const totalAmount = paymentIntent.amount / 100;
        await query(
          `INSERT INTO orders (user_id, payment_intent_id, total_amount, shipping_cost, shipping_address,
                               status, payment_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'cancelled', 'failed', NOW(), NOW())`,
          [
            userId ? parseInt(userId) : null,
            paymentIntentId,
            totalAmount,
            shippingCost,
            JSON.stringify(shippingAddress)
          ]
        );
        logger.info({ pi: paymentIntentId }, '[WEBHOOK] Commande échouée enregistrée');
        ordersTotal.inc({ status: 'failed' });
      }
      webhookEventsTotal.inc({ event_type: event.type, result: 'success' });
    } catch (error) {
      logger.error({ pi: paymentIntentId, err: error }, '[WEBHOOK] Erreur traitement payment_failed');
      webhookEventsTotal.inc({ event_type: event.type, result: 'error' });
    }
  }

  res.json({ received: true });
});

import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import cartRouter from './routes/cart.js';
import userRouter from './routes/user.js';
import addressesRouter from './routes/addresses.js';
import paymentRouter from './routes/payment.js';
import adminRouter from './routes/admin.js';
import emailRouter from './routes/email.js';

app.get('/api/services', publicRateLimiter, async (req, res) => {
  try {
    const services = await query(
      'SELECT id, name, description, price, duration, details FROM services ORDER BY sort_order ASC, id ASC'
    );
    res.json((services || []).map(s => ({
      id: s.id,
      name: s.name,
      description: s.description || '',
      price: s.price || '',
      duration: s.duration || '',
      details: typeof s.details === 'string' ? JSON.parse(s.details || '[]') : (s.details || [])
    })));
  } catch (err) {
    console.error('Erreur GET /api/services:', err);
    res.json([]);
  }
});

app.use('/api/auth', publicRateLimiter, authRouter);
app.use('/api/products', productsRouter);
app.use('/api/cart', apiRateLimiter, cartRouter);
app.use('/api/user', apiRateLimiter, userRouter);
app.use('/api/addresses', apiRateLimiter, addressesRouter);
app.use('/api/payment', apiRateLimiter, paymentRouter);
app.use('/api/admin', apiRateLimiter, adminRouter);
app.use('/api/email', publicRateLimiter, emailRouter);

// Route /api/get-payment-status supprimée (IDOR — publique sans auth).
// Utiliser /api/payment/get-payment-status qui est protégée par verifyToken.

// Sitemap dynamique — inclut les pages statiques + toutes les pages produits actives
// depuis la DB. Le lastmod utilise la vraie date de mise à jour du produit.
app.get('/sitemap.xml', publicRateLimiter, async (req, res) => {
  const BASE = 'https://domainedesrevesbleus.eu';
  const staticPages = [
    { loc: '/',                            changefreq: 'weekly',  priority: '1.0', lastmod: null },
    { loc: '/products',                    changefreq: 'weekly',  priority: '0.9', lastmod: null },
    { loc: '/services',                    changefreq: 'monthly', priority: '0.8', lastmod: null },
    { loc: '/contact',                     changefreq: 'monthly', priority: '0.7', lastmod: null },
    { loc: '/mentions-legales',            changefreq: 'yearly',  priority: '0.3', lastmod: null },
    { loc: '/cgv',                         changefreq: 'yearly',  priority: '0.3', lastmod: null },
    { loc: '/politique-de-confidentialite',changefreq: 'yearly',  priority: '0.3', lastmod: null },
  ];

  let products = [];
  try {
    products = await query(
      'SELECT id, updated_at FROM products WHERE active = 1 ORDER BY id ASC'
    );
  } catch {
    // En cas d'erreur DB, on génère quand même le sitemap statique
  }

  const toIso = (d) => d ? new Date(d).toISOString() : new Date().toISOString();

  const urlEntry = ({ loc, changefreq, priority, lastmod }) => `
  <url>
    <loc>${BASE}${loc}</loc>
    <lastmod>${toIso(lastmod)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

  const productEntries = products.map(p =>
    urlEntry({ loc: `/products/${p.id}`, changefreq: 'weekly', priority: '0.8', lastmod: p.updated_at })
  ).join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(urlEntry).join('')}${productEntries}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.send(sitemap);
});

app.get('/robots.txt', (req, res) => {
  const robots = `User-agent: *
Allow: /
Allow: /products
Allow: /services
Allow: /contact
Allow: /mentions-legales
Allow: /cgv
Allow: /politique-de-confidentialite
Allow: /login
Allow: /sitemap.xml
Allow: /robots.txt

Disallow: /register
Disallow: /reset-password
Disallow: /profile
Disallow: /checkout
Disallow: /order-confirmation
Disallow: /admin-panel
Disallow: /admin-panel/
Disallow: /api/

Sitemap: https://domainedesrevesbleus.eu/sitemap.xml
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(robots);
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    detail: 'La ressource demandée n\'existe pas'
  });
});

app.use((err, req, res, next) => {
  const clientIP = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  
  console.error('❌ [ERROR]', req.method, req.path, '-', err.message);
  console.error('❌ [ERROR] IP:', clientIP);
  console.error('❌ [ERROR] User-Agent:', req.headers['user-agent']);
  
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ [ERROR] Stack:', err.stack);
  }
  
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'Une erreur est survenue' 
    : err.message;
  
  const isDatabaseError = err.message?.includes('SQL') || 
                          err.message?.includes('database') ||
                          err.message?.includes('connection');
  
  res.status(err.status || 500).json({
    error: 'Erreur serveur',
    detail: isDatabaseError && process.env.NODE_ENV === 'production'
      ? 'Une erreur est survenue'
      : errorMessage
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info({
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    api: `http://0.0.0.0:${PORT}/api`,
    health: `http://0.0.0.0:${PORT}/api/health`,
    metrics: `http://0.0.0.0:${PORT}/api/metrics`,
  }, '🚀 Serveur démarré avec succès');

  if (process.env.MARIADB_HOST && process.env.MARIADB_PASSWORD) {
    query('SELECT 1').then(() => {
      logger.info('✅ Connexion à la base de données: OK');
    }).catch((error) => {
      logger.error({ err: error }, '❌ Connexion à la base de données: ÉCHEC');
    });
  } else {
    logger.warn('⚠️  Base de données non configurée — mode développement sans DB');
  }
});

// Graceful shutdown : ferme les connexions en cours avant de quitter
const gracefulShutdown = (signal) => {
  logger.info({ signal }, 'Arrêt gracieux du serveur...');
  server.close(async () => {
    logger.info('Serveur HTTP fermé, fermeture du pool DB...');
    try {
      if (pool) await pool.end();
      logger.info('Pool DB fermé proprement');
    } catch (err) {
      logger.error({ err }, 'Erreur fermeture pool DB');
    }
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Timeout graceful shutdown — forçage exit(1)');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

export default app;
