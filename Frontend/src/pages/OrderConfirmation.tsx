import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { getApiUrl, secureStorage } from '../utils/security';
const OrderConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const { clearCart } = useCart();
  // Guard : on ne traite la confirmation qu'une seule fois, même si clearCart
  // n'est pas stable (pas memoïsé avec useCallback dans le CartContext).
  const hasProcessed = useRef(false);
  const clearCartRef = useRef(clearCart);
  useEffect(() => { clearCartRef.current = clearCart; }, [clearCart]);

  useEffect(() => {
    // Bloque tout re-run ultérieur (ex: clearCart qui change de référence)
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    let isMounted = true;
    setIsLoading(true);
    setVerificationError(null);

    const paymentIntentId = searchParams.get('payment_intent');
    const initialRedirectStatus = searchParams.get('redirect_status');
    const manualSuccessStatus = searchParams.get('payment_intent_status');

    const authHeaders = () => {
      const token = secureStorage.getItem('token');
      return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
    };

    const createOrder = async (piId: string) => {
      try {
        // Tenter d'abord confirm-order (commande PENDING déjà créée — nouveau flow 2 étapes)
        const res = await fetch(`${getApiUrl()}/api/payment/confirm-order`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ paymentIntentId: piId })
        });
        if (res.ok) return;
        const data = await res.json().catch(() => ({}));
        // Fallback vers create-order si la commande n'existe pas encore (ancien flow)
        if (res.status === 404 || data.fallback) {
          await fetch(`${getApiUrl()}/api/payment/create-order`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ paymentIntentId: piId })
          });
        }
      } catch {
        // Silencieux — recover-order admin disponible en fallback
      }
    };

    const recordFailed = async (piId: string) => {
      try {
        await fetch(`${getApiUrl()}/api/payment/record-failed`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ paymentIntentId: piId })
        });
      } catch {
        // Silencieux
      }
    };

    const processVerification = async () => {
      const finalStatus = manualSuccessStatus === 'succeeded' ? 'succeeded' : (initialRedirectStatus || 'failed');

      if (isMounted) {
        setStatus(finalStatus);
        switch (finalStatus) {
          case 'succeeded':
            setMessage('Votre paiement a été confirmé avec succès !');
            clearCartRef.current();
            if (paymentIntentId) createOrder(paymentIntentId);
            break;
          case 'processing':
            setMessage('Votre paiement est toujours en cours de traitement. Rechargez la page plus tard ou vérifiez vos emails.');
            if (paymentIntentId) recordFailed(paymentIntentId);
            break;
          case 'requires_payment_method':
            setMessage('Le paiement a échoué. Veuillez essayer une autre méthode de paiement.');
            if (paymentIntentId) recordFailed(paymentIntentId);
            break;
          case 'canceled':
            setMessage('Le paiement a été annulé.');
            if (paymentIntentId) recordFailed(paymentIntentId);
            break;
          default:
            setMessage(`Statut du paiement : ${finalStatus}. Contactez le support si besoin.`);
            if (paymentIntentId) recordFailed(paymentIntentId);
            break;
        }
        setIsLoading(false);
      }
    };
    processVerification();
    return () => {
       isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const renderIcon = () => {
    if (isLoading) return <FaSpinner className="animate-spin text-4xl text-gray-500 mb-4" />;
    switch (status) {
      case 'succeeded':
        return <FaCheckCircle className="text-6xl text-green-500 mb-4" />;
      case 'processing':
        return <FaSpinner className="animate-spin text-4xl text-yellow-500 mb-4" />;
      case 'canceled':
        return <FaTimesCircle className="text-6xl text-gray-500 mb-4" />;
      default:
        return <FaTimesCircle className="text-6xl text-red-500 mb-4" />;
    }
  };
  return (
    <main className="pt-24 pb-12 flex-grow flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-lg"
      >
         <div className="flex justify-center">
            {renderIcon()}
         </div>
         <h1 className="text-2xl font-bold text-gray-800 mb-4">
           {isLoading ? 'Vérification du paiement...' : 'Statut de la commande'}
         </h1>
         <p className="text-gray-600 mb-8">
           {isLoading ? 'Veuillez patienter...' : message}
         </p>
         {verificationError && (
             <p className="text-xs text-red-400 mb-4">Erreur de vérification: {verificationError}</p>
         )}
         {!isLoading && (
             <Link to="/" className="button-primary">
               Retour à l'accueil
             </Link>
         )}
         {status === 'requires_payment_method' && !isLoading && (
             <Link to="/checkout" className="button-secondary ml-4">
                Réessayer le paiement
             </Link>
         )}
      </motion.div>
    </main>
  );
};
export default OrderConfirmation;
