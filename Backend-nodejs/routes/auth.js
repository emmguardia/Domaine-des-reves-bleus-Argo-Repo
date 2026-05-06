import express from 'express';
import { query, transaction } from '../config/database.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword
} from '../middleware/validation.js';
import { authRateLimiter, passwordResetRateLimiter } from '../config/security.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Inscription d'un nouvel utilisateur
 */
router.post('/register', authRateLimiter, validateRegister, async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    // Vérifier les doublons email / téléphone pour retourner un message explicite
    const existingUsers = await query(
      'SELECT id, email, phone FROM users WHERE email = ? OR phone = ? LIMIT 5',
      [normalizedEmail, phone]
    );

    if (existingUsers && existingUsers.some((u) => String(u.email).toLowerCase() === normalizedEmail)) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Un compte existe déjà avec cet email'
      });
    }

    if (existingUsers && existingUsers.some((u) => String(u.phone) === String(phone))) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Ce numéro de téléphone est déjà utilisé'
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(password);

    // Créer l'utilisateur
    const result = await query(
      `INSERT INTO users (first_name, last_name, phone, email, password, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'user', NOW(), NOW())`,
      [firstName, lastName, phone, normalizedEmail, hashedPassword]
    );

    const userId = result.insertId;

    // Générer le token JWT
    const token = generateToken(userId, false);

    // Récupérer l'utilisateur créé
    const users = await query(
      'SELECT id, first_name, last_name, phone, email FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0];

    res.status(201).json({
      _id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      email: user.email,
      token
    });
  } catch (error) {
    if (error && (error.code === 'ER_DUP_ENTRY' || error.errno === 1062)) {
      const duplicateMessage = String(error.message || '');
      const detail = duplicateMessage.includes('phone')
        ? 'Ce numéro de téléphone est déjà utilisé'
        : 'Un compte existe déjà avec cet email';
      return res.status(400).json({
        error: 'Erreur',
        detail
      });
    }

    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de l\'inscription'
    });
  }
});

/**
 * POST /api/auth/login
 * Connexion d'un utilisateur
 */
router.post('/login', authRateLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    const clientIP = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

    // Récupérer l'utilisateur
    const users = await query(
      'SELECT id, first_name, last_name, phone, email, password FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!users || users.length === 0) {
      console.warn(`⚠️  [AUTH-LOGIN] Tentative de connexion avec email inexistant: ${email.toLowerCase()} (IP: ${clientIP})`);
      return res.status(401).json({
        error: 'Non autorisé',
        detail: 'Email ou mot de passe incorrect'
      });
    }

    const user = users[0];

    // Vérifier le mot de passe
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      console.warn(`⚠️  [AUTH-LOGIN] Tentative de connexion avec mot de passe incorrect pour: ${email.toLowerCase()} (IP: ${clientIP})`);
      return res.status(401).json({
        error: 'Non autorisé',
        detail: 'Email ou mot de passe incorrect'
      });
    }

    console.log(`✅ [AUTH-LOGIN] Connexion réussie pour: ${email.toLowerCase()} (IP: ${clientIP})`);

    // Générer le token JWT
    const token = generateToken(user.id, rememberMe);

    res.json({
      _id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      email: user.email,
      token,
      rememberMe
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la connexion'
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Demande de réinitialisation de mot de passe
 */
router.post('/forgot-password', passwordResetRateLimiter, validateForgotPassword, async (req, res) => {
  try {
    const { email } = req.body;

    // Récupérer l'utilisateur
    const users = await query(
      'SELECT id, email FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    // Toujours retourner succès pour ne pas révéler si l'email existe (anti-enumeration)
    if (!users || users.length === 0) {
      return res.json({
        success: true,
        message: 'Si un compte existe avec cette adresse, un email de réinitialisation a été envoyé.'
      });
    }

    const user = users[0];

    // Générer un token de réinitialisation sécurisé (32 bytes aléatoires)
    const resetToken = crypto.randomBytes(32).toString('base64url');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures
    
    // Sécurité renforcée : créer un token JWT signé pour le lien
    // Ce token contient l'ID utilisateur, le token de reset, et une expiration
    const signedToken = generateToken(user.id, false, {
      resetToken: resetToken,
      type: 'password-reset',
      expiresIn: '24h'
    });

    // Sauvegarder le token dans la base de données
    await query(
      'UPDATE users SET reset_password_token = ?, reset_password_expiry = ? WHERE id = ?',
      [resetToken, resetTokenExpiry, user.id]
    );

    // Envoyer l'email de réinitialisation avec le token signé
    const emailResult = await sendPasswordResetEmail(user.email, signedToken);
    
    if (!emailResult.success) {
      console.error('Erreur lors de l\'envoi de l\'email:', emailResult.error);
      // Ne pas révéler l'erreur à l'utilisateur pour la sécurité
    }

    // Ne pas retourner le resetLink en production pour la sécurité
    // L'utilisateur doit utiliser le lien dans l'email
    res.json({
      success: true,
      message: 'Un email de réinitialisation a été envoyé à votre adresse email.'
      // resetLink retiré pour la sécurité
    });
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la demande de réinitialisation'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Réinitialisation du mot de passe
 */
router.post('/reset-password', passwordResetRateLimiter, validateResetPassword, async (req, res) => {
  try {
    const { token, email, password } = req.body;

    // Sécurité renforcée : vérifier d'abord le token JWT signé
    let decodedToken;
    try {
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        return res.status(500).json({
          error: 'Erreur serveur',
          detail: 'Configuration serveur invalide'
        });
      }
      decodedToken = jwt.verify(token, JWT_SECRET);
      
      // Vérifier que c'est bien un token de réinitialisation
      if (!decodedToken.resetToken || decodedToken.type !== 'password-reset') {
        return res.status(400).json({
          error: 'Erreur',
          detail: 'Token invalide'
        });
      }
    } catch (jwtError) {
      console.warn('⚠️  [AUTH-RESET] Tentative avec token JWT invalide:', jwtError.message);
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Token invalide ou expiré'
      });
    }

    // Récupérer l'utilisateur avec le token de reset valide
    const users = await query(
      `SELECT id, email FROM users 
       WHERE id = ? 
       AND email = ?
       AND reset_password_token = ? 
       AND reset_password_expiry > NOW()`,
      [decodedToken.userId || decodedToken.id, email.toLowerCase(), decodedToken.resetToken]
    );

    if (!users || users.length === 0) {
      console.warn('⚠️  [AUTH-RESET] Tentative avec token invalide ou expiré pour:', email.toLowerCase());
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Token invalide ou expiré'
      });
    }

    const user = users[0];
    
    // Vérification supplémentaire : s'assurer que l'email correspond
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Token invalide'
      });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await hashPassword(password);

    // Mettre à jour le mot de passe et supprimer le token
    await query(
      'UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expiry = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la réinitialisation du mot de passe'
    });
  }
});

export default router;
