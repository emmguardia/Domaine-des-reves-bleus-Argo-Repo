import express from 'express';
import { query, transaction } from '../config/database.js';
import { verifyAdminToken } from '../middleware/auth.js';
import { verifyPassword } from '../utils/password.js';
import { generateAdminToken } from '../utils/jwt.js';
import { validateProductId, validateCreateProduct, handleValidationErrors, body, param } from '../middleware/validation.js';
import { adminAuthRateLimiter } from '../config/security.js';
import { checkIPBan, recordFailedAttempt, resetFailedAttempts, isIPBanned } from '../middleware/ipBan.js';
import { getStripe } from '../config/stripe.js';
import { sendOrderConfirmationEmail, sendNewOrderNotificationEmail } from '../utils/email.js';
const router = express.Router();

/** MIME types autorisés pour l'upload base64 (comme Clos de la Reine) */
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_BASE64_LENGTH = Math.floor((5 * 1024 * 1024) * 4 / 3) + 100; // ~5 Mo en base64

// Vérifier le ban IP avant toutes les routes admin
router.use(checkIPBan);

/**
 * POST /api/admin/login
 * Connexion admin avec protection renforcée (ban IP après 3 tentatives)
 */
router.post('/login', adminAuthRateLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Nom d\'utilisateur et mot de passe requis'
      });
    }

    // Sanitizer l'input pour éviter les injections
    const sanitizedUsername = String(username).trim().substring(0, 100);

    const admins = await query(
      'SELECT id, username, password FROM admins WHERE username = ?',
      [sanitizedUsername]
    );

    if (!admins || admins.length === 0) {
      // Enregistrer la tentative échouée
      recordFailedAttempt(req);
      console.warn('⚠️  [ADMIN-LOGIN] Tentative de connexion avec username inexistant:', sanitizedUsername);
      return res.status(401).json({
        error: 'Non autorisé',
        detail: 'Identifiants incorrects'
      });
    }

    const admin = admins[0];

    const isPasswordValid = await verifyPassword(password, admin.password);
    if (!isPasswordValid) {
      // Enregistrer la tentative échouée
      recordFailedAttempt(req);
      console.warn('⚠️  [ADMIN-LOGIN] Tentative de connexion avec mot de passe incorrect pour:', sanitizedUsername);
      
      // Vérifier si l'IP est maintenant bannie
      if (isIPBanned(req)) {
        return res.status(403).json({
          error: 'Accès refusé',
          detail: 'Trop de tentatives échouées. Votre IP est temporairement bannie pour 1 heure.'
        });
      }
      
      return res.status(401).json({
        error: 'Non autorisé',
        detail: 'Identifiants incorrects'
      });
    }

    // Connexion réussie : réinitialiser les tentatives échouées
    resetFailedAttempts(req);
    console.log('✅ [ADMIN-LOGIN] Connexion réussie pour:', sanitizedUsername);

    // Mettre à jour la date de dernière connexion
    await query(
      'UPDATE admins SET last_login = NOW() WHERE id = ?',
      [admin.id]
    );

    const token = generateAdminToken(admin.id);

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (error) {
    console.error('❌ [ADMIN-LOGIN] Erreur lors de la connexion admin:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la connexion'
    });
  }
});

// Routes protégées par authentification admin
router.use(verifyAdminToken);

/**
 * POST /api/admin/upload-image
 * Upload d'image produit en base64 (comme Clos de la Reine). Retourne une data URL pour affichage garanti.
 * Body JSON: { image: string (base64), name?: string, mimeType?: 'image/jpeg'|'image/png'|'image/gif'|'image/webp' }
 * Note: si vous stockez des data URL, la colonne products.image doit être en MEDIUMTEXT ou LONGTEXT.
 */
router.post('/upload-image', (req, res) => {
  try {
    const { image, name, mimeType } = req.body || {};
    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Champ "image" (base64) requis.',
      });
    }
    const base64 = image.replace(/^data:image\/\w+;base64,/, '').trim();
    if (!base64 || base64.length > MAX_BASE64_LENGTH) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Image trop volumineuse ou invalide (max 5 Mo).',
      });
    }
    const mime = (mimeType && ALLOWED_MIME.includes(mimeType)) ? mimeType : 'image/jpeg';
    const url = `data:${mime};base64,${base64}`;
    res.status(201).json({ url });
  } catch (err) {
    console.error('Erreur upload image base64:', err);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Impossible de traiter l\'image.',
    });
  }
});

/**
 * GET /api/admin/products
 * Récupère tous les produits (admin)
 */
router.get('/products', async (req, res) => {
  try {
    const products = await query(
      `SELECT id, name, description, price, image, category, stock, weight_grams, volumes, fragrances, 
              rating, is_new, is_placeholder, created_at, updated_at
       FROM products 
       ORDER BY created_at DESC`
    );

    res.json(products.map(product => ({
      id: product.id,
      _id: product.id,
      name: product.name,
      description: product.description,
      price: parseFloat(product.price),
      image: product.image,
      category: product.category,
      stock: product.stock,
      weightGrams: product.weight_grams,
      volumes: typeof product.volumes === 'string' ? JSON.parse(product.volumes) : product.volumes,
      fragrances: typeof product.fragrances === 'string' ? JSON.parse(product.fragrances) : product.fragrances,
      rating: parseFloat(product.rating || 0),
      isNew: product.is_new === 1 || product.is_new === true,
      isPlaceholder: product.is_placeholder === 1 || product.is_placeholder === true,
      createdAt: product.created_at ? new Date(product.created_at).toISOString() : null,
      updatedAt: product.updated_at ? new Date(product.updated_at).toISOString() : null
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la récupération des produits'
    });
  }
});

/**
 * GET /api/admin/products/:product_id
 * Récupère un produit par son ID (admin)
 */
router.get('/products/:product_id', validateProductId, async (req, res) => {
  try {
    const productId = parseInt(req.params.product_id);

    const products = await query(
      `SELECT id, name, description, price, image, category, stock, weight_grams, volumes, fragrances, 
              rating, is_new, is_placeholder, created_at, updated_at
       FROM products 
       WHERE id = ?`,
      [productId]
    );

    if (!products || products.length === 0) {
      return res.status(404).json({
        error: 'Erreur',
        detail: 'Produit non trouvé'
      });
    }

    const product = products[0];
    res.json(product);
  } catch (error) {
    console.error('Erreur lors de la récupération du produit:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la récupération du produit'
    });
  }
});

/**
 * POST /api/admin/products
 * Crée un nouveau produit
 */
router.post('/products', validateCreateProduct, async (req, res) => {
  try {
    const {
      name, description, price, image, category, stock = 0,
      weightGrams = 100, volumes = null, fragrances = null,
      rating = 0.0, isNew = false, isPlaceholder = false
    } = req.body;

    const result = await query(
      `INSERT INTO products (name, description, price, image, category, stock, weight_grams, volumes, fragrances, 
                            rating, is_new, is_placeholder, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        name, description, price, image, category, stock, weightGrams,
        volumes ? JSON.stringify(volumes) : null,
        fragrances ? JSON.stringify(fragrances) : null,
        rating, isNew ? 1 : 0, isPlaceholder ? 1 : 0
      ]
    );

    const newProduct = await query(
      'SELECT * FROM products WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newProduct[0]);
  } catch (error) {
    const msg = error && (error.message || String(error));
    const isDataTooLong = msg && (msg.includes('Data too long') || msg.includes('too long') || error.errno === 1406);
    if (isDataTooLong) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'L\'image est trop volumineuse. Exécutez sur MySQL : ALTER TABLE products MODIFY image MEDIUMTEXT;'
      });
    }
    console.error('Erreur lors de la création du produit:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: error && error.message || 'Erreur lors de la création du produit'
    });
  }
});

/**
 * PUT /api/admin/products/:product_id
 * Met à jour un produit
 */
router.put('/products/:product_id', validateProductId, async (req, res) => {
  try {
    const productId = parseInt(req.params.product_id);
    const {
      name, description, price, image, category, stock,
      weightGrams, volumes, fragrances, rating, isNew, isPlaceholder
    } = req.body;

    // Vérifier que le produit existe
    const existingProducts = await query(
      'SELECT id FROM products WHERE id = ?',
      [productId]
    );

    if (!existingProducts || existingProducts.length === 0) {
      return res.status(404).json({
        error: 'Erreur',
        detail: 'Produit non trouvé'
      });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      values.push(price);
    }
    if (image !== undefined) {
      updates.push('image = ?');
      values.push(image);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (stock !== undefined) {
      updates.push('stock = ?');
      values.push(stock);
    }
    if (weightGrams !== undefined) {
      updates.push('weight_grams = ?');
      values.push(weightGrams);
    }
    if (volumes !== undefined) {
      updates.push('volumes = ?');
      values.push(volumes ? JSON.stringify(volumes) : null);
    }
    if (fragrances !== undefined) {
      updates.push('fragrances = ?');
      values.push(fragrances ? JSON.stringify(fragrances) : null);
    }
    if (rating !== undefined) {
      updates.push('rating = ?');
      values.push(rating);
    }
    if (isNew !== undefined) {
      updates.push('is_new = ?');
      values.push(isNew ? 1 : 0);
    }
    if (isPlaceholder !== undefined) {
      updates.push('is_placeholder = ?');
      values.push(isPlaceholder ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Aucune donnée à mettre à jour'
      });
    }

    updates.push('updated_at = NOW()');
    values.push(productId);

    try {
      await query(
        `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    } catch (updateErr) {
      const msg = updateErr && (updateErr.message || String(updateErr));
      const isDataTooLong = msg && (msg.includes('Data too long') || msg.includes('too long') || updateErr.errno === 1406);
      if (isDataTooLong) {
        return res.status(400).json({
          error: 'Erreur',
          detail: 'L\'image est trop volumineuse pour la base de données. Exécutez sur MySQL : ALTER TABLE products MODIFY image MEDIUMTEXT;'
        });
      }
      throw updateErr;
    }

    const updatedProduct = await query(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    res.json(updatedProduct[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du produit:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: error && (error.message || error.detail) || 'Erreur lors de la mise à jour du produit'
    });
  }
});

/**
 * DELETE /api/admin/products/:product_id
 * Supprime un produit
 */
router.delete('/products/:product_id', validateProductId, async (req, res) => {
  try {
    const productId = parseInt(req.params.product_id);

    const existingProducts = await query(
      'SELECT id FROM products WHERE id = ?',
      [productId]
    );

    if (!existingProducts || existingProducts.length === 0) {
      return res.status(404).json({
        error: 'Erreur',
        detail: 'Produit non trouvé'
      });
    }

    await query('DELETE FROM products WHERE id = ?', [productId]);

    res.json({
      message: 'Produit supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la suppression du produit'
    });
  }
});

/**
 * GET /api/admin/orders
 * Récupère toutes les commandes
 */
router.get('/orders', async (req, res) => {
  try {
    const { status, paymentStatus } = req.query;

    // Par défaut : commandes actives uniquement (paid, preparing, shipped, delivered)
    // 'pending' = non-payée (flow 2 étapes), 'cancelled' = annulée/échouée → dans "Paiement échoué"
    let sql = `SELECT id, user_id, payment_intent_id, total_amount, shipping_cost, shipping_address,
                      status, payment_status, created_at, updated_at, shipped_at
               FROM orders
               WHERE status IN ('paid', 'preparing', 'shipped', 'delivered')
               ORDER BY created_at DESC`;

    const params = [];

    if (status) {
      sql = `SELECT id, user_id, payment_intent_id, total_amount, shipping_cost, shipping_address,
                    status, payment_status, created_at, updated_at, shipped_at
             FROM orders
             WHERE LOWER(status) = LOWER(?)
             ORDER BY created_at DESC`;
      params.push(status);
    }

    if (paymentStatus && String(paymentStatus).toLowerCase() === 'failed') {
      // "Paiement échoué" = pending (jamais payées) + cancelled (annulées) + paiements échoués
      sql = `SELECT id, user_id, payment_intent_id, total_amount, shipping_cost, shipping_address,
                    status, payment_status, created_at, updated_at, shipped_at
             FROM orders
             WHERE status IN ('pending', 'cancelled')
                OR LOWER(payment_status) IN ('failed', 'requires_payment_method', 'canceled')
             ORDER BY created_at DESC`;
    } else if (paymentStatus) {
      sql = `SELECT id, user_id, payment_intent_id, total_amount, shipping_cost, shipping_address,
                    status, payment_status, created_at, updated_at, shipped_at
             FROM orders
             WHERE LOWER(payment_status) = LOWER(?)
             ORDER BY created_at DESC`;
      params.length = 0;
      params.push(paymentStatus);
    }

    const orders = await query(sql, params);

    if (!orders || orders.length === 0) {
      return res.json([]);
    }

    // Un seul JOIN pour récupérer tous les order_items en une requête (anti N+1).
    // COALESCE(NULLIF(oi.image,''), p.image) : récupère l'image depuis products si
    // order_items.image est null/vide (images base64 non stockées en DB → product_id utilisé).
    const orderIds = orders.map(o => o.id);
    const placeholders = orderIds.map(() => '?').join(',');
    const allItems = await query(
      `SELECT oi.id, oi.order_id, oi.product_id, oi.name, oi.price, oi.quantity,
              COALESCE(NULLIF(oi.image, ''), p.image) AS image,
              oi.volume, oi.fragrance, oi.weight_grams
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id IN (${placeholders})
       ORDER BY oi.order_id ASC, oi.id ASC`,
      orderIds
    );

    // Grouper les items par order_id
    const itemsByOrderId = {};
    for (const item of (allItems || [])) {
      if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
      itemsByOrderId[item.order_id].push({
        id: item.id,
        orderId: item.order_id,
        productId: item.product_id,
        name: item.name,
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 0),
        image: item.image || '',
        volume: item.volume || null,
        fragrance: item.fragrance || null,
        weightGrams: Number(item.weight_grams || 0)
      });
    }

    const enrichedOrders = orders.map((order) => ({
      ...order,
      _id: order.id,
      paymentIntentId: order.payment_intent_id || '',
      totalAmount: Number(order.total_amount || 0),
      shippingCost: Number(order.shipping_cost || 0),
      paymentStatus: String(order.payment_status || '').toLowerCase(),
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      shippedAt: order.shipped_at,
      items: itemsByOrderId[order.id] || []
    }));

    res.json(enrichedOrders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la récupération des commandes'
    });
  }
});

/**
 * GET /api/admin/orders/:order_id
 * Récupère une commande par son ID
 */
router.get('/orders/:order_id', [
  param('order_id').isInt({ min: 1 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const orderId = parseInt(req.params.order_id);

    const orders = await query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        error: 'Erreur',
        detail: 'Commande non trouvée'
      });
    }

    res.json(orders[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la récupération de la commande'
    });
  }
});

/**
 * PUT /api/admin/orders/:order_id/status
 * Met à jour le statut d'une commande
 */
router.put('/orders/:order_id/status', [
  param('order_id').isInt({ min: 1 }),
  body('status').isIn(['paid', 'pending', 'preparing', 'shipped', 'delivered', 'cancelled']),
  handleValidationErrors
], async (req, res) => {
  try {
    const orderId = parseInt(req.params.order_id);
    const { status } = req.body;

    const validStatuses = ['paid', 'pending', 'preparing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Statut invalide'
      });
    }

    const existingOrders = await query(
      'SELECT id FROM orders WHERE id = ?',
      [orderId]
    );

    if (!existingOrders || existingOrders.length === 0) {
      return res.status(404).json({
        error: 'Erreur',
        detail: 'Commande non trouvée'
      });
    }

    const updates = ['status = ?', 'updated_at = NOW()'];
    const values = [status];

    if (status === 'shipped') {
      updates.push('shipped_at = NOW()');
    } else {
      updates.push('shipped_at = NULL');
    }

    values.push(orderId);

    await query(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const updatedOrder = await query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    res.json(updatedOrder[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la mise à jour du statut'
    });
  }
});

/**
 * DELETE /api/admin/orders/:order_id
 * Supprime une commande (uniquement les commandes non-payées ou annulées)
 */
router.delete('/orders/:order_id', [
  param('order_id').isInt({ min: 1 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const orderId = parseInt(req.params.order_id);

    const existingOrders = await query(
      'SELECT id, status FROM orders WHERE id = ?',
      [orderId]
    );

    if (!existingOrders || existingOrders.length === 0) {
      return res.status(404).json({
        error: 'Erreur',
        detail: 'Commande non trouvée'
      });
    }

    const order = existingOrders[0];
    const deletableStatuses = ['pending', 'cancelled', 'shipped', 'delivered'];
    if (!deletableStatuses.includes(String(order.status).toLowerCase())) {
      return res.status(400).json({
        error: 'Erreur',
        detail: `Impossible de supprimer une commande avec le statut "${order.status}". Seules les commandes annulées, expédiées ou livrées peuvent être supprimées.`
      });
    }

    // Supprimer les order_items en premier (contrainte FK), puis la commande
    await query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
    await query('DELETE FROM orders WHERE id = ?', [orderId]);

    res.json({ message: 'Commande supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la commande:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la suppression de la commande'
    });
  }
});

/**
 * GET /api/admin/stats
 * Récupère les statistiques générales
 */
router.get('/stats', async (req, res) => {
  try {
    const totalProducts = await query('SELECT COUNT(*) as count FROM products');
    const lowStockProducts = await query(
      'SELECT COUNT(*) as count FROM products WHERE stock <= 5 AND stock > 0'
    );
    const outOfStockProducts = await query(
      'SELECT COUNT(*) as count FROM products WHERE stock = 0'
    );

    const totalOrders = await query('SELECT COUNT(*) as count FROM orders');
    const pendingOrders = await query(
      `SELECT COUNT(*) as count 
       FROM orders 
       WHERE LOWER(status) IN ('pending', 'paid')`
    );
    const preparingOrders = await query(
      `SELECT COUNT(*) as count 
       FROM orders 
       WHERE LOWER(status) = 'preparing'`
    );
    const shippedOrders = await query(
      `SELECT COUNT(*) as count 
       FROM orders 
       WHERE LOWER(status) = 'shipped'`
    );

    const totalRevenueNet = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total 
       FROM orders 
       WHERE LOWER(payment_status) = ?`,
      ['succeeded']
    );
    const totalRevenueGross = await query(
      `SELECT COALESCE(SUM(total_amount + shipping_cost), 0) as total
       FROM orders
       WHERE LOWER(payment_status) = ?`,
      ['succeeded']
    );

    const toNum = (v) => (v != null ? Number(v) : 0);
    res.json({
      products: {
        total: toNum(totalProducts[0]?.count ?? totalProducts[0]?.COUNT),
        lowStock: toNum(lowStockProducts[0]?.count ?? lowStockProducts[0]?.COUNT),
        outOfStock: toNum(outOfStockProducts[0]?.count ?? outOfStockProducts[0]?.COUNT)
      },
      orders: {
        total: toNum(totalOrders[0]?.count ?? totalOrders[0]?.COUNT),
        pending: toNum(pendingOrders[0]?.count ?? pendingOrders[0]?.COUNT),
        preparing: toNum(preparingOrders[0]?.count ?? preparingOrders[0]?.COUNT),
        shipped: toNum(shippedOrders[0]?.count ?? shippedOrders[0]?.COUNT)
      },
      revenue: {
        net: parseFloat(totalRevenueNet[0]?.total || totalRevenueNet[0]?.TOTAL || 0),
        gross: parseFloat(totalRevenueGross[0]?.total || totalRevenueGross[0]?.TOTAL || 0)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la récupération des statistiques'
    });
  }
});

/**
 * GET /api/admin/stats/advanced
 * Statistiques avancées (revenus/commandes)
 */
router.get('/stats/advanced', async (req, res) => {
  try {
    const period = Math.max(3, Math.min(parseInt(req.query.period, 10) || 7, 365));

    const revenueLast7 = await query(
      `SELECT COALESCE(SUM(total_amount + shipping_cost), 0) AS total
       FROM orders
       WHERE LOWER(payment_status) = 'succeeded'
         AND created_at >= NOW() - INTERVAL 7 DAY`
    );
    const revenueLast30 = await query(
      `SELECT COALESCE(SUM(total_amount + shipping_cost), 0) AS total
       FROM orders
       WHERE LOWER(payment_status) = 'succeeded'
         AND created_at >= NOW() - INTERVAL 30 DAY`
    );
    const ordersLast7 = await query(
      `SELECT COUNT(*) AS count
       FROM orders
       WHERE created_at >= NOW() - INTERVAL 7 DAY`
    );
    const ordersLast30 = await query(
      `SELECT COUNT(*) AS count
       FROM orders
       WHERE created_at >= NOW() - INTERVAL 30 DAY`
    );
    const dailyRevenue = await query(
      `SELECT DATE(created_at) AS date,
              COALESCE(SUM(total_amount + shipping_cost), 0) AS revenue
       FROM orders
       WHERE LOWER(payment_status) = 'succeeded'
         AND created_at >= NOW() - INTERVAL ? DAY
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [period]
    );

    res.json({
      revenue: {
        last7Days: Number(revenueLast7?.[0]?.total || 0),
        last30Days: Number(revenueLast30?.[0]?.total || 0),
        daily: (dailyRevenue || []).map((row) => ({
          date: row.date,
          revenue: Number(row.revenue || 0)
        }))
      },
      orders: {
        last7Days: Number(ordersLast7?.[0]?.count || 0),
        last30Days: Number(ordersLast30?.[0]?.count || 0)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques avancées:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la récupération des statistiques avancées'
    });
  }
});

/**
 * GET /api/admin/export/orders
 * Export CSV des commandes
 */
router.get('/export/orders', async (req, res) => {
  try {
    const orders = await query(
      `SELECT id, payment_intent_id, user_id, status, payment_status, total_amount, shipping_cost, created_at
       FROM orders
       ORDER BY created_at DESC`
    );

    const lines = [
      'id,payment_intent_id,user_id,status,payment_status,total_amount,shipping_cost,created_at',
      ...(orders || []).map((o) => [
        o.id,
        `"${String(o.payment_intent_id || '').replace(/"/g, '""')}"`,
        o.user_id,
        o.status,
        o.payment_status,
        Number(o.total_amount || 0).toFixed(2),
        Number(o.shipping_cost || 0).toFixed(2),
        o.created_at
      ].join(','))
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders_export_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(lines.join('\n'));
  } catch (error) {
    console.error('Erreur lors de l\'export CSV des commandes:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de l\'export des commandes'
    });
  }
});

/**
 * GET /api/admin/users
 * Récupère tous les utilisateurs
 */
router.get('/users', async (req, res) => {
  try {
    const users = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.created_at,
              COUNT(o.id) as ordersCount
       FROM users u
       LEFT JOIN orders o ON u.id = o.user_id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );

    res.json(users.map(user => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role || 'user',
      createdAt: user.created_at ? new Date(user.created_at).toISOString() : null,
      ordersCount: parseInt(user.ordersCount || 0)
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la récupération des utilisateurs'
    });
  }
});

/**
 * DELETE /api/admin/users/:user_id
 * Supprime un utilisateur (hors comptes admin)
 */
router.delete('/users/:user_id', [
  param('user_id').isInt({ min: 1 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const userId = parseInt(req.params.user_id, 10);

    const existingUsers = await query(
      'SELECT id, role FROM users WHERE id = ?',
      [userId]
    );

    if (!existingUsers || existingUsers.length === 0) {
      return res.status(404).json({
        error: 'Erreur',
        detail: 'Utilisateur non trouvé'
      });
    }

    const user = existingUsers[0];
    if (user.role === 'admin') {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Suppression d\'un compte administrateur interdite'
      });
    }

    // Si des commandes existent, on bloque pour préserver l'historique
    const userOrders = await query(
      'SELECT COUNT(*) AS count FROM orders WHERE user_id = ?',
      [userId]
    );
    const ordersCount = Number(userOrders?.[0]?.count || 0);
    if (ordersCount > 0) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Impossible de supprimer ce compte: des commandes sont déjà liées à cet utilisateur.'
      });
    }

    // Nettoyage explicite des données liées pour éviter les erreurs FK
    await transaction(async (conn) => {
      const carts = await conn.query(
        'SELECT id FROM carts WHERE user_id = ?',
        [userId]
      );

      if (carts && carts.length > 0) {
        for (const cart of carts) {
          await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);
        }
      }

      await conn.query('DELETE FROM carts WHERE user_id = ?', [userId]);
      await conn.query('DELETE FROM addresses WHERE user_id = ?', [userId]);
      await conn.query('DELETE FROM users WHERE id = ?', [userId]);
    });

    res.json({
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    if (error && (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451)) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Impossible de supprimer ce compte: des données liées existent encore (commandes/adresses).'
      });
    }

    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la suppression de l\'utilisateur'
    });
  }
});

/**
 * GET /api/admin/services
 * Récupère tous les services (pour édition)
 */
router.get('/services', async (req, res) => {
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
  } catch (error) {
    console.error('Erreur récupération services:', error);
    res.status(500).json({ error: 'Erreur', detail: 'Erreur lors de la récupération des services' });
  }
});

/**
 * PUT /api/admin/services/:id
 * Met à jour un service (prix, nom, description, etc.)
 */
router.put('/services/:id', [
  param('id').isInt({ min: 1 }),
  body('price').optional().isString().isLength({ max: 50 }),
  body('name').optional().isString().isLength({ max: 200 }),
  body('description').optional().isString(),
  body('duration').optional().isString().isLength({ max: 50 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const { price, name, description, duration } = req.body;

    const updates = [];
    const values = [];

    if (price !== undefined) {
      updates.push('price = ?');
      values.push(String(price).slice(0, 50));
    }
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(String(name).slice(0, 200));
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (duration !== undefined) {
      updates.push('duration = ?');
      values.push(String(duration).slice(0, 50));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Erreur', detail: 'Aucune donnée à mettre à jour' });
    }

    values.push(serviceId);
    await query(
      `UPDATE services SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    const updated = await query('SELECT * FROM services WHERE id = ?', [serviceId]);
    if (!updated || updated.length === 0) {
      return res.status(404).json({ error: 'Erreur', detail: 'Service non trouvé' });
    }

    const s = updated[0];
    res.json({
      id: s.id,
      name: s.name,
      description: s.description || '',
      price: s.price || '',
      duration: s.duration || '',
      details: typeof s.details === 'string' ? JSON.parse(s.details || '[]') : (s.details || [])
    });
  } catch (error) {
    console.error('Erreur mise à jour service:', error);
    res.status(500).json({ error: 'Erreur', detail: 'Erreur lors de la mise à jour du service' });
  }
});

/**
 * GET /api/admin/categories
 * Récupère toutes les catégories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await query(
      'SELECT id, name, description, created_at FROM categories ORDER BY name ASC'
    );

    res.json(categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      createdAt: category.created_at ? new Date(category.created_at).toISOString() : null
    })));
  } catch (error) {
    console.error('❌ [ADMIN] Erreur lors de la récupération des catégories:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la récupération des catégories'
    });
  }
});

/**
 * POST /api/admin/categories
 * Crée une nouvelle catégorie
 */
router.post('/categories', [
  body('name')
    .trim()
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ min: 1, max: 100 }).withMessage('Le nom doit contenir entre 1 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/).withMessage('Le nom contient des caractères invalides'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('La description ne peut pas dépasser 500 caractères'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Sanitizer supplémentaire pour sécurité
    const sanitizedName = String(name).trim().substring(0, 100);
    const sanitizedDescription = description ? String(description).trim().substring(0, 500) : null;

    // Vérifier si la catégorie existe déjà
    const existing = await query(
      'SELECT id FROM categories WHERE name = ?',
      [sanitizedName]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Une catégorie avec ce nom existe déjà'
      });
    }

    const result = await query(
      'INSERT INTO categories (name, description, created_at) VALUES (?, ?, NOW())',
      [sanitizedName, sanitizedDescription]
    );

    const newCategory = await query(
      'SELECT id, name, description, created_at FROM categories WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      id: newCategory[0].id,
      name: newCategory[0].name,
      description: newCategory[0].description,
      createdAt: newCategory[0].created_at ? new Date(newCategory[0].created_at).toISOString() : null
    });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur lors de la création de la catégorie:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la création de la catégorie'
    });
  }
});

/**
 * PUT /api/admin/categories/:id
 * Met à jour une catégorie
 */
router.put('/categories/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID de catégorie invalide'),
  body('name')
    .trim()
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ min: 1, max: 100 }).withMessage('Le nom doit contenir entre 1 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/).withMessage('Le nom contient des caractères invalides'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('La description ne peut pas dépasser 500 caractères'),
  handleValidationErrors
], async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    // Validation supplémentaire de l'ID
    if (isNaN(categoryId) || categoryId < 1) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'ID de catégorie invalide'
      });
    }
    
    const { name, description } = req.body;
    
    // Sanitizer supplémentaire pour sécurité
    const sanitizedName = String(name).trim().substring(0, 100);
    const sanitizedDescription = description ? String(description).trim().substring(0, 500) : null;

    // Vérifier que la catégorie existe
    const existing = await query(
      'SELECT id FROM categories WHERE id = ?',
      [categoryId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        error: 'Erreur',
        detail: 'Catégorie non trouvée'
      });
    }

    // Vérifier si un autre catégorie avec ce nom existe
    const duplicate = await query(
      'SELECT id FROM categories WHERE name = ? AND id != ?',
      [sanitizedName, categoryId]
    );

    if (duplicate && duplicate.length > 0) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Une catégorie avec ce nom existe déjà'
      });
    }

    await query(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [sanitizedName, sanitizedDescription, categoryId]
    );

    const updatedCategory = await query(
      'SELECT id, name, description, created_at FROM categories WHERE id = ?',
      [categoryId]
    );

    res.json({
      id: updatedCategory[0].id,
      name: updatedCategory[0].name,
      description: updatedCategory[0].description,
      createdAt: updatedCategory[0].created_at ? new Date(updatedCategory[0].created_at).toISOString() : null
    });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur lors de la mise à jour de la catégorie:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la mise à jour de la catégorie'
    });
  }
});

/**
 * DELETE /api/admin/categories/:id
 * Supprime une catégorie
 */
router.delete('/categories/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID de catégorie invalide'),
  handleValidationErrors
], async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    // Validation supplémentaire de l'ID
    if (isNaN(categoryId) || categoryId < 1) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'ID de catégorie invalide'
      });
    }

    // Vérifier que la catégorie existe
    const existing = await query(
      'SELECT id, name FROM categories WHERE id = ?',
      [categoryId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        error: 'Erreur',
        detail: 'Catégorie non trouvée'
      });
    }

    // Vérifier si des produits utilisent cette catégorie
    const products = await query(
      'SELECT COUNT(*) as count FROM products WHERE category = ?',
      [existing[0].name]
    );

    if (products[0].count > 0) {
      return res.status(400).json({
        error: 'Erreur',
        detail: `Impossible de supprimer cette catégorie : ${products[0].count} produit(s) l'utilise(nt)`
      });
    }

    await query('DELETE FROM categories WHERE id = ?', [categoryId]);

    res.json({
      message: 'Catégorie supprimée avec succès'
    });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur lors de la suppression de la catégorie:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la suppression de la catégorie'
    });
  }
});

/**
 * POST /api/admin/recover-order
 * Filet de sécurité : crée une commande depuis un payment_intent_id Stripe
 * pour les cas où le navigateur du client s'est fermé avant la confirmation.
 *
 * Toutes les infos viennent de Stripe (metadata) + du panier encore en DB.
 * En cas de panier déjà vidé : utilise les articles du snapshot log (manuel).
 *
 * Usage : POST /api/admin/recover-order { "paymentIntentId": "pi_xxx" }
 */
router.post('/recover-order', verifyAdminToken, async (req, res) => {
  const { paymentIntentId } = req.body;

  if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
    return res.status(400).json({ error: 'paymentIntentId invalide' });
  }

  console.log(`[RECOVER-ORDER] Tentative récupération pi=${paymentIntentId}`);

  try {
    // 1. Vérifier qu'il n'y a pas déjà une commande
    const existing = await query(
      'SELECT id, status FROM orders WHERE payment_intent_id = ?',
      [paymentIntentId]
    );
    if (existing && existing.length > 0) {
      console.log(`[RECOVER-ORDER] Commande déjà existante orderId=${existing[0].id}`);
      return res.json({ success: true, orderId: existing[0].id, alreadyExists: true, status: existing[0].status });
    }

    // 2. Récupérer le payment intent depuis Stripe
    const stripeInstance = getStripe();
    const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);

    console.log(`[RECOVER-ORDER] Stripe status=${paymentIntent.status}, userId=${paymentIntent.metadata?.userId}`);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: 'Paiement non confirmé',
        stripeStatus: paymentIntent.status,
        detail: 'Le paiement n\'a pas abouti — aucune commande créée'
      });
    }

    const userId = paymentIntent.metadata?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'userId manquant dans les metadata Stripe' });
    }

    const amountCents   = paymentIntent.amount;
    const shippingCents = Math.round(parseFloat(paymentIntent.metadata?.shippingCost || 0) * 100);
    const pickupLocation = paymentIntent.metadata?.pickupLocation || null;
    const meta = paymentIntent.metadata;

    // 3. Récupérer le panier depuis la DB (toujours là si clearCart = React only)
    const carts = await query('SELECT id FROM carts WHERE user_id = ?', [userId]);
    let cartItems = [];
    if (carts && carts.length > 0) {
      cartItems = await query(
        `SELECT ci.item_id, ci.name, COALESCE(p.price, ci.price) as price,
                ci.quantity, ci.image, ci.volume, ci.fragrance, ci.weight_grams
         FROM cart_items ci
         LEFT JOIN products p ON p.id = ci.item_id
         WHERE ci.cart_id = ?`,
        [carts[0].id]
      );
    }

    if (!cartItems || cartItems.length === 0) {
      // Le panier est vide — l'admin doit recréer manuellement depuis les logs ORDER_SNAPSHOT
      console.warn(`[RECOVER-ORDER] ⚠️ Panier vide pour userId=${userId}. Rechercher ORDER_SNAPSHOT pi=${paymentIntentId} dans les logs.`);
      return res.status(409).json({
        error: 'Panier vide',
        detail: `Le panier de l'utilisateur ${userId} est vide. Rechercher "ORDER_SNAPSHOT" et "pi=${paymentIntentId}" dans les logs pour retrouver les articles.`,
        stripeMetadata: meta
      });
    }

    // 4. Créer la commande en DB
    let orderId;
    await transaction(async (conn) => {
      const subtotalCents = cartItems.reduce((sum, item) =>
        sum + Math.round(parseFloat(item.price) * 100) * Number(item.quantity), 0);
      const totalCents = subtotalCents + shippingCents;

      const orderResult = await conn.query(
        `INSERT INTO orders
           (user_id, status, total_amount, shipping_cost, payment_intent_id,
            shipping_first_name, shipping_last_name, shipping_email, shipping_phone,
            shipping_address, shipping_city, shipping_postal_code, shipping_country,
            pickup_location, created_at, updated_at)
         VALUES (?, 'paid', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userId,
          (totalCents / 100).toFixed(2),
          (shippingCents / 100).toFixed(2),
          paymentIntentId,
          meta.firstName   || '',
          meta.lastName    || '',
          meta.email       || '',
          meta.phone       || '',
          meta.address     || '',
          meta.city        || '',
          meta.postalCode  || '',
          meta.country     || 'France',
          pickupLocation
        ]
      );
      orderId = Number(orderResult.insertId);

      for (const item of cartItems) {
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, name, price, quantity, image, volume, fragrance, weight_grams)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.item_id, item.name,
           parseFloat(item.price).toFixed(2), Number(item.quantity),
           item.image || null, item.volume || null, item.fragrance || null, item.weight_grams || null]
        );
      }

      // Vider le panier en DB maintenant que la commande est créée
      await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [carts[0].id]);
    });

    console.log(`[RECOVER-ORDER] ✅ Commande créée orderId=${orderId}, userId=${userId}, pi=${paymentIntentId}`);

    // 5. Envoyer les emails (non-bloquant)
    try {
      const user = await query('SELECT first_name, last_name, email, phone FROM users WHERE id = ?', [userId]);
      if (user && user.length > 0) {
        const orderData = {
          orderId,
          items: cartItems,
          totalAmount: (amountCents / 100).toFixed(2),
          shippingCost: (shippingCents / 100).toFixed(2),
          shippingInfo: {
            firstName: meta.firstName, lastName: meta.lastName,
            address: meta.address, city: meta.city,
            postalCode: meta.postalCode, country: meta.country,
            pickupLocation
          }
        };
        await sendOrderConfirmationEmail(user[0].email, orderData);
        await sendNewOrderNotificationEmail({ customerEmail: user[0].email, ...orderData });
        console.log(`[RECOVER-ORDER] 📧 Emails envoyés orderId=${orderId}`);
      }
    } catch (emailErr) {
      console.error(`[RECOVER-ORDER] ⚠️ Erreur emails orderId=${orderId}:`, emailErr.message);
    }

    res.json({ success: true, orderId, recovered: true });

  } catch (error) {
    console.error(`[RECOVER-ORDER] ❌ Erreur pi=${paymentIntentId}:`, error.message);
    res.status(500).json({ error: 'Erreur serveur', detail: error.message });
  }
});

export default router;
