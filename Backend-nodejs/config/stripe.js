import Stripe from 'stripe';

// Singleton Stripe — une seule instance pour tout le processus Node.js.
// Évite d'initialiser le SDK plusieurs fois (server.js + payment.js).
let _stripe = null;

export const getStripe = () => {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY n\'est pas défini');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia'
    });
    console.log('✅ [STRIPE] Instance Stripe initialisée');
  }
  return _stripe;
};
