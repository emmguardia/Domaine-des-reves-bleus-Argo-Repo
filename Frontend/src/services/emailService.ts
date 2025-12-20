import emailjs from '@emailjs/browser';

// Configuration EmailJS - Service 1 (Pour Forgot Password)
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID_FORGOT_PASSWORD = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_FORGOT_PASSWORD || 'YOUR_FORGOT_PASSWORD_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

// Configuration EmailJS - Service 2 (Pour Order Confirmation et Contact)
const EMAILJS_SERVICE_ID_2 = import.meta.env.VITE_EMAILJS_SERVICE_ID_2 || 'YOUR_SERVICE_ID_2';
const EMAILJS_TEMPLATE_ID_ORDER_CONFIRMATION = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_ORDER_CONFIRMATION || 'YOUR_ORDER_CONFIRMATION_TEMPLATE_ID';
const EMAILJS_TEMPLATE_ID_CONTACT = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_CONTACT || 'YOUR_CONTACT_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY_2 = import.meta.env.VITE_EMAILJS_PUBLIC_KEY_2 || 'YOUR_PUBLIC_KEY_2';

// Debug: Vérifier les variables d'environnement (uniquement en développement)
if (import.meta.env.DEV) {
  console.log('EmailJS Configuration:', {
    SERVICE_ID: EMAILJS_SERVICE_ID,
    TEMPLATE_FORGOT_PASSWORD: EMAILJS_TEMPLATE_ID_FORGOT_PASSWORD,
    PUBLIC_KEY: EMAILJS_PUBLIC_KEY ? 'Défini' : 'Manquant',
    SERVICE_ID_2: EMAILJS_SERVICE_ID_2,
    TEMPLATE_ORDER: EMAILJS_TEMPLATE_ID_ORDER_CONFIRMATION,
    TEMPLATE_CONTACT: EMAILJS_TEMPLATE_ID_CONTACT,
    PUBLIC_KEY_2: EMAILJS_PUBLIC_KEY_2 ? 'Défini' : 'Manquant'
  });
}

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
    // D'abord, vérifier si l'email existe en base de données
    const checkResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, {
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

    // Si l'email n'existe pas, retourner le message d'erreur
    if (!checkResult.success) {
      return { success: false, message: checkResult.message };
    }

    // Si l'email existe, on envoie l'email avec le vrai lien de réinitialisation
    if (!data.to_email || !data.to_email.trim()) {
      console.error('Email destinataire vide');
      return { success: false, message: 'Adresse email invalide' };
    }

    const templateParams = {
      to_email: data.to_email.trim(),
      to_name: data.to_name || data.to_email.split('@')[0],
      reset_link: checkResult.resetLink,
      user_email: data.to_email.trim(),
      email: data.to_email.trim(),
    };

    // Log uniquement en développement
    if (import.meta.env.DEV) {
      console.log('Envoi email forgot password:', {
        serviceId: EMAILJS_SERVICE_ID,
        templateId: EMAILJS_TEMPLATE_ID_FORGOT_PASSWORD,
        publicKey: EMAILJS_PUBLIC_KEY ? 'Défini' : 'Manquant',
        to_email: data.to_email,
        params: { ...templateParams, reset_link: '***' }
      });
    }

    emailjs.init(EMAILJS_PUBLIC_KEY);
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID_FORGOT_PASSWORD,
      templateParams
    );

    if (import.meta.env.DEV) {
      console.log('Email de réinitialisation envoyé:', response);
    }
    return { success: true, message: checkResult.message };
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', error);
    console.error('Détails de l\'erreur:', {
      message: error?.message,
      text: error?.text,
      status: error?.status
    });
    return { success: false, message: error?.text || 'Erreur lors de l\'envoi de l\'email' };
  }
};

export const sendOrderConfirmationEmail = async (data: OrderConfirmationEmailData): Promise<boolean> => {
  try {
    if (!data.to_email || !data.to_email.trim()) {
      console.error('Email destinataire vide pour la confirmation de commande');
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

    // Log uniquement en développement
    if (import.meta.env.DEV) {
      console.log('Envoi email order confirmation:', {
        serviceId: EMAILJS_SERVICE_ID_2,
        templateId: EMAILJS_TEMPLATE_ID_ORDER_CONFIRMATION,
        publicKey: EMAILJS_PUBLIC_KEY_2 ? 'Défini' : 'Manquant',
        to_email: data.to_email,
        params: templateParams
      });
    }

    emailjs.init(EMAILJS_PUBLIC_KEY_2);
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID_2,
      EMAILJS_TEMPLATE_ID_ORDER_CONFIRMATION,
      templateParams
    );

    if (import.meta.env.DEV) {
      console.log('Email de confirmation de commande envoyé:', response);
    }
    return true;
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'email de confirmation:', error);
    console.error('Détails de l\'erreur:', {
      message: error?.message,
      text: error?.text,
      status: error?.status
    });
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

    // Log uniquement en développement
    if (import.meta.env.DEV) {
      console.log('Envoi email contact:', {
        serviceId: EMAILJS_SERVICE_ID_2,
        templateId: EMAILJS_TEMPLATE_ID_CONTACT,
        publicKey: EMAILJS_PUBLIC_KEY_2 ? 'Défini' : 'Manquant',
        params: templateParams
      });
    }

    emailjs.init(EMAILJS_PUBLIC_KEY_2);
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID_2,
      EMAILJS_TEMPLATE_ID_CONTACT,
      templateParams
    );

    if (import.meta.env.DEV) {
      console.log('Email de contact envoyé:', response);
    }
    return { success: true, message: 'Votre message a été envoyé avec succès !' };
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'email de contact:', error);
    console.error('Détails de l\'erreur:', {
      message: error?.message,
      text: error?.text,
      status: error?.status
    });
    return { success: false, message: error?.text || 'Une erreur est survenue lors de l\'envoi de votre message. Veuillez réessayer.' };
  }
};
