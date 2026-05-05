import express from 'express';
import { query } from '../config/database.js';
import { verifyToken } from '../middleware/auth.js';
import { handleValidationErrors, body } from '../middleware/validation.js';
import { publicRateLimiter } from '../config/security.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(verifyToken);
router.use(publicRateLimiter);

/**
 * GET /api/user
 * Récupère les informations de l'utilisateur connecté
 */
router.get('/', async (req, res) => {
  try {
    const user = req.user;

    res.json({
      _id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      email: user.email,
      role: user.role || 'user',
      defaultAddress: user.default_address || null,
      createdAt: user.created_at ? new Date(user.created_at).toISOString() : null
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la récupération de l\'utilisateur'
    });
  }
});

/**
 * PUT /api/user
 * Met à jour les informations de l'utilisateur
 */
router.put('/', [
  body('firstName').optional().trim().isLength({ min: 2, max: 100 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 100 }),
  body('phone').optional().trim().matches(/^[0-9]{10}$/),
  body('email').optional().trim().isEmail().normalizeEmail(),
  handleValidationErrors
], async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phone, email } = req.body;

    const updates = [];
    const values = [];

    if (firstName !== undefined) {
      updates.push('first_name = ?');
      values.push(firstName);
    }

    if (lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(lastName);
    }

    if (phone !== undefined) {
      if (!/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({
          error: 'Erreur de validation',
          detail: 'Le numéro de téléphone doit contenir 10 chiffres'
        });
      }
      updates.push('phone = ?');
      values.push(phone);
    }

    if (email !== undefined) {
      // Vérifier si l'email est déjà utilisé par un autre utilisateur
      const existingUsers = await query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email.toLowerCase(), userId]
      );

      if (existingUsers && existingUsers.length > 0) {
        return res.status(400).json({
          error: 'Erreur',
          detail: 'Cet email est déjà utilisé'
        });
      }

      updates.push('email = ?');
      values.push(email.toLowerCase());
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Aucune donnée à mettre à jour'
      });
    }

    updates.push('updated_at = NOW()');
    values.push(userId);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Récupérer l'utilisateur mis à jour
    const users = await query(
      'SELECT id, first_name, last_name, phone, email FROM users WHERE id = ?',
      [userId]
    );

    const updatedUser = users[0];

    res.json({
      message: 'Profil mis à jour',
      user: {
        _id: updatedUser.id,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phone: updatedUser.phone,
        email: updatedUser.email
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la mise à jour de l\'utilisateur'
    });
  }
});

/**
 * DELETE /api/user
 * Supprime le compte de l'utilisateur
 */
router.delete('/', async (req, res) => {
  try {
    const userId = req.user.id;

    await query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({
      message: 'Compte supprimé'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du compte:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la suppression du compte'
    });
  }
});

/**
 * GET /api/user/orders
 * Récupère les commandes de l'utilisateur
 */
router.get('/orders', async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await query(
      `SELECT id, payment_intent_id, total_amount, shipping_cost, shipping_address, 
              status, payment_status, created_at, shipped_at
       FROM orders 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    const result = [];

    for (const order of orders) {
      const orderItems = await query(
        `SELECT name, price, quantity, image, volume, fragrance, weight_grams
         FROM order_items 
         WHERE order_id = ?`,
        [order.id]
      );

      result.push({
        _id: order.id,
        paymentIntentId: order.payment_intent_id,
        items: orderItems.map(item => ({
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          image: item.image,
          volume: item.volume,
          fragrance: item.fragrance,
          weightGrams: item.weight_grams
        })),
        totalAmount: parseFloat(order.total_amount),
        shippingCost: parseFloat(order.shipping_cost),
        shippingAddress: typeof order.shipping_address === 'string' 
          ? JSON.parse(order.shipping_address) 
          : order.shipping_address,
        status: order.status,
        paymentStatus: order.payment_status,
        createdAt: order.created_at ? new Date(order.created_at).toISOString() : null,
        shippedAt: order.shipped_at ? new Date(order.shipped_at).toISOString() : null
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la récupération des commandes'
    });
  }
});

/**
 * POST /api/user/default-address
 * Définit l'adresse par défaut de l'utilisateur
 */
router.post('/default-address', [
  body('address').trim().notEmpty().isLength({ min: 10, max: 1000 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const userId = req.user.id;
    const { address } = req.body;

    if (!address || address.trim().length < 10) {
      return res.status(400).json({
        error: 'Erreur de validation',
        detail: 'Adresse invalide'
      });
    }

    await query(
      'UPDATE users SET default_address = ?, updated_at = NOW() WHERE id = ?',
      [address.trim(), userId]
    );

    res.json({
      message: 'Adresse par défaut enregistrée',
      defaultAddress: address.trim()
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'adresse:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de l\'enregistrement de l\'adresse'
    });
  }
});

export default router;
