import React, { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { FaPhoneAlt, FaArrowLeft } from 'react-icons/fa';
import ShippingInfo from '../components/ShippingInfo';
import AddressAutocomplete from '../components/AddressAutocomplete';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  deliveryInstructions: string;
}

interface AddressValidation {
  isValid: boolean;
  message: string;
}

interface CheckoutData {
  clientSecret: string;
  orderId: number;
  amount: number;
}

interface SavedAddress {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

// ─── Résumé du panier (colonne gauche, visible dans les 2 étapes) ──────────
const CartSummary: React.FC = () => {
  const {
    cartItems, cartSubtotal, cartTotal,
    shippingCost, shippingCalculation, isCalculatingShipping, isPickup
  } = useCart();

  return (
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
                <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-sm text-gray-500">Quantité : {item.quantity}</p>
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
                {cartItems.length <= 2 ? 'Petit colis (30×20×10 cm)' :
                 cartItems.length <= 4 ? 'Colis moyen (50×40×20 cm)' :
                 'Grand colis (80×60×40 cm)'}
              </p>
              <p>
                <span className="font-medium">Articles :</span>{' '}
                {cartItems.length} {cartItems.length > 1 ? 'articles' : 'article'}
              </p>
              <p>
                <span className="font-medium">Poids total :</span>{' '}
                {(() => {
                  const g = cartItems.reduce((s, i) => s + (i.weightGrams ?? 100) * i.quantity, 0);
                  return `${g} g (${(g / 1000).toFixed(2)} kg)`;
                })()}
              </p>
            </div>
          </div>
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>Sous-total</span>
              <span>{cartSubtotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{isPickup ? 'Retrait sur place' : 'Frais de port La Poste'}</span>
              <span>
                {isPickup ? '0,00 €' :
                  shippingCalculation ? `${shippingCalculation.basePrice.toFixed(2)} €` : 'Calcul en cours...'}
              </span>
            </div>
            {shippingCalculation && !isPickup && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Distance</span>
                <span>{shippingCalculation.distanceKm} km</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span>
                {isCalculatingShipping
                  ? <span className="text-blue-600">Calcul en cours...</span>
                  : `${cartTotal.toFixed(2)} €`}
              </span>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

// ─── Étape 1 : Formulaire de livraison ────────────────────────────────────
interface ShippingStepProps {
  onNext: (data: CheckoutData) => void;
  prefillAddress?: SavedAddress | null;
}

const ShippingStep: React.FC<ShippingStepProps> = ({ onNext, prefillAddress }) => {
  const {
    cartItems, cartTotal, shippingCost,
    shippingCalculation, isCalculatingShipping,
    calculateShippingForAddress,
    isPickup, setIsPickup, pickupLocation, setPickupLocation
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>(() => ({
    firstName: prefillAddress?.firstName || user?.firstName || user?.name?.split(' ')[0] || '',
    lastName:  prefillAddress?.lastName  || user?.lastName  || user?.name?.split(' ').slice(1).join(' ') || '',
    email:     user?.email     || '',
    phone:     prefillAddress?.phone   || user?.phone || '',
    address:   prefillAddress?.address || user?.defaultAddress || user?.address || '',
    city:      prefillAddress?.city    || '',
    postalCode: prefillAddress?.postalCode || '',
    deliveryInstructions: '',
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveAddressChecked, setSaveAddressChecked] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login?redirect=checkout'); return; }
    if (cartItems.length === 0 || cartTotal <= 0) navigate('/products');
  }, [user, cartItems.length, cartTotal, navigate]);

  // Calcule les frais de port d'emblée si une adresse a été pré-remplie
  const prefillCalcDone = useRef(false);
  useEffect(() => {
    if (prefillCalcDone.current) return;
    if (!isPickup && prefillAddress?.address && prefillAddress.address.length > 10) {
      prefillCalcDone.current = true;
      calculateShippingForAddress(prefillAddress.address);
    }
  }, [isPickup, prefillAddress, calculateShippingForAddress]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'firstName' || name === 'lastName') {
      v = value.replace(/[^a-zA-Z\s\-àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸ']/g, '');
    } else if (name === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      let fmt = '';
      for (let i = 0; i < digits.length; i++) {
        fmt += digits[i];
        if ((i + 1) % 2 === 0 && i < digits.length - 1) fmt += ' ';
      }
      v = fmt;
    }
    setFormData(prev => ({ ...prev, [name]: v }));
  };

  const validateAddress = (addr: string): AddressValidation => {
    if (!addr) return { isValid: false, message: 'Adresse requise' };
    if (addr.length < 10) return { isValid: false, message: 'Adresse trop courte' };
    if (!/\b\d{5}\b/.test(addr)) return { isValid: false, message: 'Code postal requis (5 chiffres)' };
    if (!/\b[A-Za-zÀ-ÿ\s-]{2,}\b/.test(addr)) return { isValid: false, message: 'Nom de ville requis' };
    return { isValid: true, message: 'Adresse valide' };
  };

  const addressValidation = validateAddress(formData.address);
  const canSubmit = isPickup
    ? (!!pickupLocation && !!formData.firstName && !!formData.lastName && !!formData.email && !!formData.phone)
    : (addressValidation.isValid && !!formData.firstName && !!formData.lastName && !!formData.email && !!formData.phone);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = secureStorage.getItem('token');
      const shippingInfo = isPickup ? null : {
        firstName:  formData.firstName,
        lastName:   formData.lastName,
        email:      formData.email,
        phone:      formData.phone.replace(/\s/g, ''),
        address:    formData.address,
        city:       formData.city,
        postalCode: formData.postalCode,
        country:    'France',
      };

      const body: Record<string, unknown> = {
        shippingCost: isPickup ? 0 : shippingCost,
      };
      if (isPickup && pickupLocation) {
        body.pickupLocation = pickupLocation;
      } else {
        body.shippingInfo = shippingInfo;
        body.saveAddress = saveAddressChecked;
      }

      const res = await fetch(`${getApiUrl()}/api/payment/checkout/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || `Erreur ${res.status}`);
      }
      if (!data.clientSecret || !data.orderId) {
        throw new Error('Réponse invalide du serveur');
      }

      onNext({
        clientSecret: data.clientSecret,
        orderId: data.orderId,
        amount: typeof data.amount === 'number' ? data.amount : cartTotal,
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la commande. Veuillez réessayer.');
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white p-6 rounded-2xl shadow-lg"
    >
      <h2 className="text-2xl font-semibold mb-6 border-b pb-3">
        <span className="inline-flex items-center gap-2">
          <span className="bg-blue-600 text-white text-sm w-6 h-6 rounded-full flex items-center justify-center font-bold">1</span>
          Informations de Livraison
        </span>
      </h2>

      {/* Retrait sur place */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <input
            type="checkbox"
            id="retraitSurPlace"
            checked={isPickup}
            onChange={e => { setIsPickup(e.target.checked); if (!e.target.checked) setPickupLocation(null); }}
            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
          />
          <label htmlFor="retraitSurPlace" className="text-sm font-medium text-gray-800">
            Retrait sur place (pas de frais de port)
          </label>
        </div>
        {isPickup && (
          <div className="ml-7">
            <p className="text-sm text-gray-600 mb-2">Lieu de retrait :</p>
            <div className="flex gap-4">
              {['Arnas', 'Mezeria'].map(loc => (
                <label key={loc} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pickupLocation"
                    checked={pickupLocation === loc}
                    onChange={() => setPickupLocation(loc)}
                    className="h-4 w-4 text-amber-600 border-gray-300 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-900">{loc}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Shipping info banner */}
      {!isPickup && (
        <ShippingInfo shippingCalculation={shippingCalculation} isCalculating={isCalculatingShipping} />
      )}

      {/* Pre-fill notice */}
      {user && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700">
            📋 Informations pré-remplies depuis votre profil — modifiez si nécessaire.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Prénom / Nom */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
            <input
              id="firstName" type="text" name="firstName"
              value={formData.firstName} onChange={handleInputChange}
              className="form-input" placeholder="Votre prénom"
              required autoComplete="given-name"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input
              id="lastName" type="text" name="lastName"
              value={formData.lastName} onChange={handleInputChange}
              className="form-input" placeholder="Votre nom"
              required autoComplete="family-name"
            />
          </div>
        </div>

        {/* Email / Téléphone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              id="email" type="email" name="email"
              value={formData.email} onChange={handleInputChange}
              className="form-input" placeholder="votre@email.com"
              required autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
            <div className="relative flex items-center border border-gray-200 rounded-xl focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300">
              <div className="absolute left-0 pl-3 flex items-center h-full pointer-events-none">
                <FaPhoneAlt className="text-gray-400 h-4 w-4" />
              </div>
              <input
                id="phone" type="tel" name="phone"
                value={formData.phone} onChange={handleInputChange}
                className="w-full px-3 py-3 pl-10 border-none focus:ring-0 bg-transparent"
                placeholder="06 12 34 56 78"
                required autoComplete="tel" inputMode="numeric" maxLength={14}
              />
            </div>
          </div>
        </div>

        {/* Adresse (seulement si livraison) */}
        {!isPickup && (
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Adresse de livraison complète *
            </label>
            <AddressAutocomplete
              value={formData.address}
              onChange={(newAddress: string) => {
                setFormData(prev => ({ ...prev, address: newAddress }));
                if (newAddress.length > 10) calculateShippingForAddress(newAddress);
              }}
              placeholder="Commencez à taper votre adresse..."
              className="min-h-[50px]"
              onSelect={(suggestion: any) => {
                if (suggestion?.city) setFormData(prev => ({ ...prev, city: suggestion.city || '' }));
                if (suggestion?.postalCode) setFormData(prev => ({ ...prev, postalCode: suggestion.postalCode || '' }));
              }}
            />
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-500">💡 Commencez à taper pour voir des suggestions</p>
              {formData.address && (
                <div className={`text-xs ${addressValidation.isValid ? 'text-green-500' : 'text-orange-500'}`}>
                  {addressValidation.isValid ? '✅ ' : '⚠️ '}
                  {addressValidation.message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div>
          <label htmlFor="deliveryInstructions" className="block text-sm font-medium text-gray-700 mb-1">
            Instructions de livraison <span className="text-gray-500">(Optionnel)</span>
          </label>
          <textarea
            id="deliveryInstructions" name="deliveryInstructions"
            value={formData.deliveryInstructions} onChange={handleInputChange}
            className="form-input min-h-[70px]"
            placeholder="Ex: Laisser au gardien, code porte 1234..."
          />
        </div>

        {/* Sauvegarder l'adresse pour les prochains paiements */}
        {!isPickup && (
          <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              checked={saveAddressChecked}
              onChange={e => setSaveAddressChecked(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              Sauvegarder cette adresse pour mes prochains paiements
            </span>
          </label>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        )}

        {!canSubmit && isPickup && (
          <p className="text-amber-600 text-sm text-center">Veuillez sélectionner un lieu de retrait (Arnas ou Mezeria)</p>
        )}
        {!canSubmit && !isPickup && formData.address && !addressValidation.isValid && (
          <p className="text-orange-600 text-sm text-center">⚠️ Veuillez corriger l'adresse</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || isSubmitting || isCalculatingShipping}
          className={`button-primary w-full mt-4 ${(!canSubmit || isSubmitting || isCalculatingShipping) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? 'Création de la commande...' : isCalculatingShipping ? 'Calcul des frais...' : 'Continuer vers le paiement →'}
        </button>
      </form>
    </motion.div>
  );
};

// ─── Étape 2 : Paiement Stripe ────────────────────────────────────────────
interface PaymentStepProps {
  clientSecret: string;
  orderId: number;
  amount: number;
  onBack: () => void;
}

const PaymentForm: React.FC<{ clientSecret: string; orderId: number; amount: number; onBack: () => void }> = ({
  clientSecret, orderId, amount, onBack
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const paymentElementRef = useRef<HTMLDivElement>(null);
  const [isPaymentElementMounted, setIsPaymentElementMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!elements || !stripe) return;
    const timer = setTimeout(() => {
      const el = elements.getElement(PaymentElement);
      setIsPaymentElementMounted(!!el && !!paymentElementRef.current);
    }, 1000);
    return () => clearTimeout(timer);
  }, [elements, stripe]);

  const handlePay = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !isPaymentElementMounted) return;
    setIsProcessing(true);
    setMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-confirmation`,
      },
      redirect: 'always',
    });

    if (error) {
      setMessage(error.message || 'Une erreur est survenue lors du paiement.');
      setIsProcessing(false);
    }
    // Si pas d'erreur : redirect 'always' a redirigé le navigateur
  };

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white p-6 rounded-2xl shadow-lg"
    >
      <h2 className="text-2xl font-semibold mb-6 border-b pb-3">
        <span className="inline-flex items-center gap-2">
          <span className="bg-blue-600 text-white text-sm w-6 h-6 rounded-full flex items-center justify-center font-bold">2</span>
          Paiement
        </span>
      </h2>



      <form onSubmit={handlePay} className="space-y-5">
        <div ref={paymentElementRef}>
          <PaymentElement
            options={{
              layout: 'tabs',
              wallets: { applePay: 'auto', googlePay: 'auto' },
              business: { name: 'Les Rêves Bleus' },
              fields: { billingDetails: { address: { country: 'auto' } } },
            }}
          />
        </div>

        {!isPaymentElementMounted && (
          <p className="text-blue-600 text-sm text-center">Chargement du module de paiement...</p>
        )}

        {message && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            ⚠️ {message}
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing || !stripe || !elements || !isPaymentElementMounted}
          className={`button-primary w-full ${(isProcessing || !stripe || !elements || !isPaymentElementMounted) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isProcessing ? 'Traitement...' : `Payer ${amount.toFixed(2)} €`}
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="w-full mt-2 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <FaArrowLeft className="h-3 w-3" />
          Modifier mes informations de livraison
        </button>
      </form>
    </motion.div>
  );
};

const PaymentStep: React.FC<PaymentStepProps> = ({ clientSecret, orderId, amount, onBack }) => {
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
  const options: StripeElementsOptions = {
    clientSecret,
    appearance,
    locale: 'fr',
    loader: 'auto',
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm clientSecret={clientSecret} orderId={orderId} amount={amount} onBack={onBack} />
    </Elements>
  );
};

// ─── Page principale ───────────────────────────────────────────────────────
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  // Clé publique Stripe TEST (fallback). Pour repasser en LIVE, remplacer par
  // 'pk_live_51S0NqqLafvKJFJWDvDXxF1vkA6ZnzQq1jOAYObg9sk65jD37CTOjky81HX7KNyGfis6bvosJBI8VRU1WDiFPralS00VXorEKFP'
  // et basculer aussi sk_live / webhook live dans le SealedSecret.
  'pk_live_51S0NqqLafvKJFJWDswiJq3ZcdPu4RB5nOHd74r3emEleH2tlO68UWI7EBBNUsjtGfh9myMo0idOBtCa7hqiq5eC200V9CAWIXZ',
  { betas: [], locale: 'fr' }
);

const CheckoutPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [prefillAddress, setPrefillAddress] = useState<SavedAddress | null>(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const { cartItems, cartTotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/login?redirect=checkout'); return; }
    if (cartItems.length === 0 || cartTotal <= 0) navigate('/products');
  }, [user, cartItems.length, cartTotal, navigate]);

  // Reprise du checkout : on saute l'étape 1 si une commande PENDING existe et que
  // le panier est strictement identique. Sinon on pré-remplit l'adresse sauvegardée.
  const hasResumed = useRef(false);
  useEffect(() => {
    if (hasResumed.current) return;
    if (!user || cartItems.length === 0) return;
    hasResumed.current = true;

    (async () => {
      try {
        const token = secureStorage.getItem('token');
        const res = await fetch(`${getApiUrl()}/api/payment/checkout/resume`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.savedAddress) setPrefillAddress(data.savedAddress);
          if (data.pendingOrder?.clientSecret && data.pendingOrder?.orderId) {
            // Panier identique à une commande en attente → on saute directement au paiement
            setCheckoutData({
              clientSecret: data.pendingOrder.clientSecret,
              orderId: data.pendingOrder.orderId,
              amount: typeof data.pendingOrder.amount === 'number' ? data.pendingOrder.amount : cartTotal,
            });
            setStep(2);
          }
        }
      } catch {
        // Silencieux — on retombe simplement sur le flow normal (étape 1)
      } finally {
        setResumeLoading(false);
      }
    })();
  }, [user, cartItems.length, cartTotal]);

  const handleNext = (data: CheckoutData) => {
    setCheckoutData(data);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setStep(1);
    setCheckoutData(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="pt-24 pb-12">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Finaliser la Commande</h1>
          {/* Indicateur d'étapes */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className={`text-sm font-medium ${step === 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              1. Livraison
            </span>
            <span className="text-gray-300">→</span>
            <span className={`text-sm font-medium ${step === 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              2. Paiement
            </span>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Colonne gauche : résumé panier (toujours visible) */}
          <CartSummary />

          {/* Colonne droite : étape 1 ou 2 */}
          <AnimatePresence mode="wait">
            {resumeLoading ? (
              <motion.div
                key="resume-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white p-6 rounded-2xl shadow-lg flex items-center justify-center min-h-[320px]"
              >
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-500">Chargement de votre commande...</p>
                </div>
              </motion.div>
            ) : step === 1 ? (
              <ShippingStep key="step1" onNext={handleNext} prefillAddress={prefillAddress} />
            ) : (
              checkoutData && (
                <PaymentStep
                  key="step2"
                  clientSecret={checkoutData.clientSecret}
                  orderId={checkoutData.orderId}
                  amount={checkoutData.amount}
                  onBack={handleBack}
                />
              )
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
};

export default CheckoutPage;
