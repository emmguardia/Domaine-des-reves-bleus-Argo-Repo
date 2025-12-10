import React from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaTrash } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';

function Cart({ onClose }) {
  const { 
    cartItems, 
    removeFromCart, 
    updateQuantity, 
    cartTotal, 
    cartSubtotal, 
    shippingCost,
    shippingCalculation,
    isCalculatingShipping
  } = useCart();

  const totalWeightGrams = cartItems.reduce((sum, item) => sum + (item.weightGrams ?? 100) * item.quantity, 0);
  const totalWeightKg = (totalWeightGrams / 1000);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60]">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween' }}
        className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
      >
        <div className="p-6 flex-shrink-0 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-800">Panier</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Fermer le panier"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto px-6 py-4">
          {cartItems.length === 0 ? (
            <p className="text-gray-500 text-center mt-8">Votre panier est vide.</p>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={`${item.id}-${item.volume || 'no-volume'}`}
                  className="flex gap-3 p-3 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-800 truncate">{item.name}</h4>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-gray-700 text-sm font-medium">{item.price.toFixed(2)} €</span>
                          {item.volume && (
                            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border">
                              {item.volume}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id, item.volume)}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Supprimer l'article"
                        aria-label="Supprimer l'article"
                      >
                        <FaTrash />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1, item.volume)}
                          className="w-8 h-8 rounded-full border flex items-center justify-center text-gray-700 hover:bg-gray-50"
                          aria-label="Diminuer la quantité"
                        >
                          −
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-medium text-gray-800">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1, item.volume)}
                          className="w-8 h-8 rounded-full border flex items-center justify-center text-gray-700 hover:bg-gray-50"
                          aria-label="Augmenter la quantité"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-sm text-gray-700">
                        Sous-total: <span className="font-semibold">{(item.price * item.quantity).toFixed(2)} €</span>
                      </div>
                    </div>

                    <div className="mt-2 text-[12px] text-gray-500">
                      Poids: {(item.weightGrams ?? 100)} g / unité • Total: {((item.weightGrams ?? 100) * item.quantity)} g
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="border-t p-6 flex-shrink-0 bg-white">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sous-total</span>
                <span className="font-medium">{cartSubtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Poids total</span>
                <span>{totalWeightGrams} g ({totalWeightKg.toFixed(2)} kg)</span>
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
                <div className="flex justify-between text-sm font-medium">
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
              <div className="flex justify-between font-bold text-lg border-t pt-3 mt-2 text-gray-900">
                <span>Total</span>
                <span>{cartTotal.toFixed(2)} €</span>
              </div>
            </div>
            <Link
              to="/checkout"
              className="button-primary w-full block text-center"
              onClick={onClose}
            >
              Procéder au paiement
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default Cart; 