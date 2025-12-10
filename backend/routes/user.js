import express from 'express';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Récupérer les infos de l'utilisateur connecté
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.json(user);
  } catch (error) {
    console.error('Erreur lors de la récupération utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Modifier les infos de l'utilisateur connecté
router.put('/', auth, async (req, res) => {
  try {
    const { firstName, lastName, phone, email } = req.body;
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    
    res.json({ message: 'Profil mis à jour', user });
  } catch (error) {
    if (error.name === 'ValidationError') {
      // Erreur de validation Mongoose
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: 'Erreur de validation', errors });
    }
    if (error.code === 11000) {
      // Erreur d'unicité (email déjà utilisé)
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }
    console.error('Erreur lors de la mise à jour utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer le compte utilisateur connecté
router.delete('/', auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: 'Compte supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;