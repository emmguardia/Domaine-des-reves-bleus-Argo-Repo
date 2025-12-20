import express from 'express';
import jwt from 'jsonwebtoken';

const createPaymentRouter = (stripe) => {
  const router = express.Router();

  // Middleware d'authentification local (même que cart.js)
  const auth = async (req, res, next) => {
    try {
      console.log('Vérification du token d\'authentification (payment)');
      const token = req.headers.authorization?.split(' ')[1];
      console.log('Token reçu:', token ? '<présent>' : '<absent>');

      if (!token) {
        console.log('Aucun token fourni');
        return res.status(401).json({ message: 'Authentification requise' });
      }

      // SÉCURITÉ: Vérifier que JWT_SECRET est défini
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET non défini dans payment.js');
        return res.status(500).json({ message: 'Erreur de configuration serveur' });
      }

      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token décodé:', decodedToken);

      req.user = { id: decodedToken.id };
      next();
    } catch (error) {
      console.error('Erreur d\'authentification:', error);
      res.status(401).json({ message: 'Token invalide', error: error.message });
    }
  };

  // Middleware pour vérifier l'authentification
  router.use(auth);

  // Route pour créer une intention de paiement
  router.post('/create-payment-intent', async (req, res) => {
    try {
      const { amount, currency = 'eur', shippingInfo, shippingCost } = req.body;
      const userId = req.user.id; // Récupéré du middleware d'authentification

      // Préparer les metadata avec les informations de livraison
      const metadata = {
        userId: userId
      };

      if (shippingInfo) {
        metadata.firstName = shippingInfo.firstName || '';
        metadata.lastName = shippingInfo.lastName || '';
        metadata.email = shippingInfo.email || '';
        metadata.phone = shippingInfo.phone || '';
        metadata.address = shippingInfo.address || '';
        metadata.city = shippingInfo.city || '';
        metadata.postalCode = shippingInfo.postalCode || '';
        metadata.country = shippingInfo.country || 'France';
      }

      if (shippingCost) {
        metadata.shippingCost = shippingCost.toString();
      }

      // Créer l'intention de paiement avec support des méthodes modernes (Google Pay, Apple Pay, etc.)
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always',
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (error) {
      console.error("Erreur lors de la création de l'intention de paiement:", error);
      res.status(500).json({ 
        message: "Erreur lors de la création de l'intention de paiement",
        error: error.message 
      });
    }
  });

  // Route pour confirmer le paiement
  router.post('/confirm-payment', async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      const userId = req.user.id;

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.metadata.userId !== userId) {
        return res.status(403).json({ message: 'Non autorisé' });
      }

      res.json({ status: paymentIntent.status });
    } catch (error) {
      console.error('Erreur lors de la confirmation du paiement:', error);
      res.status(500).json({ 
        message: 'Erreur lors de la confirmation du paiement',
        error: error.message 
      });
    }
  });

  return router;
};

export default createPaymentRouter; 