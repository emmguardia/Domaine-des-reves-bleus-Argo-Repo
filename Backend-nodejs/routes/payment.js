import express from 'express';
import { query, transaction } from '../config/database.js';
import { verifyToken } from '../middleware/auth.js';
import { validateCreatePaymentIntent } from '../middleware/validation.js';
import { publicRateLimiter } from '../config/security.js';
import { sendOrderConfirmationEmail, sendNewOrderNotificationEmail } from '../utils/email.js';
import { getStripe } from '../config/stripe.js';
import logger from '../config/logger.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(verifyToken);
router.use(publicRateLimiter);

/**
 * Sauvegarde l'adresse de livraison comme adresse par défaut de l'utilisateur (upsert).
 * - Déduplique sur le champ `address` : pas de nouvelle ligne si l'adresse existe déjà.
 * - Ne garde qu'une seule adresse `is_default = 1` par utilisateur.
 * Appelée uniquement quand l'utilisateur coche « sauvegarder mon adresse ».
 */
async function saveDefaultAddress(userId, info) {
  const s = (str, max = 255) => (str && typeof str === 'string' ? str.trim().substring(0, max) : '');
  const address = s(info.address, 500);
  if (!address) return;
  const firstName  = s(info.firstName, 100);
  const lastName   = s(info.lastName, 100);
  const phone      = s(info.phone, 20);
  const city       = s(info.city, 100);
  const postalCode = s(info.postalCode, 10);
  const country    = s(info.country, 100) || 'France';

  // Retirer le flag « défaut » des autres adresses de cet utilisateur
  await query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);

  const existing = await query(
    'SELECT id FROM addresses WHERE user_id = ? AND address = ? LIMIT 1',
    [userId, address]
  );
  if (existing && existing.length > 0) {
    await query(
      `UPDATE addresses
         SET label = 'Livraison', first_name = ?, last_name = ?, phone = ?,
             city = ?, postal_code = ?, country = ?, is_default = 1, updated_at = NOW()
       WHERE id = ?`,
      [firstName, lastName, phone, city, postalCode, country, existing[0].id]
    );
  } else {
    await query(
      `INSERT INTO addresses (user_id, label, first_name, last_name, phone, address, city, postal_code, country, is_default, created_at, updated_at)
       VALUES (?, 'Livraison', ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [userId, firstName, lastName, phone, address, city, postalCode, country]
    );
  }
}

/**
 * POST /api/payment/create-payment-intent
 * Crée une intention de paiement Stripe
 */
router.post('/create-payment-intent', validateCreatePaymentIntent, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, currency = 'eur', shippingInfo, shippingCost = 0.0, pickupLocation } = req.body;
    console.log(`[PAYMENT-INTENT] Début création userId=${userId}, amount=${amount}, currency=${currency}, shippingCost=${shippingCost || 0}, pickup=${pickupLocation || 'none'}`);

    const stripeInstance = getStripe();

    if (amount <= 0 || !Number.isInteger(amount)) {
      console.warn(`[PAYMENT-INTENT] Montant invalide userId=${userId}, amount=${amount}`);
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Le montant doit être un entier positif (en centimes)'
      });
    }

    // SELECT FOR UPDATE : verrouille le panier le temps de la validation du montant
    // pour éviter la TOCTOU (Time-of-Check Time-of-Use) : une deuxième requête ne peut
    // pas modifier le panier entre le SELECT et la création du PaymentIntent.
    let carts, cartItems;
    await transaction(async (conn) => {
      const cartRows = await conn.query(
        'SELECT id FROM carts WHERE user_id = ? FOR UPDATE',
        [userId]
      );
      if (!cartRows || cartRows.length === 0) {
        throw Object.assign(new Error('Panier vide'), { statusCode: 400 });
      }
      carts = cartRows;

      const items = await conn.query(
        `SELECT ci.item_id, ci.name, ci.quantity,
                COALESCE(p.price, ci.price) as unit_price,
                ci.volume, ci.fragrance, ci.weight_grams
         FROM cart_items ci
         LEFT JOIN products p ON p.id = ci.item_id
         WHERE ci.cart_id = ?`,
        [carts[0].id]
      );
      if (!items || items.length === 0) {
        throw Object.assign(new Error('Panier vide'), { statusCode: 400 });
      }
      cartItems = items;

      // Validation du montant à l'intérieur du verrou
      const expectedSubtotalCents = cartItems.reduce((sum, item) =>
        sum + Math.round(parseFloat(item.unit_price) * 100) * Number(item.quantity), 0);
      const expectedTotalCents = expectedSubtotalCents + Math.round((shippingCost || 0) * 100);
      if (Math.abs(amount - expectedTotalCents) > 1) {
        throw Object.assign(
          new Error('Le montant ne correspond pas au contenu du panier'),
          { statusCode: 400 }
        );
      }
    });

    if (!carts || !cartItems) {
      return res.status(400).json({ error: 'Erreur', detail: 'Panier vide' });
    }

    const metadata = {
      userId: userId.toString()
    };

    if (shippingInfo) {
      // Sanitizer et limiter la longueur des champs pour éviter les abus
      const sanitizeString = (str, maxLength = 255) => {
        if (!str || typeof str !== 'string') return '';
        return str.trim().substring(0, maxLength);
      };

      metadata.firstName = sanitizeString(shippingInfo.firstName, 100);
      metadata.lastName = sanitizeString(shippingInfo.lastName, 100);
      metadata.email = sanitizeString(shippingInfo.email, 255);
      metadata.phone = sanitizeString(shippingInfo.phone, 20);
      metadata.address = sanitizeString(shippingInfo.address, 500);
      metadata.city = sanitizeString(shippingInfo.city, 100);
      metadata.postalCode = sanitizeString(shippingInfo.postalCode, 10);
      metadata.country = sanitizeString(shippingInfo.country, 100) || 'France';
    }

    if (shippingCost) {
      metadata.shippingCost = shippingCost.toString();
    }

    if (pickupLocation === 'Arnas' || pickupLocation === 'Mezeria') {
      metadata.pickupLocation = pickupLocation;
    }

    // L'adresse n'est plus sauvegardée automatiquement ici (évitait des doublons dans la
    // table addresses). La sauvegarde se fait à la demande via checkout/init (case à cocher).

    try {
      const paymentIntent = await stripeInstance.paymentIntents.create({
        amount: amount,
        currency: currency,
        metadata: metadata,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always'
        }
      });
      console.log(`[PAYMENT-INTENT] Créé userId=${userId}, pi=${paymentIntent.id}, amount=${paymentIntent.amount}, status=${paymentIntent.status}`);

      // Snapshot complet de la commande — filet de sécurité si create-order ne s'exécute pas
      // (navigateur fermé, crash réseau, etc.). Contient tout pour recréer la commande manuellement.
      logger.info({
        event: 'ORDER_SNAPSHOT',
        pi: paymentIntent.id,
        userId,
        amountCents: paymentIntent.amount,
        currency,
        shippingCostEuros: shippingCost || 0,
        pickupLocation: pickupLocation || null,
        shipping: shippingInfo ? {
          firstName: metadata.firstName,
          lastName:  metadata.lastName,
          email:     metadata.email,
          phone:     metadata.phone,
          address:   metadata.address,
          city:      metadata.city,
          postalCode: metadata.postalCode,
          country:   metadata.country,
        } : null,
        items: cartItems.map(i => ({
          id:       i.item_id,
          name:     i.name,
          qty:      Number(i.quantity),
          unitEuros: parseFloat(i.unit_price),
          volume:   i.volume   || null,
          fragrance: i.fragrance || null,
          weightG:  i.weight_grams || null,
        })),
      }, '📦 ORDER_SNAPSHOT — toutes les infos pour recréer la commande si nécessaire');

      res.json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (stripeError) {
      console.error(`[PAYMENT-INTENT] Erreur Stripe userId=${userId}:`, stripeError);
      return res.status(500).json({
        error: 'Erreur serveur',
        detail: `Erreur lors de la création de l'intention de paiement: ${stripeError.message}`
      });
    }
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: 'Erreur', detail: error.message });
    }
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la création de l\'intention de paiement'
    });
  }
});

/**
 * POST /api/payment/confirm-payment
 * Confirme un paiement
 */
router.post('/confirm-payment', async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentIntentId } = req.body;
    console.log(`[PAYMENT-CONFIRM] Début confirmation userId=${userId}, pi=${paymentIntentId || 'missing'}`);

    if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
      console.warn(`[PAYMENT-CONFIRM] paymentIntentId invalide userId=${userId}, value=${paymentIntentId || 'missing'}`);
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Format de payment_intent invalide'
      });
    }

    try {
      const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
      console.log(`[PAYMENT-CONFIRM] PaymentIntent récupéré userId=${userId}, pi=${paymentIntentId}, status=${paymentIntent.status}`);

      if (paymentIntent.metadata.userId !== userId.toString()) {
        console.warn(`[PAYMENT-CONFIRM] Non autorisé userId=${userId}, pi.userId=${paymentIntent.metadata.userId || 'missing'}`);
        return res.status(403).json({
          error: 'Non autorisé',
          detail: 'Non autorisé'
        });
      }

      res.json({
        status: paymentIntent.status
      });
    } catch (stripeError) {
      console.error(`[PAYMENT-CONFIRM] Erreur Stripe userId=${userId}, pi=${paymentIntentId}:`, stripeError);
      return res.status(500).json({
        error: 'Erreur serveur',
        detail: `Erreur lors de la confirmation du paiement: ${stripeError.message}`
      });
    }
  } catch (error) {
    console.error('[PAYMENT-CONFIRM] Erreur lors de la confirmation:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la confirmation du paiement'
    });
  }
});

/**
 * GET /api/payment/get-payment-status
 * Récupère le statut d'un paiement
 */
router.get('/get-payment-status', async (req, res) => {
  try {
    const { payment_intent } = req.query;
    console.log(`[PAYMENT-STATUS] Vérification statut pi=${payment_intent || 'missing'}`);

    if (!payment_intent || !payment_intent.startsWith('pi_')) {
      console.warn(`[PAYMENT-STATUS] payment_intent invalide value=${payment_intent || 'missing'}`);
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Format de payment_intent invalide'
      });
    }

    try {
      const paymentIntent = await getStripe().paymentIntents.retrieve(payment_intent);
      console.log(`[PAYMENT-STATUS] Statut récupéré pi=${payment_intent}, status=${paymentIntent.status}`);
      res.json({
        status: paymentIntent.status
      });
    } catch (stripeError) {
      console.error(`[PAYMENT-STATUS] Erreur Stripe pi=${payment_intent}:`, stripeError);
      return res.status(500).json({
        error: 'Erreur serveur',
        detail: stripeError.message
      });
    }
  } catch (error) {
    console.error('[PAYMENT-STATUS] Erreur lors de la récupération du statut:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la récupération du statut'
    });
  }
});

/**
 * POST /api/payment/save-shipping
 * Sauvegarde l'adresse en DB + met à jour les metadata Stripe avant confirmPayment.
 * Appelé par le frontend juste avant stripe.confirmPayment().
 */
router.post('/save-shipping', async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentIntentId, shippingInfo, shippingCost, pickupLocation } = req.body;

    console.log(`[SAVE-SHIPPING] Début userId=${userId}, pi=${paymentIntentId || 'missing'}`);

    if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
      return res.status(400).json({ error: 'Erreur', detail: 'paymentIntentId invalide' });
    }

    const sanitize = (str, max = 255) =>
      str && typeof str === 'string' ? str.trim().substring(0, max) : '';

    // L'adresse n'est plus sauvegardée automatiquement ici (évitait des doublons dans la
    // table addresses). La sauvegarde se fait à la demande via checkout/init (case à cocher).

    // --- Mise à jour metadata Stripe ---
    try {
      const stripeInstance = getStripe();
      const metadata = { userId: userId.toString() };

      if (shippingInfo) {
        metadata.firstName  = sanitize(shippingInfo.firstName, 100);
        metadata.lastName   = sanitize(shippingInfo.lastName, 100);
        metadata.email      = sanitize(shippingInfo.email);
        metadata.phone      = sanitize(shippingInfo.phone, 20);
        metadata.address    = sanitize(shippingInfo.address, 500);
        metadata.city       = sanitize(shippingInfo.city, 100);
        metadata.postalCode = sanitize(shippingInfo.postalCode, 10);
        metadata.country    = sanitize(shippingInfo.country, 100) || 'France';
      }
      if (shippingCost != null) metadata.shippingCost = shippingCost.toString();
      if (pickupLocation === 'Arnas' || pickupLocation === 'Mezeria') {
        metadata.pickupLocation = pickupLocation;
      }

      await stripeInstance.paymentIntents.update(paymentIntentId, { metadata });
      console.log(`[SAVE-SHIPPING] ✅ Metadata Stripe mis à jour userId=${userId}, pi=${paymentIntentId}`);
    } catch (stripeErr) {
      console.error(`[SAVE-SHIPPING] ⚠️ Erreur update Stripe metadata userId=${userId}:`, stripeErr.message);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[SAVE-SHIPPING] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur', detail: error.message });
  }
});

/**
 * POST /api/payment/create-order
 * Vérifie le paiement Stripe puis crée la commande en DB.
 * Appelé par OrderConfirmation après redirection Stripe réussie.
 * Remplace le webhook comme mécanisme principal de création de commande.
 */
router.post('/create-order', async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentIntentId } = req.body;

    console.log(`[CREATE-ORDER] Début userId=${userId}, pi=${paymentIntentId || 'missing'}`);

    if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
      return res.status(400).json({ error: 'Erreur', detail: 'paymentIntentId invalide' });
    }

    // Vérification doublon
    const existing = await query(
      'SELECT id, status FROM orders WHERE payment_intent_id = ?',
      [paymentIntentId]
    );
    if (existing && existing.length > 0) {
      console.log(`[CREATE-ORDER] Commande déjà existante orderId=${existing[0].id}, pi=${paymentIntentId}`);
      return res.json({ success: true, orderId: existing[0].id, alreadyExists: true });
    }

    // Vérification paiement via Stripe API
    const stripeInstance = getStripe();
    const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);

    console.log(`[CREATE-ORDER] Stripe status=${paymentIntent.status}, pi_userId=${paymentIntent.metadata?.userId}`);

    if (paymentIntent.metadata?.userId !== userId.toString()) {
      console.warn(`[CREATE-ORDER] Non autorisé userId=${userId}, pi_userId=${paymentIntent.metadata?.userId}`);
      return res.status(403).json({ error: 'Non autorisé' });
    }

    if (paymentIntent.status !== 'succeeded') {
      console.warn(`[CREATE-ORDER] Paiement non confirmé status=${paymentIntent.status}, pi=${paymentIntentId}`);
      return res.status(400).json({ error: 'Paiement non confirmé', status: paymentIntent.status });
    }

    // Récupération du panier
    const carts = await query('SELECT id FROM carts WHERE user_id = ?', [userId]);
    if (!carts || carts.length === 0) {
      console.error(`[CREATE-ORDER] Panier introuvable userId=${userId}`);
      return res.status(400).json({ error: 'Panier introuvable' });
    }

    // Récupérer les articles avec les vrais prix depuis la table products (anti-fraude).
    // COALESCE(NULLIF(ci.image,''), p.image) : récupère l'image depuis products si
    // le panier ne l'a pas stockée (images base64 strippées côté frontend pour éviter 413).
    const cartItems = await query(
      `SELECT ci.item_id, ci.name, COALESCE(p.price, ci.price) as price,
              ci.quantity, COALESCE(NULLIF(ci.image, ''), p.image) as image,
              ci.volume, ci.fragrance, ci.weight_grams
       FROM cart_items ci
       LEFT JOIN products p ON p.id = ci.item_id
       WHERE ci.cart_id = ?`,
      [carts[0].id]
    );
    if (!cartItems || cartItems.length === 0) {
      console.error(`[CREATE-ORDER] Panier vide userId=${userId}, cartId=${carts[0].id}`);
      return res.status(400).json({ error: 'Panier vide' });
    }

    console.log(`[CREATE-ORDER] ${cartItems.length} article(s) userId=${userId}`);

    const totalAmount   = paymentIntent.amount / 100;
    const shippingCost  = parseFloat(paymentIntent.metadata?.shippingCost || '0');
    const pickupLocation = paymentIntent.metadata?.pickupLocation || null;

    const shippingAddress = {
      firstName:      paymentIntent.metadata?.firstName    || '',
      lastName:       paymentIntent.metadata?.lastName     || '',
      email:          paymentIntent.metadata?.email        || '',
      phone:          paymentIntent.metadata?.phone        || '',
      address: (pickupLocation === 'Arnas' || pickupLocation === 'Mezeria')
        ? `Retrait sur place - ${pickupLocation}`
        : (paymentIntent.metadata?.address || ''),
      city:           paymentIntent.metadata?.city         || '',
      postalCode:     paymentIntent.metadata?.postalCode   || '',
      country:        paymentIntent.metadata?.country      || 'France',
      ...(pickupLocation && { pickupLocation })
    };

    let orderId;
    await transaction(async (conn) => {
      const orderResult = await conn.query(
        `INSERT INTO orders (user_id, payment_intent_id, total_amount, shipping_cost, shipping_address,
                            status, payment_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'paid', 'succeeded', NOW(), NOW())`,
        [userId, paymentIntentId, totalAmount, shippingCost, JSON.stringify(shippingAddress)]
      );
      orderId = orderResult.insertId;

      for (const item of cartItems) {
        // Ne jamais stocker de base64 dans order_items.image (colonne trop petite,
        // et inutile — l'admin récupère l'image depuis products via product_id).
        // '' plutôt que null : la colonne order_items.image est NOT NULL.
        // Le COALESCE(NULLIF(oi.image,''), p.image) dans admin/orders récupère
        // l'image depuis la table products si oi.image est vide.
        const imageForDb = (item.image && !item.image.startsWith('data:')) ? item.image : '';
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, name, price, quantity, image, volume, fragrance, weight_grams)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.item_id || null, item.name, parseFloat(item.price),
           Number(item.quantity), imageForDb,
           item.volume || null, item.fragrance || null, item.weight_grams || 100]
        );
        // Décrément du stock (uniquement pour les articles liés à un produit existant).
        // L'idempotence est garantie par la contrainte UNIQUE sur payment_intent_id :
        // si le webhook a déjà créé la commande, l'INSERT plus haut a échoué et on n'arrive pas ici.
        if (item.item_id) {
          await conn.query(
            'UPDATE products SET stock = stock - ?, updated_at = NOW() WHERE id = ?',
            [Number(item.quantity), Number(item.item_id)]
          );
        }
      }

      await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [carts[0].id]);
    });
    console.log(`📦 [CREATE-ORDER] Stock décrémenté pour ${cartItems.length} article(s) orderId=${orderId}`);

    console.log(`✅ [CREATE-ORDER] Commande créée orderId=${orderId}, userId=${userId}, pi=${paymentIntentId}`);

    // Envoi emails de confirmation
    try {
      const users = await query(
        'SELECT first_name, last_name, email, phone FROM users WHERE id = ?',
        [userId]
      );
      if (users && users.length > 0) {
        const user = users[0];
        await sendOrderConfirmationEmail(user.email, {
          firstName: user.first_name,
          lastName:  user.last_name,
          orderNumber: paymentIntentId,
          orderDate:   new Date().toISOString(),
          items: cartItems.map(i => ({ name: i.name, price: parseFloat(i.price), quantity: i.quantity, image: i.image })),
          totalAmount,
          shippingCost,
          shippingAddress
        });
        await sendNewOrderNotificationEmail({
          orderNumber:   paymentIntentId,
          customerName:  `${user.first_name} ${user.last_name}`,
          customerEmail: user.email,
          customerPhone: user.phone,
          items: cartItems.map(i => ({ name: i.name, price: parseFloat(i.price), quantity: i.quantity })),
          totalAmount,
          shippingCost,
          shippingAddress,
          paymentMethod: 'Stripe'
        });
        console.log(`📧 [CREATE-ORDER] Emails envoyés userId=${userId}, orderId=${orderId}`);
      }
    } catch (emailErr) {
      console.error(`[CREATE-ORDER] ⚠️ Erreur envoi emails orderId=${orderId}:`, emailErr.message);
    }

    res.json({ success: true, orderId });
  } catch (error) {
    // Doublon UNIQUE sur payment_intent_id : le webhook a déjà traité ce paiement
    if (error.errno === 1062 || error.code === 'ER_DUP_ENTRY') {
      console.log(`⚠️  [CREATE-ORDER] Doublon ignoré (webhook plus rapide) pi=${req.body?.paymentIntentId}`);
      try {
        const existing = await query(
          'SELECT id FROM orders WHERE payment_intent_id = ?',
          [req.body?.paymentIntentId]
        );
        if (existing && existing.length > 0) {
          return res.json({ success: true, orderId: existing[0].id, alreadyExists: true });
        }
      } catch {}
    }
    console.error('[CREATE-ORDER] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur', detail: error.message });
  }
});

/**
 * POST /api/payment/record-failed
 * Enregistre un paiement échoué en DB pour suivi dans l'admin panel.
 * Appelé par OrderConfirmation quand redirect_status !== 'succeeded'.
 */
router.post('/record-failed', async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
      return res.status(400).json({ error: 'paymentIntentId invalide' });
    }

    console.log(`[RECORD-FAILED] Début userId=${userId}, pi=${paymentIntentId}`);

    // Déjà enregistré ?
    const existing = await query(
      'SELECT id FROM orders WHERE payment_intent_id = ?',
      [paymentIntentId]
    );
    if (existing && existing.length > 0) {
      return res.json({ success: true, orderId: existing[0].id, alreadyExists: true });
    }

    // Récupérer les infos depuis Stripe
    const stripeInstance = getStripe();
    const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);

    // Vérifier que le PI appartient bien à cet utilisateur
    if (paymentIntent.metadata?.userId !== userId.toString()) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Ne pas écraser un paiement réussi
    if (paymentIntent.status === 'succeeded') {
      return res.status(400).json({ error: 'Ce paiement a réussi — utiliser create-order' });
    }

    const meta = paymentIntent.metadata || {};
    const shippingAddress = {
      firstName:    meta.firstName   || '',
      lastName:     meta.lastName    || '',
      email:        meta.email       || '',
      phone:        meta.phone       || '',
      address:      meta.address     || '',
      city:         meta.city        || '',
      postalCode:   meta.postalCode  || '',
      country:      meta.country     || 'France',
      pickupLocation: meta.pickupLocation || null,
    };
    const shippingCost = parseFloat(meta.shippingCost || 0);

    // Récupérer les articles du panier (encore en DB si clearCart = React only)
    const carts = await query('SELECT id FROM carts WHERE user_id = ?', [userId]);
    let cartItems = [];
    if (carts && carts.length > 0) {
      cartItems = await query(
        `SELECT ci.item_id, ci.name, COALESCE(p.price, ci.price) as price,
                ci.quantity, COALESCE(NULLIF(ci.image, ''), p.image) as image,
                ci.volume, ci.fragrance, ci.weight_grams
         FROM cart_items ci
         LEFT JOIN products p ON p.id = ci.item_id
         WHERE ci.cart_id = ?`,
        [carts[0].id]
      );
    }

    const totalAmount = (paymentIntent.amount / 100).toFixed(2);

    let orderId;
    await transaction(async (conn) => {
      const result = await conn.query(
        `INSERT INTO orders (user_id, payment_intent_id, total_amount, shipping_cost, shipping_address,
                            status, payment_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'failed', 'failed', NOW(), NOW())`,
        [userId, paymentIntentId, totalAmount, shippingCost.toFixed(2), JSON.stringify(shippingAddress)]
      );
      orderId = Number(result.insertId);

      for (const item of cartItems) {
        // '' plutôt que null : la colonne order_items.image est NOT NULL.
        // Le COALESCE(NULLIF(oi.image,''), p.image) dans admin/orders récupère
        // l'image depuis la table products si oi.image est vide.
        const imageForDb = (item.image && !item.image.startsWith('data:')) ? item.image : '';
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, name, price, quantity, image, volume, fragrance, weight_grams)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.item_id || null, item.name,
           parseFloat(item.price).toFixed(2), Number(item.quantity),
           imageForDb, item.volume || null, item.fragrance || null, item.weight_grams || null]
        );
      }
    });

    console.log(`[RECORD-FAILED] ⚠️ Paiement échoué enregistré orderId=${orderId}, pi=${paymentIntentId}, status=${paymentIntent.status}`);

    res.json({ success: true, orderId });
  } catch (error) {
    console.error('[RECORD-FAILED] Erreur:', error.message);
    res.status(500).json({ error: 'Erreur serveur', detail: error.message });
  }
});

/**
 * GET /api/payment/checkout/resume
 * Reprise de checkout :
 *  - si une commande PENDING existe ET correspond exactement au panier actuel
 *    (mêmes articles + même sous-total) ET que son PaymentIntent est encore payable,
 *    retourne { pendingOrder: { clientSecret, orderId, amount } } pour sauter à l'étape 2.
 *  - retourne toujours l'adresse sauvegardée de l'utilisateur (pré-remplissage du formulaire).
 */
router.get('/checkout/resume', async (req, res) => {
  try {
    const userId = req.user.id;

    // --- Panier actuel ---
    const cartRows = await query('SELECT id FROM carts WHERE user_id = ?', [userId]);
    let cartItems = [];
    if (cartRows && cartRows.length > 0) {
      cartItems = await query(
        `SELECT ci.item_id, ci.quantity, COALESCE(p.price, ci.price) AS unit_price
         FROM cart_items ci
         LEFT JOIN products p ON p.id = ci.item_id
         WHERE ci.cart_id = ?`,
        [cartRows[0].id]
      );
    }

    // --- Commande PENDING la plus récente ---
    let pendingOrder = null;
    let pendingAddress = null; // adresse de la commande en cours (pour le retour arrière)
    if (cartItems.length > 0) {
      const pendingRows = await query(
        `SELECT id, payment_intent_id, total_amount, shipping_cost, shipping_address
         FROM orders WHERE user_id = ? AND status = 'pending'
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      if (pendingRows && pendingRows.length > 0) {
        const pending = pendingRows[0];
        const orderItems = await query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
          [pending.id]
        );

        // Empreinte articles (productId + quantité), insensible à l'ordre
        const fingerprint = (arr, idKey) => arr
          .map(i => `${i[idKey] == null ? 'null' : i[idKey]}:${Number(i.quantity)}`)
          .sort()
          .join('|');
        const sameItems = fingerprint(cartItems, 'item_id') === fingerprint(orderItems, 'product_id');

        // Comparaison du sous-total (protège contre un changement de prix produit)
        const cartSubtotalCents = cartItems.reduce((sum, i) =>
          sum + Math.round(parseFloat(i.unit_price) * 100) * Number(i.quantity), 0);
        const orderSubtotalCents =
          Math.round(parseFloat(pending.total_amount) * 100) -
          Math.round(parseFloat(pending.shipping_cost || 0) * 100);

        if (sameItems && cartSubtotalCents === orderSubtotalCents
            && pending.payment_intent_id?.startsWith('pi_')) {
          try {
            const pi = await getStripe().paymentIntents.retrieve(pending.payment_intent_id);
            const resumable = ['requires_payment_method', 'requires_confirmation', 'requires_action']
              .includes(pi.status);
            // Sécurité : le PaymentIntent doit bien appartenir à cet utilisateur
            if (resumable && pi.metadata?.userId === String(userId) && pi.client_secret) {
              pendingOrder = {
                clientSecret: pi.client_secret,
                orderId: Number(pending.id),
                amount: parseFloat(pending.total_amount),
              };
              // Adresse exacte de cette commande PENDING — sert au retour arrière
              // (étape 2 → étape 1), pour ne PAS afficher une autre adresse.
              try {
                const sa = typeof pending.shipping_address === 'string'
                  ? JSON.parse(pending.shipping_address)
                  : pending.shipping_address;
                if (sa && !sa.pickupLocation && sa.address) {
                  pendingAddress = {
                    firstName:  sa.firstName || '',
                    lastName:   sa.lastName || '',
                    phone:      sa.phone || '',
                    address:    sa.address || '',
                    city:       sa.city || '',
                    postalCode: sa.postalCode || '',
                    country:    sa.country || 'France',
                  };
                }
              } catch (_) { /* shipping_address illisible — ignoré */ }
            }
          } catch (piErr) {
            console.error('[CHECKOUT-RESUME] ⚠️ Erreur retrieve PI:', piErr.message);
          }
        }
      }
    }

    // --- Adresse de pré-remplissage ---
    // Priorité 1 : l'adresse de la commande PENDING en cours (retour arrière fiable).
    // Priorité 2 : une adresse explicitement sauvegardée par l'utilisateur (is_default = 1).
    //   → On ignore volontairement les anciennes lignes is_default = 0 (doublons hérités
    //     de l'ancien enregistrement automatique, souvent mal parsées).
    let savedAddress = pendingAddress;
    if (!savedAddress) {
      try {
        const addrRows = await query(
          `SELECT first_name, last_name, phone, address, city, postal_code, country
           FROM addresses WHERE user_id = ? AND is_default = 1
           ORDER BY updated_at DESC, created_at DESC LIMIT 1`,
          [userId]
        );
        if (addrRows && addrRows.length > 0) {
          const a = addrRows[0];
          savedAddress = {
            firstName:  a.first_name || '',
            lastName:   a.last_name || '',
            phone:      a.phone || '',
            address:    a.address || '',
            city:       a.city || '',
            postalCode: a.postal_code || '',
            country:    a.country || 'France',
          };
        }
      } catch (addrErr) {
        console.error('[CHECKOUT-RESUME] ⚠️ Erreur lecture adresse:', addrErr.message);
      }
    }

    res.json({ pendingOrder, savedAddress });
  } catch (error) {
    console.error('[CHECKOUT-RESUME] Erreur:', error.message);
    res.status(500).json({ error: 'Erreur serveur', detail: 'Erreur lors de la reprise du checkout' });
  }
});

/**
 * POST /api/payment/checkout/init
 * Checkout 2 étapes — Étape 1.
 * Valide le panier (SELECT FOR UPDATE), crée une commande PENDING avec les articles,
 * crée le PaymentIntent Stripe, retourne { clientSecret, orderId }.
 */
router.post('/checkout/init', async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingInfo, pickupLocation, shippingCost: clientShippingCost, saveAddress } = req.body;

    console.log(`[CHECKOUT-INIT] Début userId=${userId}, pickup=${pickupLocation || 'none'}`);

    // Valider le lieu de retrait
    if (pickupLocation && !['Arnas', 'Mezeria'].includes(pickupLocation)) {
      return res.status(400).json({ error: 'Lieu de retrait invalide' });
    }

    const sanitize = (str, max = 255) =>
      str && typeof str === 'string' ? str.trim().substring(0, max) : '';

    // Valider les champs de livraison
    if (!pickupLocation) {
      if (!shippingInfo) {
        return res.status(400).json({ error: 'Informations de livraison requises' });
      }
      for (const field of ['firstName', 'lastName', 'email', 'phone', 'address']) {
        if (!shippingInfo[field]?.toString().trim()) {
          return res.status(400).json({ error: `Champ requis manquant : ${field}` });
        }
      }
    }

    // Annuler les commandes PENDING existantes de cet utilisateur (retours arrière, abandons)
    try {
      const staleOrders = await query(
        "SELECT id, payment_intent_id FROM orders WHERE user_id = ? AND status = 'pending'",
        [userId]
      );
      for (const stale of staleOrders || []) {
        await query("UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = ?", [stale.id]);
        if (stale.payment_intent_id?.startsWith('pi_')) {
          try {
            await getStripe().paymentIntents.cancel(stale.payment_intent_id);
          } catch (_) { /* PI peut déjà être annulé */ }
        }
        console.log(`[CHECKOUT-INIT] 🗑 Stale PENDING annulé orderId=${stale.id}`);
      }
    } catch (cleanErr) {
      console.error(`[CHECKOUT-INIT] ⚠️ Erreur nettoyage stale orders:`, cleanErr.message);
    }

    // Valider le panier avec verrou anti-TOCTOU
    let cartId, cartItems;
    await transaction(async (conn) => {
      const cartRows = await conn.query(
        'SELECT id FROM carts WHERE user_id = ? FOR UPDATE',
        [userId]
      );
      if (!cartRows || cartRows.length === 0) {
        throw Object.assign(new Error('Panier vide'), { statusCode: 400 });
      }
      cartId = cartRows[0].id;

      const items = await conn.query(
        `SELECT ci.item_id, ci.name, ci.quantity,
                COALESCE(p.price, ci.price) as unit_price,
                COALESCE(NULLIF(ci.image, ''), p.image) as image,
                ci.volume, ci.fragrance, ci.weight_grams
         FROM cart_items ci
         LEFT JOIN products p ON p.id = ci.item_id
         WHERE ci.cart_id = ?`,
        [cartId]
      );
      if (!items || items.length === 0) {
        throw Object.assign(new Error('Panier vide'), { statusCode: 400 });
      }
      cartItems = items;
    });

    // Calcul des montants côté serveur
    const subtotalCents = cartItems.reduce((sum, item) =>
      sum + Math.round(parseFloat(item.unit_price) * 100) * Number(item.quantity), 0
    );
    // Frais de port : fournis par le client (calcul distance/poids côté frontend),
    // plafonnés à 50 € comme garde-fou anti-abus.
    const shippingEuros = pickupLocation
      ? 0
      : Math.min(50, Math.max(0, parseFloat(clientShippingCost) || 0));
    const shippingCents = Math.round(shippingEuros * 100);
    const totalCents = subtotalCents + shippingCents;

    if (totalCents <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }

    // Construire les metadata Stripe et l'adresse de livraison
    const stripeMetadata = {
      userId: userId.toString(),
      ...(pickupLocation && { pickupLocation }),
      ...(!pickupLocation && shippingInfo && {
        firstName:  sanitize(shippingInfo.firstName, 100),
        lastName:   sanitize(shippingInfo.lastName, 100),
        email:      sanitize(shippingInfo.email),
        phone:      sanitize(shippingInfo.phone, 20),
        address:    sanitize(shippingInfo.address, 500),
        city:       sanitize(shippingInfo.city, 100),
        postalCode: sanitize(shippingInfo.postalCode, 10),
        country:    sanitize(shippingInfo.country, 100) || 'France',
      }),
      ...(shippingCents > 0 && { shippingCost: shippingEuros.toFixed(2) }),
    };

    const shippingAddress = pickupLocation
      ? { address: `Retrait sur place - ${pickupLocation}`, pickupLocation }
      : {
          firstName: sanitize(shippingInfo.firstName, 100),
          lastName:  sanitize(shippingInfo.lastName, 100),
          email:     sanitize(shippingInfo.email),
          phone:     sanitize(shippingInfo.phone, 20),
          address:   sanitize(shippingInfo.address, 500),
          city:      sanitize(shippingInfo.city, 100),
          postalCode: sanitize(shippingInfo.postalCode, 10),
          country:   sanitize(shippingInfo.country, 100) || 'France',
        };

    // Créer le PaymentIntent Stripe
    const stripeInstance = getStripe();
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: totalCents,
      currency: 'eur',
      metadata: stripeMetadata,
      automatic_payment_methods: { enabled: true, allow_redirects: 'always' },
    });

    // Créer la commande PENDING + les order_items en DB
    let orderId;
    await transaction(async (conn) => {
      const orderResult = await conn.query(
        `INSERT INTO orders (user_id, payment_intent_id, total_amount, shipping_cost, shipping_address,
                            status, payment_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', 'pending', NOW(), NOW())`,
        [userId, paymentIntent.id, (totalCents / 100).toFixed(2),
         shippingEuros.toFixed(2), JSON.stringify(shippingAddress)]
      );
      orderId = Number(orderResult.insertId);

      for (const item of cartItems) {
        const imageForDb = (item.image && !item.image.startsWith('data:')) ? item.image : '';
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, name, price, quantity, image, volume, fragrance, weight_grams)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.item_id || null, item.name, parseFloat(item.unit_price),
           Number(item.quantity), imageForDb,
           item.volume || null, item.fragrance || null, item.weight_grams || 100]
        );
      }
    });

    // Mettre à jour les metadata Stripe avec l'orderId (best effort)
    try {
      await stripeInstance.paymentIntents.update(paymentIntent.id, {
        metadata: { ...stripeMetadata, orderId: orderId.toString() }
      });
    } catch (metaErr) {
      console.error(`[CHECKOUT-INIT] ⚠️ Erreur update metadata Stripe:`, metaErr.message);
    }

    // Sauvegarder l'adresse uniquement si l'utilisateur l'a explicitement demandé
    // (case « sauvegarder mon adresse » cochée). Upsert dédoublonné — non-bloquant.
    if (saveAddress === true && !pickupLocation && shippingInfo) {
      saveDefaultAddress(userId, shippingInfo)
        .then(() => console.log(`[CHECKOUT-INIT] 📍 Adresse sauvegardée userId=${userId}`))
        .catch(err => console.error(`[CHECKOUT-INIT] ⚠️ Erreur save address:`, err.message));
    }

    // Snapshot de sécurité
    logger.info({
      event: 'ORDER_SNAPSHOT',
      pi: paymentIntent.id,
      orderId,
      userId,
      amountCents: totalCents,
      shippingCostEuros: shippingEuros,
      pickupLocation: pickupLocation || null,
      items: cartItems.map(i => ({
        id: i.item_id, name: i.name, qty: Number(i.quantity),
        unitEuros: parseFloat(i.unit_price),
        volume: i.volume || null, fragrance: i.fragrance || null,
      })),
    }, '📦 ORDER_SNAPSHOT (checkout/init)');

    console.log(`✅ [CHECKOUT-INIT] orderId=${orderId}, pi=${paymentIntent.id}, total=${totalCents}cts, userId=${userId}`);
    res.json({ clientSecret: paymentIntent.client_secret, orderId, amount: totalCents / 100 });

  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: 'Erreur', detail: error.message });
    }
    console.error('[CHECKOUT-INIT] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur', detail: error.message });
  }
});

/**
 * POST /api/payment/confirm-order
 * Checkout 2 étapes — Étape 2.
 * Après redirection Stripe réussie, confirme la commande PENDING → PAID.
 * Idempotent : plusieurs appels sont sûrs (WHERE status='pending' évite le double-traitement).
 */
router.post('/confirm-order', async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentIntentId } = req.body;

    console.log(`[CONFIRM-ORDER] Début userId=${userId}, pi=${paymentIntentId || 'missing'}`);

    if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
      return res.status(400).json({ error: 'paymentIntentId invalide' });
    }

    // Récupérer la commande en DB
    const orders = await query(
      'SELECT id, status, payment_status, user_id, shipping_address FROM orders WHERE payment_intent_id = ?',
      [paymentIntentId]
    );
    if (!orders || orders.length === 0) {
      console.warn(`[CONFIRM-ORDER] Commande introuvable pi=${paymentIntentId} — fallback vers create-order`);
      return res.status(404).json({ error: 'Commande introuvable', fallback: true });
    }

    const order = orders[0];

    // Vérifier l'ownership
    if (Number(order.user_id) !== userId) {
      console.warn(`[CONFIRM-ORDER] Non autorisé userId=${userId}, order.user_id=${order.user_id}`);
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Idempotence : commande déjà confirmée
    if (order.status.toLowerCase() === 'paid') {
      console.log(`[CONFIRM-ORDER] Déjà confirmé orderId=${order.id}`);
      return res.json({ success: true, orderId: order.id, alreadyConfirmed: true });
    }

    // Vérifier le paiement via Stripe
    const stripeInstance = getStripe();
    const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.metadata?.userId !== userId.toString()) {
      console.warn(`[CONFIRM-ORDER] Mismatch userId Stripe userId=${userId}, pi.userId=${paymentIntent.metadata?.userId}`);
      return res.status(403).json({ error: 'Non autorisé' });
    }

    if (paymentIntent.status !== 'succeeded') {
      console.warn(`[CONFIRM-ORDER] Paiement non réussi status=${paymentIntent.status}, pi=${paymentIntentId}`);
      // Marquer la commande comme échouée si le paiement est définitivement raté
      if (['canceled', 'requires_payment_method'].includes(paymentIntent.status)) {
        await query(
          "UPDATE orders SET status = 'failed', payment_status = 'failed', updated_at = NOW() WHERE id = ? AND status = 'pending'",
          [order.id]
        );
      }
      return res.status(400).json({ error: 'Paiement non confirmé', status: paymentIntent.status });
    }

    // Confirmer la commande : PENDING → PAID + décrément du stock dans la MÊME transaction.
    // Idempotent : grâce au WHERE status='pending', un seul appel passe ; donc le stock
    // n'est décrémenté qu'une seule fois par commande (pas de double-décrément en cas
    // d'appel concurrent webhook + redirect).
    let confirmed = false;
    let decrementedCount = 0;
    await transaction(async (conn) => {
      const upd = await conn.query(
        "UPDATE orders SET status = 'paid', payment_status = 'succeeded', updated_at = NOW() WHERE id = ? AND status = 'pending'",
        [order.id]
      );
      if (upd.affectedRows === 0) return; // déjà traité — on sort sans rien faire
      confirmed = true;

      // Décrément du stock pour chaque article lié à un produit existant
      const items = await conn.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL',
        [order.id]
      );
      for (const it of items || []) {
        await conn.query(
          'UPDATE products SET stock = stock - ?, updated_at = NOW() WHERE id = ?',
          [Number(it.quantity), Number(it.product_id)]
        );
      }
      decrementedCount = items?.length || 0;
    });

    if (!confirmed) {
      // Déjà traité (webhook concurrent ou double-appel) — on n'a rien décrémenté
      console.log(`[CONFIRM-ORDER] Aucune ligne mise à jour (déjà traitée) orderId=${order.id}`);
      return res.json({ success: true, orderId: order.id, alreadyConfirmed: true });
    }
    console.log(`📦 [CONFIRM-ORDER] Stock décrémenté pour ${decrementedCount} produit(s) orderId=${order.id}`);

    // Vider le panier
    try {
      const carts = await query('SELECT id FROM carts WHERE user_id = ?', [userId]);
      if (carts && carts.length > 0) {
        await query('DELETE FROM cart_items WHERE cart_id = ?', [carts[0].id]);
      }
    } catch (cartErr) {
      console.error(`[CONFIRM-ORDER] ⚠️ Erreur vider panier userId=${userId}:`, cartErr.message);
    }

    // Récupérer les items pour l'email
    let orderItems = [];
    try {
      orderItems = await query(
        `SELECT oi.name, COALESCE(p.price, oi.price) as price, oi.quantity,
                COALESCE(NULLIF(oi.image,''), p.image) as image
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`,
        [order.id]
      );
    } catch (itemsErr) {
      console.error(`[CONFIRM-ORDER] ⚠️ Erreur récupération order_items:`, itemsErr.message);
    }

    const totalAmount  = paymentIntent.amount / 100;
    const shippingCost = parseFloat(paymentIntent.metadata?.shippingCost || '0');
    let shippingAddress = {};
    try {
      shippingAddress = JSON.parse(order.shipping_address || '{}');
    } catch (_) {}

    // Envoi emails (non-bloquant)
    query('SELECT first_name, last_name, email, phone FROM users WHERE id = ?', [userId])
      .then(async users => {
        if (!users || users.length === 0) return;
        const user = users[0];
        try {
          await sendOrderConfirmationEmail(user.email, {
            firstName: user.first_name,
            lastName:  user.last_name,
            orderNumber: paymentIntentId,
            orderDate:   new Date().toISOString(),
            items: orderItems.map(i => ({ name: i.name, price: parseFloat(i.price), quantity: i.quantity, image: i.image })),
            totalAmount, shippingCost, shippingAddress
          });
          await sendNewOrderNotificationEmail({
            orderNumber:   paymentIntentId,
            customerName:  `${user.first_name} ${user.last_name}`,
            customerEmail: user.email,
            customerPhone: user.phone,
            items: orderItems.map(i => ({ name: i.name, price: parseFloat(i.price), quantity: i.quantity })),
            totalAmount, shippingCost, shippingAddress,
            paymentMethod: 'Stripe'
          });
          console.log(`📧 [CONFIRM-ORDER] Emails envoyés userId=${userId}, orderId=${order.id}`);
        } catch (emailErr) {
          console.error(`[CONFIRM-ORDER] ⚠️ Erreur envoi emails orderId=${order.id}:`, emailErr.message);
        }
      })
      .catch(err => console.error(`[CONFIRM-ORDER] ⚠️ Erreur récupération user:`, err.message));

    console.log(`✅ [CONFIRM-ORDER] Commande confirmée orderId=${order.id}, userId=${userId}, pi=${paymentIntentId}`);
    res.json({ success: true, orderId: order.id });

  } catch (error) {
    console.error('[CONFIRM-ORDER] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur', detail: error.message });
  }
});

/**
 * Nettoyage des commandes PENDING trop anciennes (> 24h).
 * Lancé toutes les heures au démarrage du serveur.
 */
export const startStalePendingOrdersCleanup = () => {
  const cleanup = async () => {
    try {
      const staleOrders = await query(
        "SELECT id, payment_intent_id FROM orders WHERE status = 'pending' AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)"
      );
      if (!staleOrders || staleOrders.length === 0) return;

      console.log(`[CLEANUP] 🗑 ${staleOrders.length} commande(s) PENDING expirée(s) à annuler`);
      const stripe = getStripe();
      for (const order of staleOrders) {
        try {
          await query("UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = ?", [order.id]);
          if (order.payment_intent_id?.startsWith('pi_')) {
            await stripe.paymentIntents.cancel(order.payment_intent_id).catch(() => {});
          }
          console.log(`[CLEANUP] ✅ Commande annulée orderId=${order.id}`);
        } catch (err) {
          console.error(`[CLEANUP] ⚠️ Erreur annulation orderId=${order.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[CLEANUP] Erreur nettoyage stale orders:', err.message);
    }
  };

  // Première exécution après 5 min, puis toutes les heures
  setTimeout(cleanup, 5 * 60 * 1000);
  setInterval(cleanup, 60 * 60 * 1000);
  console.log('🧹 [CLEANUP] Nettoyage auto des commandes PENDING expirées activé');
};

export default router;
