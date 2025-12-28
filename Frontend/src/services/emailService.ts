import emailjs from '@emailjs/browser';
import { getApiUrl } from '../utils/security';
import { logger } from '../utils/logger';
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID_FORGOT_PASSWORD = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_FORGOT_PASSWORD || 'YOUR_FORGOT_PASSWORD_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';
const EMAILJS_SERVICE_ID_2 = import.meta.env.VITE_EMAILJS_SERVICE_ID_2 || 'YOUR_SERVICE_ID_2';
const EMAILJS_TEMPLATE_ID_ORDER_CONFIRMATION = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_ORDER_CONFIRMATION || 'YOUR_ORDER_CONFIRMATION_TEMPLATE_ID';
const EMAILJS_TEMPLATE_ID_CONTACT = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_CONTACT || 'YOUR_CONTACT_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY_2 = import.meta.env.VITE_EMAILJS_PUBLIC_KEY_2 || 'YOUR_PUBLIC_KEY_2';
logger.log('EmailJS Configuration chargée');
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
}
export const sendForgotPasswordEmail = async (data: ForgotPasswordEmailData): Promise<{ success: boolean; message: string }> => {
  try {
    const checkResponse = await fetch(`${getApiUrl()}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: data.to_email }),
    });
    const checkResult = await checkResponse.json();
    if (!checkResponse.ok) {
      return { success: false, message: checkResult.msg || 'Erreur lors de la vérification de l\'email' };
    }
    if (!checkResult.success) {
      return { success: false, message: checkResult.message };
    }
    if (!data.to_email || !data.to_email.trim()) {
      logger.error('Email destinataire vide');
      return { success: false, message: 'Adresse email invalide' };
    }
    const templateParams = {
      to_email: data.to_email.trim(),
      to_name: data.to_name || data.to_email.split('@')[0],
      reset_link: checkResult.resetLink,
      user_email: data.to_email.trim(),
      email: data.to_email.trim(),
    };
    logger.log('Envoi email forgot password');
    emailjs.init(EMAILJS_PUBLIC_KEY);
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID_FORGOT_PASSWORD,
      templateParams
    );
    logger.log('Email de réinitialisation envoyé');
    return { success: true, message: checkResult.message };
  } catch (error: any) {
    logger.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', error);
    return { success: false, message: error?.text || 'Erreur lors de l\'envoi de l\'email' };
  }
};
export const sendOrderConfirmationEmail = async (data: OrderConfirmationEmailData): Promise<boolean> => {
  try {
    if (!data.to_email || !data.to_email.trim()) {
      logger.error('Email destinataire vide pour la confirmation de commande');
      return false;
    }
    const templateParams = {
      to_email: data.to_email.trim(),
      to_name: data.to_name || data.to_email.split('@')[0],
      order_number: data.order_number,
      order_items: data.order_items,
      order_total: data.order_total,
      shipping_address: data.shipping_address,
      user_email: data.to_email.trim(),
      email: data.to_email.trim(),
    };
    logger.log('Envoi email order confirmation');
    emailjs.init(EMAILJS_PUBLIC_KEY_2);
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID_2,
      EMAILJS_TEMPLATE_ID_ORDER_CONFIRMATION,
      templateParams
    );
    logger.log('Email de confirmation de commande envoyé');
    return true;
  } catch (error: any) {
    logger.error('Erreur lors de l\'envoi de l\'email de confirmation:', error);
    return false;
  }
};
export const sendContactEmail = async (data: ContactEmailData): Promise<{ success: boolean; message: string }> => {
  try {
    const templateParams = {
      from_name: data.from_name,
      from_email: data.from_email,
      message: data.message,
    };
    logger.log('Envoi email contact');
    emailjs.init(EMAILJS_PUBLIC_KEY_2);
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID_2,
      EMAILJS_TEMPLATE_ID_CONTACT,
      templateParams
    );
    logger.log('Email de contact envoyé');
    return { success: true, message: 'Votre message a été envoyé avec succès !' };
  } catch (error: any) {
    logger.error('Erreur lors de l\'envoi de l\'email de contact:', error);
    return { success: false, message: error?.text || 'Une erreur est survenue lors de l\'envoi de votre message. Veuillez réessayer.' };
  }
};
