import express from 'express';
import jwt from 'jsonwebtoken';
import Cart from '../models/Cart.js';

const router = express.Router();

// Middleware d'authentification
const auth = async (req, res, next) => {
  try {
    console.log('Vérification du token d\'authentification');
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Token reçu:', token ? '<présent>' : '<absent>');

    if (!token) {
      console.log('Aucun token fourni');
      return res.status(401).json({ message: 'Authentification requise' });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
    console.log('Token décodé:', decodedToken);

    req.user = { id: decodedToken.id };
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    res.status(401).json({ message: 'Token invalide', error: error.message });
  }
};

// Récupérer le panier de l'utilisateur
router.get('/', auth, async (req, res) => {
  try {
    console.log('GET /cart - Récupération du panier pour l\'utilisateur:', req.user.id);
    let cart = await Cart.findOne({ user: req.user.id });
    console.log('Panier trouvé:', cart);
    
    if (!cart) {
      console.log('Aucun panier trouvé, création d\'un nouveau panier');
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
      console.log('Nouveau panier créé:', cart);
    }
    res.json(cart);
  } catch (error) {
    console.error('Erreur lors de la récupération du panier:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Mettre à jour le panier de l'utilisateur
router.post('/', auth, async (req, res) => {
  try {
    console.log('POST /cart - Mise à jour du panier pour l\'utilisateur:', req.user.id);
    console.log('Données reçues:', req.body);
    
    const { items } = req.body;
    let cart = await Cart.findOne({ user: req.user.id });
    console.log('Panier actuel:', cart);

    if (!cart) {
      console.log('Aucun panier trouvé, création d\'un nouveau panier');
      cart = new Cart({ user: req.user.id, items });
    } else {
      console.log('Mise à jour du panier existant');
      cart.items = items;
    }

    await cart.save();
    console.log('Panier sauvegardé:', cart);
    res.json(cart);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du panier:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Vider le panier
router.delete('/', auth, async (req, res) => {
  try {
    console.log('DELETE /cart - Vidage du panier pour l\'utilisateur:', req.user.id);
    const cart = await Cart.findOne({ user: req.user.id });
    console.log('Panier trouvé:', cart);
    
    if (cart) {
      cart.items = [];
      await cart.save();
      console.log('Panier vidé avec succès');
    } else {
      console.log('Aucun panier trouvé pour cet utilisateur');
    }
    res.json({ message: 'Panier vidé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du panier:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

export default router; 