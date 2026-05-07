import express from 'express';
import { query, transaction } from '../config/database.js';
import { verifyToken } from '../middleware/auth.js';
import { validateCartItem } from '../middleware/validation.js';
import { publicRateLimiter } from '../config/security.js';

const router = express.Router();

const toSafeNumber = (value) => (typeof value === 'bigint' ? Number(value) : value);

// Toutes les routes nécessitent une authentification
router.use(verifyToken);
router.use(publicRateLimiter);

/**
 * GET /api/cart
 * Récupère le panier de l'utilisateur
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`🛒 [CART-GET] Récupération du panier pour userId=${userId}`);

    // Récupérer ou créer le panier
    let carts = await query(
      'SELECT id, user_id, created_at, updated_at FROM carts WHERE user_id = ?',
      [userId]
    );

    let cart;
    if (!carts || carts.length === 0) {
      console.log(`🛒 [CART-GET] Aucun panier existant, création panier pour userId=${userId}`);
      const result = await query(
        'INSERT INTO carts (user_id, created_at, updated_at) VALUES (?, NOW(), NOW())',
        [userId]
      );
      cart = {
        id: result.insertId,
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date()
      };
    } else {
      cart = carts[0];
    }

    // Récupérer les items du panier.
    // COALESCE(NULLIF(ci.image,''), p.image) : si l'image en base64 n'a pas été
    // envoyée lors de la sauvegarde panier (pour éviter le 413), on la récupère
    // directement depuis la table products.
    const cartItems = await query(
      `SELECT ci.item_id, ci.name, COALESCE(p.price, ci.price) AS price,
              ci.quantity, COALESCE(NULLIF(ci.image, ''), p.image) AS image,
              ci.volume, ci.weight_grams, ci.fragrance
       FROM cart_items ci
       LEFT JOIN products p ON p.id = ci.item_id
       WHERE ci.cart_id = ?`,
      [cart.id]
    );
    console.log(`🛒 [CART-GET] Panier chargé userId=${userId}, cartId=${toSafeNumber(cart.id)}, items=${cartItems.length}`);

    res.json({
      id: toSafeNumber(cart.id),
      user: toSafeNumber(cart.user_id),
      items: cartItems.map(item => ({
        id: toSafeNumber(item.item_id),
        name: item.name,
        price: parseFloat(item.price),
        quantity: toSafeNumber(item.quantity),
        image: item.image,
        volume: item.volume,
        weightGrams: toSafeNumber(item.weight_grams),
        fragrance: item.fragrance
      })),
      createdAt: cart.created_at ? new Date(cart.created_at).toISOString() : null,
      updatedAt: cart.updated_at ? new Date(cart.updated_at).toISOString() : null
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du panier:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la récupération du panier'
    });
  }
});

/**
 * POST /api/cart
 * Met à jour le panier de l'utilisateur
 */
router.post('/', validateCartItem, async (req, res) => {
  try {
    const userId = req.user.id;
    const { items } = req.body;
    console.log(`🛒 [CART-UPDATE] Début mise à jour panier userId=${userId}, itemsReçus=${Array.isArray(items) ? items.length : 0}`);

    await transaction(async (conn) => {
      // Récupérer ou créer le panier
      let carts = await conn.query(
        'SELECT id FROM carts WHERE user_id = ?',
        [userId]
      );

      let cartId;
      if (!carts || carts.length === 0) {
        console.log(`🛒 [CART-UPDATE] Création panier userId=${userId}`);
        const result = await conn.query(
          'INSERT INTO carts (user_id, created_at, updated_at) VALUES (?, NOW(), NOW())',
          [userId]
        );
        cartId = result.insertId;
      } else {
        cartId = carts[0].id;
      }
      console.log(`🛒 [CART-UPDATE] Utilisation cartId=${toSafeNumber(cartId)} pour userId=${userId}`);

      // Supprimer tous les items existants
      await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
      console.log(`🛒 [CART-UPDATE] Anciennes lignes supprimées cartId=${toSafeNumber(cartId)}`);

      // Ajouter les nouveaux items
      for (const item of items) {
        await conn.query(
          `INSERT INTO cart_items (cart_id, item_id, name, price, quantity, image, volume, weight_grams, fragrance)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cartId,
            item.id,
            item.name,
            item.price,
            item.quantity,
            item.image,
            item.volume || null,
            item.weightGrams || 100,
            item.fragrance || null
          ]
        );
      }
      console.log(`🛒 [CART-UPDATE] Nouvelles lignes insérées cartId=${toSafeNumber(cartId)}, items=${items.length}`);

      // Mettre à jour la date de modification du panier
      await conn.query(
        'UPDATE carts SET updated_at = NOW() WHERE id = ?',
        [cartId]
      );
    });

    // Récupérer le panier mis à jour
    const carts = await query(
      'SELECT id, user_id, created_at, updated_at FROM carts WHERE user_id = ?',
      [userId]
    );

    const cart = carts[0];
    const cartItems = await query(
      `SELECT ci.item_id, ci.name, COALESCE(p.price, ci.price) AS price,
              ci.quantity, COALESCE(NULLIF(ci.image, ''), p.image) AS image,
              ci.volume, ci.weight_grams, ci.fragrance
       FROM cart_items ci
       LEFT JOIN products p ON p.id = ci.item_id
       WHERE ci.cart_id = ?`,
      [cart.id]
    );
    console.log(`🛒 [CART-UPDATE] Panier mis à jour userId=${userId}, cartId=${toSafeNumber(cart.id)}, itemsFinal=${cartItems.length}`);

    res.json({
      id: toSafeNumber(cart.id),
      user: toSafeNumber(cart.user_id),
      items: cartItems.map(item => ({
        id: toSafeNumber(item.item_id),
        name: item.name,
        price: parseFloat(item.price),
        quantity: toSafeNumber(item.quantity),
        image: item.image,
        volume: item.volume,
        weightGrams: toSafeNumber(item.weight_grams),
        fragrance: item.fragrance
      })),
      createdAt: cart.created_at ? new Date(cart.created_at).toISOString() : null,
      updatedAt: cart.updated_at ? new Date(cart.updated_at).toISOString() : null
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du panier:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la mise à jour du panier'
    });
  }
});

/**
 * DELETE /api/cart
 * Vide le panier de l'utilisateur
 */
router.delete('/', async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`🛒 [CART-CLEAR] Demande de vidage panier userId=${userId}`);

    const carts = await query(
      'SELECT id FROM carts WHERE user_id = ?',
      [userId]
    );

    if (carts && carts.length > 0) {
      await query(
        'DELETE FROM cart_items WHERE cart_id = ?',
        [carts[0].id]
      );
      console.log(`🛒 [CART-CLEAR] Panier vidé userId=${userId}, cartId=${toSafeNumber(carts[0].id)}`);
    } else {
      console.log(`🛒 [CART-CLEAR] Aucun panier trouvé pour userId=${userId}`);
    }

    res.json({
      message: 'Panier vidé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du vidage du panier:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors du vidage du panier'
    });
  }
});

export default router;
