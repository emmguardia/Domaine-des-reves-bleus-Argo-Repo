import express from 'express';
import { query, transaction } from '../config/database.js';
import { verifyToken } from '../middleware/auth.js';
import { validateCreatePaymentIntent } from '../middleware/validation.js';
import { publicRateLimiter } from '../config/security.js';
import { sendOrderConfirmationEmail, sendNewOrderNotificationEmail } from '../utils/email.js';
import { getStripe } from '../config/stripe.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(verifyToken);
router.use(publicRateLimiter);

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

    // Vérifier que l'utilisateur a un panier avec des items
    const carts = await query(
      'SELECT id FROM carts WHERE user_id = ?',
      [userId]
    );

    if (!carts || carts.length === 0) {
      console.warn(`[PAYMENT-INTENT] Panier absent userId=${userId}`);
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Panier vide'
      });
    }

    // Récupérer les articles avec les vrais prix depuis la table products
    const cartItems = await query(
      `SELECT ci.item_id, ci.quantity, COALESCE(p.price, ci.price) as unit_price
       FROM cart_items ci
       LEFT JOIN products p ON p.id = ci.item_id
       WHERE ci.cart_id = ?`,
      [carts[0].id]
    );

    if (!cartItems || cartItems.length === 0) {
      console.warn(`[PAYMENT-INTENT] Panier vide userId=${userId}, cartId=${carts[0].id}`);
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Panier vide'
      });
    }

    // Valider que le montant envoyé correspond au total réel en DB (anti-fraude)
    const expectedSubtotalCents = cartItems.reduce((sum, item) =>
      sum + Math.round(parseFloat(item.unit_price) * 100) * Number(item.quantity), 0);
    const expectedTotalCents = expectedSubtotalCents + Math.round((shippingCost || 0) * 100);
    if (Math.abs(amount - expectedTotalCents) > 1) {
      console.warn(`[PAYMENT-INTENT] Montant frauduleux userId=${userId}, reçu=${amount}, attendu=${expectedTotalCents}`);
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Le montant ne correspond pas au contenu du panier'
      });
    }
    console.log(`[PAYMENT-INTENT] Panier vérifié userId=${userId}, cartId=${carts[0].id}, items=${cartItems.length}, montant validé=${amount}cents`);

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

    // Sauvegarder l'adresse en DB immédiatement (avant Stripe) — comme ça elle est toujours là même si le paiement échoue
    if (shippingInfo && !pickupLocation) {
      try {
        const existing = await query(
          `SELECT id FROM addresses WHERE user_id = ? AND address = ? AND city = ? AND postal_code = ? LIMIT 1`,
          [userId, shippingInfo.address?.trim() || '', shippingInfo.city?.trim() || '', shippingInfo.postalCode?.trim() || '']
        );
        if (!existing || existing.length === 0) {
          await query(
            `INSERT INTO addresses (user_id, label, first_name, last_name, phone, address, city, postal_code, country, is_default, created_at, updated_at)
             VALUES (?, 'Livraison', ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
            [
              userId,
              shippingInfo.firstName?.trim() || '',
              shippingInfo.lastName?.trim() || '',
              shippingInfo.phone?.trim() || '',
              shippingInfo.address?.trim() || '',
              shippingInfo.city?.trim() || '',
              shippingInfo.postalCode?.trim() || '',
              shippingInfo.country?.trim() || 'France'
            ]
          );
          console.log(`[PAYMENT-INTENT] 📍 Adresse sauvegardée en DB userId=${userId}, city=${shippingInfo.city}`);
        } else {
          console.log(`[PAYMENT-INTENT] 📍 Adresse déjà connue userId=${userId}, id=${existing[0].id}`);
        }
      } catch (addrError) {
        // Non-bloquant : on log mais on ne fait pas rater le paiement pour ça
        console.error(`[PAYMENT-INTENT] ⚠️ Erreur sauvegarde adresse userId=${userId}:`, addrError.message);
      }
    }

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
    console.error('[PAYMENT-INTENT] Erreur lors de la création:', error);
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

    // --- Sauvegarde adresse en DB ---
    if (shippingInfo && !pickupLocation) {
      try {
        const fullAddress = sanitize(shippingInfo.address, 500);

        // Extraction code postal + ville depuis l'adresse complète
        let postalCode = sanitize(shippingInfo.postalCode, 10);
        let city = sanitize(shippingInfo.city, 100);
        if (!postalCode) {
          const m = fullAddress.match(/\b(\d{5})\b/);
          if (m) postalCode = m[1];
        }
        if (!city && postalCode) {
          const afterPostal = fullAddress.split(postalCode)[1] || '';
          city = afterPostal.replace(/^[,\s]+/, '').split(/[,\s]/)[0] || '';
        }

        const existing = await query(
          `SELECT id FROM addresses WHERE user_id = ? AND address = ? LIMIT 1`,
          [userId, fullAddress]
        );
        if (!existing || existing.length === 0) {
          await query(
            `INSERT INTO addresses (user_id, label, first_name, last_name, phone, address, city, postal_code, country, is_default, created_at, updated_at)
             VALUES (?, 'Livraison', ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
            [
              userId,
              sanitize(shippingInfo.firstName, 100),
              sanitize(shippingInfo.lastName, 100),
              sanitize(shippingInfo.phone, 20),
              fullAddress,
              city,
              postalCode,
              sanitize(shippingInfo.country, 100) || 'France'
            ]
          );
          console.log(`[SAVE-SHIPPING] 📍 Adresse sauvegardée userId=${userId}`);
        } else {
          console.log(`[SAVE-SHIPPING] 📍 Adresse déjà connue userId=${userId}`);
        }
      } catch (addrErr) {
        console.error(`[SAVE-SHIPPING] ⚠️ Erreur save address userId=${userId}:`, addrErr.message);
      }
    }

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

    // Récupérer les articles avec les vrais prix depuis la table products (anti-fraude)
    const cartItems = await query(
      `SELECT ci.item_id, ci.name, COALESCE(p.price, ci.price) as price,
              ci.quantity, ci.image, ci.volume, ci.fragrance, ci.weight_grams
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
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, name, price, quantity, image, volume, fragrance, weight_grams)
           VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.name, item.price, item.quantity, item.image,
           item.volume || null, item.fragrance || null, item.weight_grams || 100]
        );
      }

      await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [carts[0].id]);
    });

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

export default router;
