import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getApiUrl } from '../../utils/security';
import { secureStorage } from '../../utils/security';
import { logger } from '../../utils/logger';

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface Order {
  _id: string;
  paymentIntentId: string;
  items: OrderItem[];
  totalAmount: number;
  shippingCost: number;
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city?: string;
    postalCode?: string;
  };
  status: string;
  paymentStatus: string;
  createdAt: string;
  shippedAt?: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

function AdminOrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = getApiUrl();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = secureStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/orders/history/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setOrders(data);
        } else {
          console.error('Réponse non-JSON reçue pour l\'historique');
        }
      } else {
        console.error('Erreur HTTP historique:', response.status);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'preparing':
        return 'bg-blue-100 text-blue-700';
      case 'shipped':
        return 'bg-purple-100 text-purple-700';
      case 'delivered':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payée';
      case 'preparing':
        return 'En préparation';
      case 'shipped':
        return 'Envoyée';
      case 'delivered':
        return 'Livrée';
      case 'cancelled':
        return 'Annulée';
      default:
        return 'En attente';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900">Historique des Commandes</h1>
        <p className="text-gray-600 mt-2">Consultez toutes les commandes passées</p>
      </motion.div>

      <div className="space-y-4">
        {orders.map((order) => (
          <motion.div
            key={order._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Commande #{order.paymentIntentId.slice(-8)}
                </h3>
                <p className="text-sm text-gray-600">
                  {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {order.shippedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Envoyée le {new Date(order.shippedAt).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Articles</h4>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-600">
                          {item.quantity} x {item.price.toFixed(2)} €
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {(item.price * item.quantity).toFixed(2)} €
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Livraison</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <strong>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</strong>
                  </p>
                  <p>{order.shippingAddress.address}</p>
                  {order.shippingAddress.city && (
                    <p>{order.shippingAddress.postalCode} {order.shippingAddress.city}</p>
                  )}
                  <p>{order.shippingAddress.email}</p>
                  <p>{order.shippingAddress.phone}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(order.totalAmount + order.shippingCost).toFixed(2)} €
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Paiement</p>
                  <p className={`text-sm font-medium ${
                    order.paymentStatus === 'succeeded' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {order.paymentStatus === 'succeeded' ? 'Payé' : 'Échoué'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {orders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <p className="text-gray-600">Aucune commande dans l'historique</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminOrderHistory;

