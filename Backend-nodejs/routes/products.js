import express from 'express';
import { query } from '../config/database.js';
import { validateProductId } from '../middleware/validation.js';
import { publicRateLimiter } from '../config/security.js';

const router = express.Router();

router.use(publicRateLimiter);

/**
 * GET /api/products
 * Récupère tous les produits
 */
router.get('/', async (req, res) => {
  try {
    const products = await query(
      `SELECT id, name, description, price, image, category, stock, weight_grams, volumes, fragrances, 
              rating, is_new, is_placeholder, created_at, updated_at
       FROM products 
       ORDER BY category, name`
    );

    res.json(products.map(product => ({
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
 * GET /api/products/:product_id
 * Récupère un produit par son ID
 */
router.get('/:product_id', validateProductId, async (req, res) => {
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

    res.json({
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
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du produit:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la récupération du produit'
    });
  }
});

export default router;
