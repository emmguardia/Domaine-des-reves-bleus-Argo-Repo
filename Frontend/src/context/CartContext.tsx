import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { sendOrderConfirmationEmail } from '../services/emailService';
import { calculateShippingCost, calculateShippingCostFallback, validateDeliveryAddress } from '../services/shippingService';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  volume?: string | null;
  weightGrams?: number; // poids par article en grammes (par défaut 100g)
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: number, volume?: string | null) => void;
  updateQuantity: (itemId: number, quantity: number, volume?: string | null) => void;
  clearCart: () => void;
  sendOrderConfirmation: (orderData: any) => Promise<boolean>;
  cartCount: number;
  cartSubtotal: number;
  shippingCost: number;
  cartTotal: number;
  // Nouvelles propriétés pour le calcul des frais de port
  deliveryAddress: string;
  setDeliveryAddress: (address: string) => void;
  shippingCalculation: any | null;
  isCalculatingShipping: boolean;
  calculateShippingForAddress: (address: string) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [shippingCalculation, setShippingCalculation] = useState<any | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState<boolean>(false);
  const { user, logout } = useAuth();
  const isUpdatingFromBackend = useRef(false);

  // Configurer l'intercepteur axios pour gérer les erreurs 401
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          if (import.meta.env.DEV) {
            console.log('Erreur 401 détectée, déconnexion automatique...');
          }
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  // Charger le panier au démarrage et quand l'utilisateur change
  useEffect(() => {
    const loadCart = async () => {
      if (user) {
        try {
          if (import.meta.env.DEV) {
            console.log('Chargement du panier depuis le backend pour l\'utilisateur:', user._id);
          }
          const token = localStorage.getItem('token');
          if (!token) {
            console.error('Token non trouvé');
            return;
          }

          const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/cart`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (import.meta.env.DEV) {
            console.log('Réponse du backend:', response.data);
          }
          if (response.data && response.data.items) {
            isUpdatingFromBackend.current = true;
            // Vérifier que les poids sont présents
            const itemsWithWeights = response.data.items.map((item: any) => {
              if (!item.weightGrams) {
                console.warn(`Item ${item.id} (${item.name}) n'a pas de weightGrams, utilisation de 100g par défaut`);
                return { ...item, weightGrams: 100 };
              }
              return item;
            });
            
            // Calculer le poids total pour vérification
            const totalWeightGrams = itemsWithWeights.reduce((sum: number, item: any) => 
              sum + (item.weightGrams || 100) * item.quantity, 0
            );
            if (import.meta.env.DEV) {
              console.log('Poids total du panier:', totalWeightGrams, 'grammes (', (totalWeightGrams / 1000).toFixed(2), 'kg)');
              console.log('Détail des poids:', itemsWithWeights.map((item: any) => 
                `${item.name}: ${item.weightGrams}g x ${item.quantity} = ${item.weightGrams * item.quantity}g`
              ));
            }
            
            setCartItems(itemsWithWeights);
            if (import.meta.env.DEV) {
              console.log('Panier chargé avec succès:', itemsWithWeights);
            }
          } else {
            if (import.meta.env.DEV) {
              console.log('Aucun panier trouvé, initialisation d\'un panier vide');
            }
            setCartItems([]);
          }
        } catch (error) {
          console.error('Erreur lors du chargement du panier:', error);
          if (axios.isAxiosError(error)) {
            console.error('Détails de l\'erreur:', error.response?.data);
            // Si erreur 401, logout() est déjà appelé par l'intercepteur
          }
          setCartItems([]);
        }
      } else {
        if (import.meta.env.DEV) {
          console.log('Utilisateur non connecté, panier vide');
        }
        setCartItems([]);
      }
    };

    loadCart();
  }, [user]);

  // Sauvegarder le panier quand il change
  useEffect(() => {
    if (user && cartItems.length > 0 && !isUpdatingFromBackend.current) {
      const saveCart = async () => {
        try {
          if (import.meta.env.DEV) {
            console.log('Sauvegarde du panier sur le backend pour l\'utilisateur:', user._id);
            console.log('Données à sauvegarder:', cartItems);
          }
          
          // Nettoyer les données pour s'assurer que tous les champs requis sont présents
          const cleanItems = cartItems
            .filter(item => item.id && item.name && item.price && item.quantity && item.image)
            .map(item => ({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.image,
              volume: item.volume ?? undefined,
              weightGrams: item.weightGrams ?? 100
            }));
          
          if (import.meta.env.DEV) {
            console.log('Données nettoyées:', cleanItems);
          }
          
          const token = localStorage.getItem('token');
          if (!token) {
            console.error('Token non trouvé');
            return;
          }

          const response = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/cart`,
            { items: cleanItems },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          if (import.meta.env.DEV) {
            console.log('Réponse du backend après sauvegarde:', response.data);
          }
          
          // Mettre à jour l'état local avec les données reçues du backend
          if (response.data && response.data.items) {
            isUpdatingFromBackend.current = true;
            setCartItems(response.data.items);
            if (import.meta.env.DEV) {
              console.log('État local mis à jour avec les données du backend:', response.data.items);
            }
            // Reset le flag après un court délai
            setTimeout(() => {
              isUpdatingFromBackend.current = false;
            }, 100);
          }
        } catch (error) {
          console.error('Erreur lors de la sauvegarde du panier:', error);
          if (axios.isAxiosError(error)) {
            console.error('Détails de l\'erreur:', error.response?.data);
            // Si erreur 401, logout() est déjà appelé par l'intercepteur
          }
        }
      };
      saveCart();
    } else if (isUpdatingFromBackend.current) {
      // Reset le flag si on vient du backend
      isUpdatingFromBackend.current = false;
    }
  }, [cartItems, user]);

  const addToCart = (item: CartItem) => {
    if (import.meta.env.DEV) {
      console.log('Ajout au panier:', item);
    }
    setCartItems(prevItems => {
      // Chercher un item existant avec le même ID ET le même volume
      const existingItem = prevItems.find(i => 
        i.id === item.id && i.volume === item.volume
      );
      if (existingItem) {
        const newItems = prevItems.map(i =>
          (i.id === item.id && i.volume === item.volume) ? { ...i, quantity: i.quantity + 1 } : i
        );
        if (import.meta.env.DEV) {
          console.log('Mise à jour de la quantité pour l\'article existant:', newItems);
        }
        return newItems;
      }
      const newItems = [...prevItems, { ...item, quantity: 1, weightGrams: item.weightGrams ?? 100 }];
      if (import.meta.env.DEV) {
        console.log('Ajout d\'un nouvel article au panier:', newItems);
      }
      return newItems;
    });
  };

  const removeFromCart = (itemId: number, volume?: string | null) => {
    if (import.meta.env.DEV) {
      console.log('Suppression du panier:', itemId, volume);
    }
    setCartItems(prevItems => {
      const newItems = prevItems.filter(item => 
        !(item.id === itemId && item.volume === volume)
      );
      if (import.meta.env.DEV) {
        console.log('Nouveau panier après suppression:', newItems);
      }
      return newItems;
    });
  };

  const updateQuantity = (itemId: number, quantity: number, volume?: string | null) => {
    if (import.meta.env.DEV) {
      console.log('Mise à jour quantité:', itemId, quantity, volume);
    }
    if (quantity <= 0) {
      removeFromCart(itemId, volume);
    } else {
      setCartItems(prevItems => {
        const newItems = prevItems.map(item =>
          (item.id === itemId && item.volume === volume) ? { ...item, quantity } : item
        );
        if (import.meta.env.DEV) {
          console.log('Nouveau panier après mise à jour de la quantité:', newItems);
        }
        return newItems;
      });
    }
  };

  const clearCart = () => {
    if (import.meta.env.DEV) {
      console.log('Vidage du panier');
    }
    setCartItems([]);
    setDeliveryAddress('');
    setShippingCalculation(null);
  };

  // Fonction pour calculer les frais de port pour une adresse donnée
  const calculateShippingForAddress = async (address: string) => {
    if (!address || cartItems.length === 0) {
      setShippingCalculation(null);
      return;
    }

    setIsCalculatingShipping(true);
    setDeliveryAddress(address);

    try {
      // Valider l'adresse
      if (!validateDeliveryAddress(address)) {
        console.warn('Adresse de livraison invalide, utilisation du calcul par défaut');
        const fallbackCalculation = calculateShippingCostFallback(cartWeightGrams);
        setShippingCalculation(fallbackCalculation);
        setIsCalculatingShipping(false);
        return;
      }

      // Calculer les frais de port avec géolocalisation
      if (import.meta.env.DEV) {
        console.log('Calcul des frais de port pour:', cartWeightGrams, 'grammes (', (cartWeightGrams / 1000).toFixed(2), 'kg)');
        console.log('Détail des items:', cartItems.map(item => 
          `${item.name}: ${item.weightGrams ?? 100}g x ${item.quantity} = ${(item.weightGrams ?? 100) * item.quantity}g`
        ));
      }
      
      const calculation = await calculateShippingCost(address, cartWeightGrams);
      
      if (calculation) {
        setShippingCalculation(calculation);
        if (import.meta.env.DEV) {
          console.log('Calcul des frais de port réussi:', calculation);
          console.log('Prix La Poste calculé pour', calculation.weightKg, 'kg:', calculation.basePrice, '€');
        }
      } else {
        // Fallback en cas d'erreur
        const fallbackCalculation = calculateShippingCostFallback(cartWeightGrams);
        setShippingCalculation(fallbackCalculation);
        if (import.meta.env.DEV) {
          if (import.meta.env.DEV) {
          console.log('Utilisation du calcul par défaut:', fallbackCalculation);
        }
        }
      }
    } catch (error) {
      console.error('Erreur lors du calcul des frais de port:', error);
      // Fallback en cas d'erreur
      const fallbackCalculation = calculateShippingCostFallback(cartWeightGrams);
      setShippingCalculation(fallbackCalculation);
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  const sendOrderConfirmation = async (orderData: any): Promise<boolean> => {
    if (!user) return false;

    try {
      const orderItems = cartItems.map(item => 
        `- ${item.name}${item.volume ? ` (${item.volume})` : ''} x${item.quantity} - ${(item.price * item.quantity).toFixed(2)}€`
      ).join('\n');

      const success = await sendOrderConfirmationEmail({
        to_email: user.email,
        to_name: `${user.firstName} ${user.lastName}`,
        order_number: orderData.orderNumber || `CMD-${Date.now()}`,
        order_items: orderItems,
        order_total: `Sous-total: ${cartSubtotal.toFixed(2)}€\nFrais de port: ${shippingCost.toFixed(2)}€\nTotal: ${cartTotal.toFixed(2)}€`,
        shipping_address: orderData.shippingAddress || 'Adresse non spécifiée'
      });

      return success;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la confirmation de commande:', error);
      return false;
    }
  };

  const cartCount = useMemo(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }, [cartItems]);

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cartItems]);

  // Calcul du poids total en grammes
  const cartWeightGrams = useMemo(() => {
    const totalWeight = cartItems.reduce((sum, item) => sum + (item.weightGrams ?? 100) * item.quantity, 0);
    return totalWeight;
  }, [cartItems]);

  // Calcul des frais de port avec le nouveau système
  const shippingCost = useMemo(() => {
    if (cartItems.length === 0) return 0;

    // Si on a un calcul précis avec l'adresse, l'utiliser
    if (shippingCalculation) {
      return shippingCalculation.totalShipping;
    }

    // Sinon, utiliser le calcul par défaut (fallback)
    const fallbackCalculation = calculateShippingCostFallback(cartWeightGrams);
    return fallbackCalculation.totalShipping;
  }, [cartItems, shippingCalculation, cartWeightGrams]);

  const cartTotal = useMemo(() => {
    return cartSubtotal + shippingCost;
  }, [cartSubtotal, shippingCost]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        sendOrderConfirmation,
        cartCount,
        cartSubtotal,
        shippingCost,
        cartTotal,
        // Nouvelles propriétés
        deliveryAddress,
        setDeliveryAddress,
        shippingCalculation,
        isCalculatingShipping,
        calculateShippingForAddress
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}; 