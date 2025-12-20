import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Admin from '../models/Admin.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Middleware d'authentification admin
const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authentification requise' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Erreur de configuration serveur' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé - Admin uniquement' });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ message: 'Admin non trouvé' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Erreur d\'authentification admin:', error);
    res.status(401).json({ message: 'Token invalide' });
  }
};

// Route de connexion admin
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis' });
    }

    const admin = await Admin.findOne({ username });

    if (!admin) {
      // Utiliser un hash factice pour éviter les attaques par timing
      const fakeHash = '$2a$10$fakehashforsecuritypurposesonly';
      await bcrypt.compare(password, fakeHash);
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    // Mettre à jour la dernière connexion
    admin.lastLogin = new Date();
    await admin.save();

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Erreur de configuration serveur' });
    }

    // Générer le token JWT avec le rôle admin
    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion admin:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
  }
});

// Routes protégées par authentification admin
router.use(adminAuth);

// ========== GESTION DES PRODUITS ==========

// Récupérer tous les produits
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer un produit par ID
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    res.json(product);
  } catch (error) {
    console.error('Erreur lors de la récupération du produit:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer un nouveau produit
router.post('/products', [
  body('name').trim().notEmpty().withMessage('Le nom est requis'),
  body('description').trim().notEmpty().withMessage('La description est requise'),
  body('price').isFloat({ min: 0 }).withMessage('Le prix doit être un nombre positif'),
  body('image').trim().notEmpty().withMessage('L\'image est requise'),
  body('category').trim().notEmpty().withMessage('La catégorie est requise'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Le stock doit être un entier positif')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    console.error('Erreur lors de la création du produit:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour un produit
router.put('/products/:id', [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('stock').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    res.json(product);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du produit:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer un produit
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    res.json({ message: 'Produit supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ========== GESTION DES COMMANDES ==========

// Récupérer toutes les commandes
router.get('/orders', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    
    const orders = await Order.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer une commande par ID
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('items.productId', 'name image');
    
    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour le statut d'une commande
router.put('/orders/:id/status', [
  body('status').isIn(['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const updateData = { status };

    if (status === 'shipped') {
      updateData.shippedAt = new Date();
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('user', 'firstName lastName email');

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    res.json(order);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une commande (marquer comme envoyée et archivée)
router.delete('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Vérifier que la commande est bien envoyée avant de la supprimer
    if (order.status !== 'shipped' && order.status !== 'delivered') {
      return res.status(400).json({ 
        message: 'La commande doit être envoyée ou livrée avant d\'être supprimée' 
      });
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Commande supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la commande:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer l'historique des commandes (toutes, même supprimées)
// Pour l'instant, on retourne toutes les commandes, mais on pourrait ajouter un champ "archived"
router.get('/orders/history/all', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Statistiques du dashboard
router.get('/stats', async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const lowStockProducts = await Product.countDocuments({ stock: { $lte: 5, $gt: 0 } });
    const outOfStockProducts = await Product.countDocuments({ stock: 0 });
    
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const preparingOrders = await Order.countDocuments({ status: 'preparing' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });
    
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    res.json({
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        preparing: preparingOrders,
        shipped: shippedOrders
      },
      revenue: {
        total: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;

