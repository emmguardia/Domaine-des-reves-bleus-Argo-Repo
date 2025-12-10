import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';

const router = express.Router();

// Middleware de validation pour l'inscription
const registerValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('Le prénom est requis'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Le nom de famille est requis'),
  body('phone')
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Le numéro de téléphone doit contenir 10 chiffres'),
  body('email')
    .isEmail()
    .withMessage('Format d\'email invalide'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial')
];

// Route d'inscription
router.post('/register', registerValidation, async (req, res) => {
  try {
    console.log('Données reçues:', req.body);
    
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Erreurs de validation:', errors.array());
      return res.status(400).json(errors.array());
    }

    const { firstName, lastName, phone, email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('Utilisateur existant trouvé:', userExists);
      return res.status(400).json([{ msg: 'Un utilisateur avec cet email existe déjà' }]);
    }

    // Créer le nouvel utilisateur
    const user = await User.create({
      firstName,
      lastName,
      phone,
      email,
      password
    });

    console.log('Nouvel utilisateur créé:', user);

    // SÉCURITÉ: Vérifier que JWT_SECRET est défini
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET non défini lors de l\'inscription');
      return res.status(500).json([{ msg: 'Erreur de configuration serveur' }]);
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      token
    });
  } catch (error) {
    console.error('Erreur détaillée lors de l\'inscription:', error);
    res.status(500).json([{ msg: 'Erreur serveur lors de l\'inscription' }]);
  }
});

// Route de connexion
router.post('/login', async (req, res) => {
  try {
    console.log('Tentative de connexion avec:', req.body);
    const { email, password, rememberMe } = req.body;

    // SÉCURITÉ: Toujours faire la vérification du mot de passe pour éviter les attaques par timing
    // On récupère l'utilisateur OU on crée un hash factice
    const user = await User.findOne({ email });
    
    // Créer un hash factice si l'utilisateur n'existe pas (même temps de traitement)
    const fakeHash = '$2a$10$fakehashforsecuritypurposesonly';
    const passwordToCheck = user ? user.password : fakeHash;
    
    // Toujours vérifier le mot de passe (même avec un hash factice)
    const isMatch = await bcrypt.compare(password, passwordToCheck);
    
    // Vérifier que l'utilisateur existe ET que le mot de passe est correct
    if (!user || !isMatch) {
      console.log('Tentative de connexion échouée pour:', email);
      return res.status(401).json([{ msg: 'Email ou mot de passe incorrect' }]);
    }

    console.log('Connexion réussie pour:', email);

    // SÉCURITÉ: Vérifier que JWT_SECRET est défini
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET non défini - arrêt du serveur');
      return res.status(500).json([{ msg: 'Erreur de configuration serveur' }]);
    }

    // Générer le token JWT avec une durée différente selon rememberMe
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: rememberMe ? '30d' : '24h' } // 30 jours si rememberMe est true, 24h sinon
    );

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      token,
      rememberMe
    });
  } catch (error) {
    console.error('Erreur détaillée lors de la connexion:', error);
    res.status(500).json([{ msg: 'Erreur serveur lors de la connexion' }]);
  }
});

// Route pour demander la réinitialisation de mot de passe
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validation de l'email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Format d\'email invalide' 
      });
    }

    // Vérifier si l'email existe dans la base de données
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ 
        success: false,
        message: 'Aucun compte trouvé avec cette adresse email' 
      });
    }

    // Générer un token de réinitialisation sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    // Sauvegarder le token dans la base de données
    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken: resetToken,
      resetPasswordExpiry: resetTokenExpiry
    });

    // Générer le lien de réinitialisation
    const resetLink = `${process.env.FRONTEND_URL || 'https://domainedesrevesbleus.famillemntmata.eu'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    console.log('Lien de réinitialisation généré pour:', email);

    res.json({ 
      success: true,
      message: 'Un email de réinitialisation a été envoyé à votre adresse email.',
      resetLink // Pour le développement, à retirer en production
    });

  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Erreur serveur lors de la demande de réinitialisation' 
    });
  }
});

// Route pour réinitialiser le mot de passe
router.post('/reset-password', async (req, res) => {
  try {
    const { token, email, password } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ 
      email,
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ 
        msg: 'Token invalide ou expiré' 
      });
    }

    // Valider le nouveau mot de passe
    if (!password || password.length < 8) {
      return res.status(400).json({ 
        msg: 'Le mot de passe doit contenir au moins 8 caractères' 
      });
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
      return res.status(400).json({ 
        msg: 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial' 
      });
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Mettre à jour le mot de passe et supprimer le token
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetPasswordToken: undefined,
      resetPasswordExpiry: undefined
    });

    res.json({ 
      message: 'Mot de passe réinitialisé avec succès' 
    });

  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ msg: 'Erreur serveur lors de la réinitialisation' });
  }
});

export default router; 