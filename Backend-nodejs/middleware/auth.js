import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('⚠️  JWT_SECRET n\'est pas défini dans les variables d\'environnement');
}

/**
 * Middleware pour vérifier le token JWT et récupérer l'utilisateur
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [AUTH] Token manquant pour:', req.path);
      return res.status(401).json({ 
        error: 'Non autorisé',
        detail: 'Token manquant ou invalide'
      });
    }

    const token = authHeader.substring(7); // Enlever "Bearer "
    console.log('🔍 [AUTH] Vérification du token pour:', req.path);

    if (!JWT_SECRET) {
      return res.status(500).json({
        error: 'Erreur de configuration serveur',
        detail: 'JWT_SECRET non configuré'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        error: 'Non autorisé',
        detail: 'Token invalide ou expiré'
      });
    }

    const userId = decoded.id;
    if (!userId) {
      return res.status(401).json({
        error: 'Non autorisé',
        detail: 'Token invalide'
      });
    }

    // Vérifier que l'utilisateur existe toujours
    const users = await query(
      'SELECT id, first_name, last_name, phone, email, role, default_address, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({
        error: 'Non autorisé',
        detail: 'Utilisateur non trouvé'
      });
    }

    req.user = users[0];
    console.log('✅ [AUTH] Token valide - User ID:', users[0].id);
    next();
  } catch (error) {
    console.error('Erreur dans verifyToken:', error);
    return res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la vérification du token'
    });
  }
};

/**
 * Middleware pour vérifier le token admin
 */
export const verifyAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Non autorisé',
        detail: 'Token manquant ou invalide'
      });
    }

    const token = authHeader.substring(7);

    if (!JWT_SECRET) {
      return res.status(500).json({
        error: 'Erreur de configuration serveur',
        detail: 'JWT_SECRET non configuré'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        error: 'Non autorisé',
        detail: 'Token invalide ou expiré'
      });
    }

    const adminId = decoded.id;
    const role = decoded.role;

    if (!adminId || role !== 'admin') {
      return res.status(403).json({
        error: 'Accès refusé',
        detail: 'Accès admin uniquement'
      });
    }

    // Vérifier que l'admin existe toujours
    const admins = await query(
      'SELECT id, username, created_at, last_login FROM admins WHERE id = ?',
      [adminId]
    );

    if (!admins || admins.length === 0) {
      return res.status(401).json({
        error: 'Non autorisé',
        detail: 'Admin non trouvé'
      });
    }

    req.admin = admins[0];
    next();
  } catch (error) {
    console.error('Erreur dans verifyAdminToken:', error);
    return res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la vérification du token admin'
    });
  }
};
