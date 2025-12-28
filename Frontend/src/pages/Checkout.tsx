import React, { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, secureStorage } from '../utils/security';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { FaPhoneAlt } from 'react-icons/fa';
import ShippingInfo from '../components/ShippingInfo';
import AddressAutocomplete from '../components/AddressAutocomplete';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  packageSize: string;
  deliveryInstructions: string;
}

interface AddressValidation {
  isValid: boolean;
  message: string;
}

const CheckoutForm: React.FC = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { 
    cartItems, 
    cartTotal, 
    clearCart, 
    cartSubtotal, 
    shippingCost,
    shippingCalculation,
    isCalculatingShipping,
    calculateShippingForAddress
  } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const paymentElementRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = !!user;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=checkout');
      return;
    }
    if (cartItems.length === 0 || cartTotal <= 0) {
      navigate('/products');
    }
  }, [isAuthenticated, navigate, cartItems.length, cartTotal]);

  const getPackageSize = (itemCount: number): string => {
    if (itemCount <= 2) return 'small';
    if (itemCount <= 4) return 'medium';
    return 'large';
  };

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    packageSize: getPackageSize(cartItems.length),
    deliveryInstructions: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPaymentElementMounted, setIsPaymentElementMounted] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      packageSize: getPackageSize(cartItems.length)
    }));
  }, [cartItems.length]);

  useEffect(() => {
    if (elements && stripe) {
      const timer = setTimeout(() => {
        const paymentElement = elements.getElement(PaymentElement);
        setIsPaymentElementMounted(!!paymentElement && !!paymentElementRef.current);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [elements, stripe]);

  useEffect(() => {
    if (user && isAuthenticated) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || user.name?.split(' ')[0] || '',
        lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.defaultAddress || user.address || '',
      }));
    }
  }, [user, isAuthenticated]);

  const validateAddress = (address: string): AddressValidation => {
    if (!address) return { isValid: false, message: 'Adresse requise' };
    if (address.length < 10) return { isValid: false, message: 'Adresse trop courte' };

    const postalCodeRegex = /\b\d{5}\b/;
    if (!postalCodeRegex.test(address)) {
      return { isValid: false, message: 'Code postal requis (5 chiffres)' };
    }

    const cityRegex = /\b[A-Za-zÀ-ÿ\s-]{2,}\b/;
    const cityMatch = address.match(cityRegex);
    if (!cityMatch) {
      return { isValid: false, message: 'Nom de ville requis' };
    }
    
    return { isValid: true, message: 'Adresse valide' };
  };

  const addressValidation = validateAddress(formData.address);

  const resetPrefilledInfo = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      packageSize: getPackageSize(cartItems.length),
      deliveryInstructions: '',
    });
  };

  const restorePrefilledInfo = () => {
    if (user && isAuthenticated) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || user.name?.split(' ')[0] || '',
        lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.defaultAddress || user.address || '',
      }));
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === 'firstName' || name === 'lastName') {
      processedValue = value.replace(/[^a-zA-Z\s\-àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸ']/g, '');
    } else if (name === 'phone') {
      const digits = value.replace(/[^0-9]/g, '');
      const limitedDigits = digits.slice(0, 10);
      let formattedValue = '';
      for (let i = 0; i < limitedDigits.length; i++) {
        formattedValue += limitedDigits[i];
        if ((i + 1) % 2 === 0 && i < limitedDigits.length - 1) {
          formattedValue += ' ';
        }
      }
      processedValue = formattedValue;
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) { 
      setMessage("Le module de paiement n'est pas encore prêt. Veuillez patienter.");
      return; 
    }

    if (!isPaymentElementMounted) {
      setMessage("L'élément de paiement n'est pas encore chargé. Veuillez patienter.");
      return;
    }

    if (!isAuthenticated) {
      navigate('/login?redirect=checkout');
      return;
    }
    setIsProcessing(true);
    setMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-confirmation`,
          receipt_email: formData.email,
          shipping: {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            phone: formData.phone,
            address: {
              line1: formData.address,
            }
          }
        },
        redirect: 'always'
      });

      if (error) {
        setMessage(error.message || "Une erreur est survenue lors du paiement.");
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Enregistrer l'adresse si la checkbox est cochée
        if (saveAddress && formData.address) {
          try {
            const token = secureStorage.getItem('token');
            const apiUrl = getApiUrl();
            await fetch(`${apiUrl}/api/user/default-address`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify({ address: formData.address })
            });
          } catch (err) {
            // Ignorer l'erreur, le paiement a réussi
          }
        }
        navigate('/order-confirmation?payment_intent_status=succeeded');
      }
    } catch (err: any) {
      setMessage("Une erreur inattendue s'est produite. Veuillez réessayer.");
      setIsProcessing(false);
    }
  };

  return (
    <main className="pt-24 pb-12">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Finaliser la Commande
          </h1>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-6 rounded-2xl shadow-lg"
          >
            <h2 className="text-2xl font-semibold mb-6 border-b pb-3">Récapitulatif</h2>
            {cartItems.length === 0 ? (
              <p className="text-gray-500">Votre panier est vide.</p>
            ) : (
              <>
                <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex items-center gap-4">
                      <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-sm text-gray-500">Quantité: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-gray-700">{(item.price * item.quantity).toFixed(2)} €</p>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <h3 className="font-medium text-gray-700 mb-2">Informations du colis</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Taille estimée :</span>{' '}
                      {cartItems.length <= 2 ? 'Petit colis (30x20x10 cm)' :
                       cartItems.length <= 4 ? 'Colis moyen (50x40x20 cm)' :
                       'Grand colis (80x60x40 cm)'}
                    </p>
                    <p>
                      <span className="font-medium">Nombre d'articles :</span>{' '}
                      {cartItems.length} {cartItems.length > 1 ? 'articles' : 'article'}
                    </p>
                    <p>
                      <span className="font-medium">Poids total :</span>{' '}
                      {(() => {
                        const totalWeightGrams = cartItems.reduce((sum, item) => sum + (item.weightGrams ?? 100) * item.quantity, 0);
                        const totalWeightKg = totalWeightGrams / 1000;
                        return `${totalWeightGrams} g (${totalWeightKg.toFixed(2)} kg)`;
                      })()}
                    </p>
                    {shippingCalculation && (
                      <p>
                        <span className="font-medium">Poids utilisé pour le calcul :</span>{' '}
                        {shippingCalculation.weightKg.toFixed(2)} kg
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Sous-total</span>
                    <span>{cartSubtotal.toFixed(2)} €</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Frais de port La Poste</span>
                      <span>
                        {shippingCalculation ? 
                          `${shippingCalculation.basePrice.toFixed(2)} €` : 
                          'Calcul en cours...'
                        }
                      </span>
                    </div>
                    {shippingCalculation && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Distance</span>
                        <span>{shippingCalculation.distanceKm} km</span>
                      </div>
                    )}
                    {shippingCalculation && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Livraison estimée</span>
                        <span>{shippingCalculation.estimatedDeliveryDays} jour{shippingCalculation.estimatedDeliveryDays > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium">
                      <span>Total livraison</span>
                      <span>
                        {isCalculatingShipping ? (
                          <span className="text-blue-600">Calcul en cours...</span>
                        ) : (
                          `${shippingCost.toFixed(2)} €`
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>
                      {isCalculatingShipping ? (
                        <span className="text-blue-600">Calcul en cours...</span>
                      ) : (
                        `${cartTotal.toFixed(2)} €`
                      )}
                    </span>
                  </div>
                </div>
              </>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-6 rounded-2xl shadow-lg"
          >
            <h2 className="text-2xl font-semibold mb-6 border-b pb-3">Informations de Livraison</h2>
            
            <ShippingInfo 
              shippingCalculation={shippingCalculation}
              isCalculating={isCalculatingShipping}
            />
            
            {isAuthenticated && user && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    📋 Informations pré-remplies depuis votre profil
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={restorePrefilledInfo}
                      className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      Restaurer
                    </button>
                    <button
                      type="button"
                      onClick={resetPrefilledInfo}
                      className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Effacer
                    </button>
                  </div>
                </div>
                <p className="text-xs text-blue-600">
                  Vos informations de profil ont été automatiquement remplies. Vous pouvez les modifier ou les restaurer.
                </p>
              </div>
            )}
            
            <form onSubmit={handleSubmitOrder} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom
                    {user?.firstName && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Pré-rempli</span>}
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Votre prénom"
                    required
                    autoComplete="given-name"
                    title="Lettres, espaces et tirets uniquement."
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                    {user?.lastName && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Pré-rempli</span>}
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Votre nom"
                    required
                    autoComplete="family-name"
                    title="Lettres, espaces et tirets uniquement."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                    {user?.email && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Pré-rempli</span>}
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="votre@email.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                    {user?.phone && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Pré-rempli</span>}
                  </label>
                  <div className="relative flex items-center border border-gray-200 rounded-xl focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300">
                    <div className="absolute left-0 pl-3 flex items-center h-full pointer-events-none">
                       <FaPhoneAlt className="text-gray-400 h-4 w-4" />
                     </div>
                     <input
                       id="phone"
                       type="tel"
                       name="phone"
                       value={formData.phone}
                       onChange={handleInputChange}
                       className="w-full px-3 py-3 pl-10 border-none focus:ring-0 bg-transparent"
                       placeholder="06 12 34 56 78"
                       required
                       autoComplete="tel"
                       inputMode="numeric"
                       title="Veuillez entrer un numéro de téléphone valide."
                       maxLength={14}
                     />
                   </div>
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse de livraison complète
                  {(user?.defaultAddress || user?.address) && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Pré-rempli</span>}
                </label>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(newAddress: string) => {
                    setFormData(prev => ({ ...prev, address: newAddress }));
                    if (newAddress.length > 10) {
                      calculateShippingForAddress(newAddress);
                    }
                  }}
                  placeholder="Commencez à taper votre adresse..."
                  className="min-h-[50px]"
                  onSelect={(suggestion: any) => {
                    console.log('Adresse sélectionnée:', suggestion);
                    if (suggestion.coordinates) {
                      console.log('Coordonnées:', suggestion.coordinates);
                    }
                  }}
                />
                
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500">
                    💡 Commencez à taper pour voir des suggestions d'adresse
                  </p>
                  {formData.address && (
                    <div className={`text-xs ${addressValidation.isValid ? 'text-green-500' : 'text-orange-500'}`}>
                      {addressValidation.isValid ? '✅ ' : '⚠️ '}
                      {addressValidation.message}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="deliveryInstructions" className="block text-sm font-medium text-gray-700 mb-1">
                   Instructions de livraison <span className="text-gray-500">(Optionnel)</span>
                </label>
                <textarea
                  id="deliveryInstructions"
                  name="deliveryInstructions"
                  value={formData.deliveryInstructions}
                  onChange={handleInputChange}
                  className="form-input min-h-[70px]"
                  placeholder="Ex: Laisser le colis au gardien, code porte 1234, ne pas sonner avant 9h..."
                ></textarea>
              </div>

              <div className="border-t pt-5">
                 <h3 className="text-lg font-medium mb-3">Informations de Paiement</h3>
                 <div ref={paymentElementRef}>
                   <PaymentElement 
                     options={{
                       layout: 'tabs',
                       wallets: {
                         applePay: 'auto',
                         googlePay: 'auto'
                       },
                       business: {
                         name: 'Les Rêves Bleus'
                       },
                       fields: {
                         billingDetails: {
                           address: {
                             country: 'auto'
                           }
                         }
                       }
                     }}
                   />
                 </div>
              </div>

              {addressValidation.isValid && (
                <div className="mt-4 flex items-center">
                  <input
                    type="checkbox"
                    id="saveAddress"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="saveAddress" className="ml-2 text-sm text-gray-700">
                    Enregistrer cette adresse pour les prochains paiements
                  </label>
                </div>
              )}

              <button
                type="submit"
                className={`button-primary w-full mt-4 ${isProcessing || !stripe || !elements || !isPaymentElementMounted || !addressValidation.isValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isProcessing || !stripe || !elements || !isPaymentElementMounted || !addressValidation.isValid || cartItems.length === 0}
              >
                {isProcessing ? 'Traitement...' : `Payer ${cartTotal.toFixed(2)} €`}
              </button>
              {!isPaymentElementMounted && (
                <div className="text-blue-600 text-sm mt-2 text-center">
                  Chargement du module de paiement...
                </div>
              )}
              {!addressValidation.isValid && formData.address && (
                <div className="text-orange-600 text-sm mt-2 text-center">
                  ⚠️ Veuillez corriger l'adresse avant de procéder au paiement
                </div>
              )}
              {message && <div id="payment-message" className="text-red-500 text-sm mt-2 text-center">{message}</div>}
            </form>
          </motion.div>
        </div>
      </div>
    </main>
  );
};

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RGyN2FPffgTXsMQPJKAbFWVpexGFKoGVXwqVkMYVuYXF4C4D20Qjh6hxt1EgcfQJz834fd5El7AwxOIIfHPuSH600wxmrPm6A',
  {
    betas: [],
    locale: 'fr'
  }
);

const CheckoutPage: React.FC = () => {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loadingSecret, setLoadingSecret] = useState(true);
  const [errorSecret, setErrorSecret] = useState<string | null>(null);
  const { cartTotal, cartItems } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAuthenticated = !!user;
  const token = user?.token || secureStorage.getItem('token');

  useEffect(() => {
    if (cartItems.length === 0 || cartTotal <= 0) {
      navigate('/products');
      return;
    }
    
    if (!isAuthenticated) {
      navigate('/login?redirect=checkout');
      return;
    }
    
    setLoadingSecret(true);
    setErrorSecret(null);
    fetch(`${getApiUrl()}/api/payment/create-payment-intent`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          amount: Math.round(cartTotal * 100),
          currency: 'eur',
          shippingCost: 0
        }),
      })
      .then(async (res) => {
          if (res.status === 401) {
            logout();
            return Promise.reject(new Error('Session expirée, veuillez vous reconnecter'));
          }
          
          const contentType = res.headers.get('content-type') || '';
          const isJson = contentType.includes('application/json');
          
          if (!res.ok) {
            if (isJson) {
              try {
                const data = await res.json();
                return Promise.reject(new Error(data.detail || data.message || `Erreur ${res.status}`));
              } catch {
                return Promise.reject(new Error(`Erreur ${res.status}: Impossible de lire la réponse`));
              }
            }
            return res.text().then(text => Promise.reject(new Error(`Erreur ${res.status}: ${text.substring(0, 100)}`)));
          }
          
          if (!isJson) {
            return res.text().then(text => Promise.reject(new Error(`Réponse invalide du serveur (${contentType}): ${text.substring(0, 100)}`)));
          }
          
          try {
            return await res.json();
          } catch {
            return Promise.reject(new Error('Erreur lors de la lecture de la réponse JSON'));
          }
       })
      .then((data: any) => {
          if (!data || !data.clientSecret) {
              throw new Error("Client secret manquant dans la réponse du backend.");
          }
          setClientSecret(data.clientSecret);
          setErrorSecret(null);
      })
      .catch((error: any) => {
        setErrorSecret(error.message || "Erreur technique, impossible d'initier le paiement.");
      })
      .finally(() => {
          setLoadingSecret(false);
      });
  }, [cartTotal, cartItems.length, isAuthenticated, token, logout, navigate]);

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#3b82f6',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };

  const options: StripeElementsOptions = clientSecret ? {
    clientSecret,
    appearance,
    locale: 'fr',
    loader: 'auto',
  } : { appearance, locale: 'fr', loader: 'auto' };

  if (loadingSecret) {
    return (
      <div className="pt-48 text-center">
          Chargement du module de paiement...
      </div>
    );
  }

  if (errorSecret) {
     return (
       <div className="pt-48 text-center text-red-600">
           Erreur lors de l'initialisation du paiement : {errorSecret}
           <p className="text-sm text-gray-500 mt-2">Veuillez vérifier votre connexion ou contacter le support.</p>
       </div>
     );
  }

  if (!clientSecret) {
    return (
      <div className="pt-48 text-center text-red-600">
        Impossible d'initialiser le module de paiement. Veuillez réessayer.
      </div>
    );
  }

  return (
    <Elements key={clientSecret || 'no-secret'} stripe={stripePromise} options={options}>
      <CheckoutForm />
    </Elements>
  );
};

export default CheckoutPage;

