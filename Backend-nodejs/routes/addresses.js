import express from 'express';
import { query } from '../config/database.js';
import { verifyToken } from '../middleware/auth.js';
import { validateAddressId, validateCreateAddress, handleValidationErrors } from '../middleware/validation.js';
import { publicRateLimiter } from '../config/security.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(verifyToken);
router.use(publicRateLimiter);

/**
 * GET /api/addresses
 * Récupère toutes les adresses de l'utilisateur
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await query(
      `SELECT id, label, first_name, last_name, phone, address, city, postal_code, country, is_default, created_at
       FROM addresses 
       WHERE user_id = ? 
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    res.json(addresses.map(addr => ({
      id: addr.id,
      label: addr.label,
      firstName: addr.first_name,
      lastName: addr.last_name,
      phone: addr.phone,
      address: addr.address,
      city: addr.city,
      postalCode: addr.postal_code,
      country: addr.country,
      isDefault: addr.is_default === 1 || addr.is_default === true,
      createdAt: addr.created_at ? new Date(addr.created_at).toISOString() : null
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des adresses:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la récupération des adresses'
    });
  }
});

/**
 * POST /api/addresses
 * Crée une nouvelle adresse
 */
router.post('/', validateCreateAddress, async (req, res) => {
  try {
    const userId = req.user.id;
    const { label, firstName, lastName, phone, address, city, postalCode, country = 'France', isDefault = false } = req.body;

    // Si c'est l'adresse par défaut, désactiver les autres
    if (isDefault) {
      await query(
        'UPDATE addresses SET is_default = 0 WHERE user_id = ?',
        [userId]
      );
    }

    const result = await query(
      `INSERT INTO addresses (user_id, label, first_name, last_name, phone, address, city, postal_code, country, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, label, firstName, lastName, phone, address, city, postalCode, country, isDefault ? 1 : 0]
    );

    const newAddress = await query(
      'SELECT id, label, first_name, last_name, phone, address, city, postal_code, country, is_default FROM addresses WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      id: newAddress[0].id,
      label: newAddress[0].label,
      firstName: newAddress[0].first_name,
      lastName: newAddress[0].last_name,
      phone: newAddress[0].phone,
      address: newAddress[0].address,
      city: newAddress[0].city,
      postalCode: newAddress[0].postal_code,
      country: newAddress[0].country,
      isDefault: newAddress[0].is_default === 1 || newAddress[0].is_default === true
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'adresse:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la création de l\'adresse'
    });
  }
});

/**
 * PUT /api/addresses/:address_id
 * Met à jour une adresse
 */
router.put('/:address_id', validateAddressId, async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = parseInt(req.params.address_id);
    const { label, firstName, lastName, phone, address, city, postalCode, country, isDefault } = req.body;

    // Vérifier que l'adresse appartient à l'utilisateur
    const existingAddresses = await query(
      'SELECT id FROM addresses WHERE id = ? AND user_id = ?',
      [addressId, userId]
    );

    if (!existingAddresses || existingAddresses.length === 0) {
      return res.status(404).json({
        error: 'Erreur',
        detail: 'Adresse non trouvée'
      });
    }

    // Si c'est l'adresse par défaut, désactiver les autres
    if (isDefault === true) {
      await query(
        'UPDATE addresses SET is_default = 0 WHERE user_id = ? AND id != ?',
        [userId, addressId]
      );
    }

    const updates = [];
    const values = [];

    if (label !== undefined) {
      updates.push('label = ?');
      values.push(label);
    }
    if (firstName !== undefined) {
      updates.push('first_name = ?');
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(lastName);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address);
    }
    if (city !== undefined) {
      updates.push('city = ?');
      values.push(city);
    }
    if (postalCode !== undefined) {
      updates.push('postal_code = ?');
      values.push(postalCode);
    }
    if (country !== undefined) {
      updates.push('country = ?');
      values.push(country);
    }
    if (isDefault !== undefined) {
      updates.push('is_default = ?');
      values.push(isDefault ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Erreur',
        detail: 'Aucune donnée à mettre à jour'
      });
    }

    updates.push('updated_at = NOW()');
    values.push(addressId);

    await query(
      `UPDATE addresses SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const updatedAddress = await query(
      'SELECT id, label, first_name, last_name, phone, address, city, postal_code, country, is_default FROM addresses WHERE id = ?',
      [addressId]
    );

    res.json({
      id: updatedAddress[0].id,
      label: updatedAddress[0].label,
      firstName: updatedAddress[0].first_name,
      lastName: updatedAddress[0].last_name,
      phone: updatedAddress[0].phone,
      address: updatedAddress[0].address,
      city: updatedAddress[0].city,
      postalCode: updatedAddress[0].postal_code,
      country: updatedAddress[0].country,
      isDefault: updatedAddress[0].is_default === 1 || updatedAddress[0].is_default === true
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'adresse:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la mise à jour de l\'adresse'
    });
  }
});

/**
 * DELETE /api/addresses/:address_id
 * Supprime une adresse
 */
router.delete('/:address_id', validateAddressId, async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = parseInt(req.params.address_id);

    // Vérifier que l'adresse appartient à l'utilisateur
    const existingAddresses = await query(
      'SELECT id FROM addresses WHERE id = ? AND user_id = ?',
      [addressId, userId]
    );

    if (!existingAddresses || existingAddresses.length === 0) {
      return res.status(404).json({
        error: 'Erreur',
        detail: 'Adresse non trouvée'
      });
    }

    await query('DELETE FROM addresses WHERE id = ?', [addressId]);

    res.json({
      message: 'Adresse supprimée'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'adresse:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de la suppression de l\'adresse'
    });
  }
});

export default router;
