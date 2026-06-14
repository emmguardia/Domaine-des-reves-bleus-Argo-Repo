import { getApiUrl } from '../utils/security';
import { logger } from '../utils/logger';

export interface ForgotPasswordEmailData {
  to_email: string;
  to_name: string;
  reset_link: string;
}

export interface OrderConfirmationEmailData {
  to_email: string;
  to_name: string;
  order_number: string;
  order_items: string;
  order_total: string;
  shipping_address: string;
}

export interface ContactEmailData {
  from_name: string;
  from_email: string;
  message: string;
  phone?: string;
  subject?: string;
}

/**
 * Envoie un email de réinitialisation de mot de passe via le backend
 * Le backend gère la sécurité du token (JWT signé)
 */
export const sendForgotPasswordEmail = async (data: ForgotPasswordEmailData): Promise<{ success: boolean; message: string }> => {
  try {
    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: data.to_email }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return { success: false, message: result.detail || result.message || 'Erreur lors de la demande de réinitialisation' };
    }

    if (!result.success) {
      return { success: false, message: result.message || 'Erreur lors de la demande de réinitialisation' };
    }

    logger.log('✅ Email de réinitialisation demandé avec succès');
    return { success: true, message: result.message || 'Un email de réinitialisation a été envoyé à votre adresse email.' };
  } catch (error) {
    logger.error('Erreur lors de la demande de réinitialisation:', error);
    return { success: false, message: 'Erreur lors de la demande de réinitialisation. Veuillez réessayer.' };
  }
};

/**
 * Envoie un email de confirmation de commande via le backend
 */
export const sendOrderConfirmationEmail = async (data: OrderConfirmationEmailData): Promise<boolean> => {
  try {
    const API_URL = getApiUrl();
    
    // Parser les items depuis la string JSON si nécessaire
    let items = [];
    try {
      items = typeof data.order_items === 'string' ? JSON.parse(data.order_items) : data.order_items;
    } catch {
      items = [];
    }

    const response = await fetch(`${API_URL}/api/email/order-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.to_email,
        firstName: data.to_name.split(' ')[0] || data.to_name,
        lastName: data.to_name.split(' ').slice(1).join(' ') || '',
        orderNumber: data.order_number,
        orderDate: new Date().toLocaleDateString('fr-FR', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        items: items,
        totalAmount: parseFloat(data.order_total.replace(/[^\d.,]/g, '').replace(',', '.')),
        shippingCost: 0, // À adapter selon votre logique
        shippingAddress: data.shipping_address
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('Erreur lors de l\'envoi de l\'email de confirmation:', error);
      return false;
    }

    logger.log('✅ Email de confirmation de commande envoyé');
    return true;
  } catch (error) {
    logger.error('Erreur lors de l\'envoi de l\'email de confirmation:', error);
    return false;
  }
};

/**
 * Envoie un email de contact via le backend
 */
export const sendContactEmail = async (data: ContactEmailData): Promise<{ success: boolean; message: string }> => {
  try {
    const API_URL = getApiUrl();
    
    // Séparer le nom complet en prénom et nom
    const nameParts = data.from_name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const response = await fetch(`${API_URL}/api/email/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: firstName,
        lastName: lastName,
        email: data.from_email,
        message: data.message,
        phone: data.phone || null,
        subject: data.subject || null
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        message: result.detail || result.message || 'Une erreur est survenue lors de l\'envoi de votre message. Veuillez réessayer.' 
      };
    }

    logger.log('✅ Email de contact envoyé avec succès');
    return { success: true, message: result.message || 'Votre message a été envoyé avec succès !' };
  } catch (error) {
    logger.error('Erreur lors de l\'envoi de l\'email de contact:', error);
    return { success: false, message: 'Une erreur est survenue lors de l\'envoi de votre message. Veuillez réessayer.' };
  }
};
