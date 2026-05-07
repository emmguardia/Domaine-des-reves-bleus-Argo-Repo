import express from 'express';
import { query } from '../config/database.js';
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
import logger from '../config/logger.js';

const router = express.Router();

// Pseudonymise un email pour les logs : john@example.com → jo***@example.com (RGPD)
const maskEmail = (email) => String(email).replace(/(.{2}).+(@.+)/, '$1***$2');
// Tronque l'IP pour limiter l'exposition des données personnelles
const maskIP = (ip) => {
  if (!ip) return 'unknown';
  // IPv4 : masque le dernier octet (192.168.1.42 → 192.168.1.x)
  return ip.replace(/(\d+)$/, 'x').replace(/([a-f0-9:]+:[a-f0-9:]+):[a-f0-9]+$/i, '$1:x');
};

/**
 * POST /api/auth/register
 */
router.post('/register', authRateLimiter, validateRegister, async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const existingUsers = await query(
      'SELECT id, email, phone FROM users WHERE email = ? OR phone = ? LIMIT 5',
      [normalizedEmail, phone]
    );

    if (existingUsers && existingUsers.some((u) => String(u.email).toLowerCase() === normalizedEmail)) {
      return res.status(400).json({ error: 'Erreur', detail: 'Un compte existe déjà avec cet email' });
    }

    if (existingUsers && existingUsers.some((u) => String(u.phone) === String(phone))) {
      return res.status(400).json({ error: 'Erreur', detail: 'Ce numéro de téléphone est déjà utilisé' });
    }

    const hashedPassword = await hashPassword(password);

    const result = await query(
      `INSERT INTO users (first_name, last_name, phone, email, password, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'user', NOW(), NOW())`,
      [firstName, lastName, phone, normalizedEmail, hashedPassword]
    );

    const userId = result.insertId;
    const token = generateToken(userId, false);

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
      const detail = String(error.message || '').includes('phone')
        ? 'Ce numéro de téléphone est déjà utilisé'
        : 'Un compte existe déjà avec cet email';
      return res.status(400).json({ error: 'Erreur', detail });
    }
    logger.error({ err: error }, '[AUTH] Erreur inscription');
    res.status(500).json({ error: 'Erreur serveur', detail: 'Erreur lors de l\'inscription' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', authRateLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    // PII masqués dans les logs (RGPD)
    const maskedEmail = maskEmail(email);
    const maskedIP = maskIP(req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim());

    const users = await query(
      'SELECT id, first_name, last_name, phone, email, password FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!users || users.length === 0) {
      logger.warn({ maskedEmail, ip: maskedIP }, '[AUTH] Email inexistant lors de la connexion');
      return res.status(401).json({ error: 'Non autorisé', detail: 'Email ou mot de passe incorrect' });
    }

    const user = users[0];
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      logger.warn({ maskedEmail, ip: maskedIP }, '[AUTH] Mot de passe incorrect');
      return res.status(401).json({ error: 'Non autorisé', detail: 'Email ou mot de passe incorrect' });
    }

    logger.info({ userId: user.id, ip: maskedIP }, '[AUTH] Connexion réussie');

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
    logger.error({ err: error }, '[AUTH] Erreur connexion');
    res.status(500).json({ error: 'Erreur serveur', detail: 'Erreur lors de la connexion' });
  }
});

/**
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', passwordResetRateLimiter, validateForgotPassword, async (req, res) => {
  try {
    const { email } = req.body;

    const users = await query(
      'SELECT id, email FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    // Toujours retourner succès — anti-énumération
    if (!users || users.length === 0) {
      return res.json({
        success: true,
        message: 'Si un compte existe avec cette adresse, un email de réinitialisation a été envoyé.'
      });
    }

    const user = users[0];
    const resetToken = crypto.randomBytes(32).toString('base64url');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const signedToken = generateToken(user.id, false, {
      resetToken,
      type: 'password-reset',
      expiresIn: '24h'
    });

    await query(
      'UPDATE users SET reset_password_token = ?, reset_password_expiry = ? WHERE id = ?',
      [resetToken, resetTokenExpiry, user.id]
    );

    const emailResult = await sendPasswordResetEmail(user.email, signedToken);
    if (!emailResult.success) {
      logger.error({ err: emailResult.error }, '[AUTH] Erreur envoi email reset password');
    }

    res.json({
      success: true,
      message: 'Si un compte existe avec cette adresse, un email de réinitialisation a été envoyé.'
    });
  } catch (error) {
    logger.error({ err: error }, '[AUTH] Erreur forgot-password');
    res.status(500).json({ error: 'Erreur serveur', detail: 'Erreur lors de la demande de réinitialisation' });
  }
});

/**
 * POST /api/auth/reset-password
 */
router.post('/reset-password', passwordResetRateLimiter, validateResetPassword, async (req, res) => {
  try {
    const { token, email, password } = req.body;

    let decodedToken;
    try {
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        return res.status(500).json({ error: 'Erreur serveur', detail: 'Configuration serveur invalide' });
      }
      decodedToken = jwt.verify(token, JWT_SECRET);
      if (!decodedToken.resetToken || decodedToken.type !== 'password-reset') {
        return res.status(400).json({ error: 'Erreur', detail: 'Token invalide' });
      }
    } catch (jwtError) {
      logger.warn({ err: jwtError.message }, '[AUTH] Token reset invalide');
      return res.status(400).json({ error: 'Erreur', detail: 'Token invalide ou expiré' });
    }

    const users = await query(
      `SELECT id, email FROM users
       WHERE id = ? AND email = ? AND reset_password_token = ? AND reset_password_expiry > NOW()`,
      [decodedToken.userId || decodedToken.id, email.toLowerCase(), decodedToken.resetToken]
    );

    if (!users || users.length === 0) {
      logger.warn({ maskedEmail: maskEmail(email) }, '[AUTH] Token reset invalide ou expiré');
      return res.status(400).json({ error: 'Erreur', detail: 'Token invalide ou expiré' });
    }

    const user = users[0];
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ error: 'Erreur', detail: 'Token invalide' });
    }

    const hashedPassword = await hashPassword(password);
    await query(
      'UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expiry = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    logger.info({ userId: user.id }, '[AUTH] Mot de passe réinitialisé');
    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    logger.error({ err: error }, '[AUTH] Erreur reset-password');
    res.status(500).json({ error: 'Erreur serveur', detail: 'Erreur lors de la réinitialisation du mot de passe' });
  }
});

export default router;
