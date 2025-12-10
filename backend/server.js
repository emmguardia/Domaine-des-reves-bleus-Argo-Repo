import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, query, validationResult } from 'express-validator';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import createPaymentRoutes from './routes/payment.js';
import cartRoutes from './routes/cart.js';
import userRoutes from './routes/user.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Debug: Vérifier si le fichier .env existe
const envPath = path.join(__dirname, '.env');
console.log('Chemin du fichier .env:', envPath);
console.log('Le fichier .env existe:', fs.existsSync(envPath));

// Charger les variables d'environnement
dotenv.config();

// Vérifier les variables d'environnement requises
const requiredEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'JWT_SECRET',
  'MONGODB_URI'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Erreur: La variable d'environnement ${envVar} n'est pas définie`);
    process.exit(1);
  }
}

// Connexion à la base de données
connectDB();

// Debug: Vérifier si la variable est chargée
console.log('Chemin absolu du .env:', path.join(__dirname, '.env'));
console.log('Contenu de STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Clé trouvée' : 'Clé manquante');

// Initialiser Stripe avec la clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialiser l'application Express
const app = express();
const PORT = process.env.PORT || 3002;

// Configuration du proxy
app.set('trust proxy', 1);

// Middlewares
// 5. En-têtes de sécurité HTTP avec Helmet
// Doit être placé au début des middlewares pour être appliqué à toutes les requêtes
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://hooks.stripe.com",
        "https://pay.google.com",
        "http://176.181.59.85:3002",
        "https://domainedesrevesbleus.famillemntmata.eu"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com", "https://pay.google.com"],
    },
  },
}));

// Configuration CORS
app.use(cors({
  origin: ['https://domainedesrevesbleus.famillemntmata.eu', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 4. Limitation de débit (Rate Limiting)
// Appliquer à toutes les requêtes API pour une protection de base
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limiter chaque IP à 100 requêtes par fenêtre (windowMs)
  standardHeaders: true, // Retourner les informations de limite dans les en-têtes `RateLimit-*`
  legacyHeaders: false, // Désactiver les en-têtes `X-RateLimit-*` (obsolètes)
  message: 'Trop de requêtes envoyées depuis cette IP, veuillez réessayer après 15 minutes',
});
app.use('/api', limiter); // Appliquer uniquement aux routes API

// Rate limiting spécifique pour les tentatives de connexion (plus strict)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 tentatives de connexion par IP toutes les 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
  skipSuccessfulRequests: true, // Ne pas compter les connexions réussies
});
app.use('/api/auth/login', loginLimiter);

// Middleware spécifique pour le webhook AVANT express.json()
// Stripe a besoin du corps brut (raw body) pour vérifier la signature.
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // 1. Vérifier la signature et construire l'événement
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log(`✅ Webhook reçu et vérifié: ${event.type}`);

  } catch (err) {
    console.error(`❌ Erreur de vérification webhook: ${err.message}`);
    // En cas d'erreur de signature, renvoyer une erreur 400
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2. Gérer l'événement reçu
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      const paymentIntentId = paymentIntentSucceeded.id; // Récupérer l'ID pour les logs
      console.log(`[Webhook] Démarrage traitement pour payment_intent.succeeded: ${paymentIntentId}`);

      try {
        // --- ICI : Votre logique métier ---
        console.log(`[Webhook] Logique pour ${paymentIntentId}: Mettre à jour BDD, envoyer email, etc.`);

        console.log(`[Webhook] Traitement terminé avec succès pour payment_intent.succeeded: ${paymentIntentId}`);

      } catch (businessError) {
        console.error(`[Webhook] Erreur lors du traitement métier pour payment_intent.succeeded ${paymentIntentId}:`, businessError);
      }
      break; // Fin du case payment_intent.succeeded

    case 'payment_intent.payment_failed':
      const paymentIntentPaymentFailed = event.data.object;
      const failedPaymentIntentId = paymentIntentPaymentFailed.id;
      console.log(`[Webhook] Démarrage traitement pour payment_intent.payment_failed: ${failedPaymentIntentId}`);

       try {
         console.log(`[Webhook] Logique pour ${failedPaymentIntentId}: Marquer commande échouée, etc.`);
         console.log(`[Webhook] Traitement terminé pour payment_intent.payment_failed: ${failedPaymentIntentId}`);

       } catch (businessError) {
         console.error(`[Webhook] Erreur lors du traitement métier pour payment_intent.payment_failed ${failedPaymentIntentId}:`, businessError);
       }
      break; // Fin du case payment_intent.payment_failed

    default:
      console.log(`[Webhook] Événement non géré reçu: ${event.type}`);
  }

  // Renvoyer une réponse 200 à Stripe pour accuser réception
  res.status(200).json({ received: true });
});

// Ce middleware doit être APRES le webhook qui utilise express.raw
app.use(express.json());

// Middleware pour vérifier le type de contenu
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }
  next();
});

// Route de test simple
app.get('/api', (req, res) => {
  res.json({ message: 'Backend Les Rêves Bleus est en ligne !' });
});

// Endpoint de diagnostic
app.get('/api/health', async (req, res) => {
  try {
    const mongoStateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    const mongoState = mongoStateMap[(await import('mongoose')).default.connection.readyState] || 'unknown';

    let stripeOk = false;
    let stripeAccountId = null;
    try {
      const acct = await stripe.accounts.retrieve();
      stripeOk = true;
      stripeAccountId = acct?.id || null;
    } catch (e) {
      stripeOk = false;
    }

    res.json({
      ok: mongoState === 'connected' && stripeOk,
      mongo: { state: mongoState },
      stripe: { ok: stripeOk, account: stripeAccountId }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'healthcheck failed' });
  }
});

// Endpoint pour créer une intention de paiement Stripe - Supprimé car dupliqué
// Utilisez /api/payment/create-payment-intent à la place (avec authentification)

// Endpoint pour vérifier le statut d'un PaymentIntent
// 1. Validation des entrées pour get-payment-status
app.get('/api/get-payment-status',
  query('payment_intent')
    .isString().withMessage('payment_intent doit être une chaîne.')
    .notEmpty().withMessage('payment_intent ne doit pas être vide.')
    .matches(/^pi_.*$/).withMessage('Format de payment_intent invalide.'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn("Validation échouée pour get-payment-status:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const paymentIntentId = req.query.payment_intent;
    console.log("ID reçu pour get-payment-status:", paymentIntentId);

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      res.send({ status: paymentIntent.status });

    } catch (error) {
      console.error("Erreur lors de la récupération du statut PaymentIntent:", error.message);
      if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
        res.status(404).send({ error: "Paiement non trouvé." });
      } else {
        res.status(500).send({ error: "Erreur serveur lors de la vérification du paiement." });
      }
    }
  }
);

// 3. Gestion des erreurs sécurisée (Gestionnaire d'erreurs générique)
app.use((err, req, res, next) => {
  console.error("Erreur non gérée:", err.stack || err);
  res.status(500).send({ error: 'Une erreur interne est survenue.' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', createPaymentRoutes(stripe));
app.use('/api/cart', cartRoutes);
app.use('/api/user', userRoutes);

// Démarrer le serveur
app.listen(PORT, () => {
  console.log('Serveur démarré sur le port ' + PORT);
  console.log("Variables d'environnement chargées :");
  console.log('- MongoDB URI configuré');
  console.log('- Stripe configuré');
  console.log('- JWT configuré');
});