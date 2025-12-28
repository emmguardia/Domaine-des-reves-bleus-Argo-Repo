import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
const OrderConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const { clearCart } = useCart();
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setVerificationError(null);
    console.log("Paramètres reçus dans l'URL:");
    for (let entry of searchParams.entries()) {
       console.log(entry[0], '=', entry[1]);
    }
    const paymentIntentId = searchParams.get('payment_intent');
    const initialRedirectStatus = searchParams.get('redirect_status');
    const manualSuccessStatus = searchParams.get('payment_intent_status');
    const handleSuccess = () => {
      if (isMounted) {
         setStatus('succeeded');
         setMessage('Votre paiement a été effectué avec succès !');
         clearCart();
         setIsLoading(false);
      }
    };
    const processVerification = async () => {
      if (!paymentIntentId) {
        if (isMounted) {
            setStatus(initialRedirectStatus || 'failed');
            setMessage(initialRedirectStatus === 'succeeded' ? 'Paiement apparemment réussi (vérification impossible).' : 'Erreur lors de la récupération des détails du paiement.');
            setIsLoading(false);
            setVerificationError("ID du paiement manquant dans l'URL de retour.");
            console.error("Paramètre 'payment_intent' non trouvé dans l'URL.");
        }
        return;
      }
      try {
        console.log("ID PaymentIntent trouvé, vérification backend...");
        const res = await fetch(`/api/get-payment-status?payment_intent=${paymentIntentId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: `Erreur serveur (${res.status})` }));
          throw new Error(data.error || `Erreur serveur (${res.status})`);
        }
        const data = await res.json();
        const finalStatus = data.status;
        console.log("Statut final reçu du backend:", finalStatus);
        if (isMounted) {
            setStatus(finalStatus);
            switch (finalStatus) {
              case 'succeeded':
                setMessage('Votre paiement a été confirmé avec succès !');
                clearCart();
                break;
              case 'processing':
                setMessage('Votre paiement est toujours en cours de traitement. Rechargez la page plus tard ou vérifiez vos emails.');
                break;
              case 'requires_payment_method':
                setMessage('Le paiement a échoué. Veuillez essayer une autre méthode de paiement.');
                break;
              case 'canceled':
                setMessage('Le paiement a été annulé.');
                break;
              default:
                setMessage(`Statut du paiement : ${finalStatus}. Contactez le support si besoin.`);
                break;
            }
        }
      } catch (error: any) {
         console.error("Erreur lors de la vérification du statut du paiement:", error);
         if (isMounted) {
             setStatus(initialRedirectStatus || 'failed');
             setMessage(`Impossible de vérifier le statut final du paiement (${error.message}). Statut initial : ${initialRedirectStatus || 'inconnu'}`);
             setVerificationError(error.message);
         }
      } finally {
          if (isMounted) {
              setIsLoading(false);
          }
      }
    };
    if (manualSuccessStatus === 'succeeded') {
      console.log("Succès détecté via paramètre de navigation manuelle.");
      handleSuccess();
    } else {
      processVerification();
    }
    return () => {
       isMounted = false;
    };
  }, [searchParams, clearCart]);
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
