import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Récupérer tous les produits (route publique)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ category: 1, name: 1 });
    
    // Convertir les Map en objets pour la sérialisation JSON
    const productsWithObjects = products.map(product => {
      const productObj = product.toObject();
      
      // Convertir volumes Map en objet
      if (productObj.volumes && productObj.volumes instanceof Map) {
        productObj.volumes = Object.fromEntries(productObj.volumes);
      }
      
      // Convertir fragrances Map en objet
      if (productObj.fragrances && productObj.fragrances instanceof Map) {
        const fragrancesObj = {};
        productObj.fragrances.forEach((value, key) => {
          fragrancesObj[key] = value;
        });
        productObj.fragrances = fragrancesObj;
      }
      
      return productObj;
    });
    
    res.json(productsWithObjects);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer un produit par ID (route publique)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
    const productObj = product.toObject();
    
    // Convertir les Map en objets
    if (productObj.volumes && productObj.volumes instanceof Map) {
      productObj.volumes = Object.fromEntries(productObj.volumes);
    }
    
    if (productObj.fragrances && productObj.fragrances instanceof Map) {
      const fragrancesObj = {};
      productObj.fragrances.forEach((value, key) => {
        fragrancesObj[key] = value;
      });
      productObj.fragrances = fragrancesObj;
    }
    
    res.json(productObj);
  } catch (error) {
    console.error('Erreur lors de la récupération du produit:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;

