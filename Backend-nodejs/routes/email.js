import express from 'express';
import { 
  sendNewContactNotificationEmail, 
  sendContactConfirmationEmail,
  sendOrderConfirmationEmail,
  sendNewOrderNotificationEmail
} from '../utils/email.js';
import { publicRateLimiter, apiRateLimiter } from '../config/security.js';
import { body, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

/**
 * POST /api/email/contact
 * Envoie un email de contact (publique mais rate-limited)
 */
router.post('/contact', publicRateLimiter, [
  body('firstName').trim().notEmpty().withMessage('Le prénom est requis'),
  body('lastName').trim().notEmpty().withMessage('Le nom est requis'),
  body('email').trim().isEmail().withMessage('Email invalide').normalizeEmail(),
  body('message').trim().notEmpty().withMessage('Le message est requis'),
  body('phone').optional().trim(),
  body('subject').optional().trim(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { firstName, lastName, email, message, phone, subject } = req.body;
    const clientIP = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

    console.log(`📧 [EMAIL-CONTACT] Nouveau message de ${firstName} ${lastName} (${email}) - IP: ${clientIP}`);

    // Envoyer l'email de notification à l'admin
    const adminEmail = process.env.ADMIN_EMAIL || 'domainedesrevesbleus@gmail.com';
    const adminResult = await sendNewContactNotificationEmail(adminEmail, {
      firstName,
      lastName,
      from_name: `${firstName} ${lastName}`,
      from_email: email,
      email: email,
      phone: phone || null,
      subject: subject || 'Nouveau message de contact',
      message: message
    });

    if (!adminResult.success) {
      console.error('❌ [EMAIL-CONTACT] Erreur lors de l\'envoi à l\'admin:', adminResult.error);
    }

    // Envoyer l'email de confirmation à l'utilisateur
    const userResult = await sendContactConfirmationEmail(email, {
      firstName,
      lastName
    });

    if (!userResult.success) {
      console.error('❌ [EMAIL-CONTACT] Erreur lors de l\'envoi de confirmation:', userResult.error);
    }

    res.json({
      success: true,
      message: 'Votre message a été envoyé avec succès !'
    });
  } catch (error) {
    console.error('❌ [EMAIL-CONTACT] Erreur:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de l\'envoi du message'
    });
  }
});

/**
 * POST /api/email/order-confirmation
 * Envoie un email de confirmation de commande (authentifié)
 */
router.post('/order-confirmation', apiRateLimiter, [
  body('email').trim().isEmail().withMessage('Email invalide').normalizeEmail(),
  body('firstName').trim().notEmpty().withMessage('Le prénom est requis'),
  body('lastName').trim().notEmpty().withMessage('Le nom est requis'),
  body('orderNumber').trim().notEmpty().withMessage('Le numéro de commande est requis'),
  body('orderDate').trim().notEmpty().withMessage('La date de commande est requise'),
  body('items').isArray().withMessage('Les articles sont requis'),
  body('totalAmount').isNumeric().withMessage('Le montant total est requis'),
  body('shippingCost').isNumeric().withMessage('Les frais de livraison sont requis'),
  body('shippingAddress').trim().notEmpty().withMessage('L\'adresse de livraison est requise'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email, firstName, lastName, orderNumber, orderDate, items, totalAmount, shippingCost, shippingAddress } = req.body;

    console.log(`📧 [EMAIL-ORDER] Confirmation de commande #${orderNumber} pour ${email}`);

    // Envoyer l'email de confirmation au client
    const userResult = await sendOrderConfirmationEmail(email, {
      firstName,
      lastName,
      orderNumber,
      orderDate,
      items: items.map(item => ({
        name: item.name || item.item_name || 'Produit',
        quantity: item.quantity || 1,
        price: parseFloat(item.price || item.item_price || 0)
      })),
      totalAmount: parseFloat(totalAmount),
      shippingCost: parseFloat(shippingCost),
      shippingAddress
    });

    if (!userResult.success) {
      console.error('❌ [EMAIL-ORDER] Erreur lors de l\'envoi au client:', userResult.error);
    }

    // Envoyer l'email de notification à l'admin
    const adminResult = await sendNewOrderNotificationEmail({
      orderNumber,
      customerName: `${firstName} ${lastName}`,
      customerEmail: email,
      customerPhone: req.body.phone || null,
      items: items.map(item => ({
        name: item.name || item.item_name || 'Produit',
        quantity: item.quantity || 1,
        price: parseFloat(item.price || item.item_price || 0)
      })),
      totalAmount: parseFloat(totalAmount),
      shippingCost: parseFloat(shippingCost),
      shippingAddress,
      paymentMethod: req.body.paymentMethod || 'Stripe'
    });

    if (!adminResult.success) {
      console.error('❌ [EMAIL-ORDER] Erreur lors de l\'envoi à l\'admin:', adminResult.error);
    }

    res.json({
      success: true,
      message: 'Email de confirmation envoyé'
    });
  } catch (error) {
    console.error('❌ [EMAIL-ORDER] Erreur:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: 'Erreur lors de l\'envoi de l\'email de confirmation'
    });
  }
});

export default router;
