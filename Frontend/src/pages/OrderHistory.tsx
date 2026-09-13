import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/security';
import { secureStorage } from '../utils/security';
import { logger } from '../utils/logger';
import { FaBox, FaTruck, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  image: string;
}
interface Order {
  _id: number;
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
}
// L'appel réseau est isolé du state : il se contente de renvoyer les données.
// L'effet peut alors n'écrire dans le state que depuis le callback de la
// promesse, et jamais synchroniquement dans son corps.
// Les messages levés ici sont ceux affichés à l'utilisateur.
async function loadOrders(signal?: AbortSignal): Promise<Order[]> {
  const token = secureStorage.getItem('token');
  if (!token) throw new Error('Non authentifié');
  const response = await fetch(`${getApiUrl()}/api/user/orders`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    signal,
  });
  if (!response.ok) throw new Error('Erreur lors du chargement des commandes');
  return response.json();
}
function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Chargement initial. L'AbortController annule la requête au démontage : plus
  // de mise à jour d'un composant disparu, et en StrictMode la réponse du
  // premier montage ne vient plus écraser celle du second.
  useEffect(() => {
    const ac = new AbortController();
    loadOrders(ac.signal)
      .then(data => { setOrders(data); setLoading(false); })
      .catch(err => {
        if (ac.signal.aborted) return;
        logger.error('Erreur:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des commandes');
        setLoading(false);
      });
    return () => ac.abort();
  }, []);
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <FaCheckCircle className="text-green-500" />;
      case 'shipped':
        return <FaTruck className="text-blue-500" />;
      case 'cancelled':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaClock className="text-yellow-500" />;
    }
  };
  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: 'En attente',
      paid: 'Payée',
      preparing: 'En préparation',
      shipped: 'Expédiée',
      delivered: 'Livrée',
      cancelled: 'Annulée'
    };
    return labels[status] || status;
  };
  if (loading) {
    return (
      <div className="pt-24 pb-12 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="pt-24 pb-12 min-h-screen bg-gray-50">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="pt-24 pb-12 min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Historique des commandes</h1>
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <FaBox className="text-6xl text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600 mb-2">Aucune commande</p>
            <p className="text-gray-500">Vous n'avez pas encore passé de commande</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Commande #{order._id}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.status)}
                    <span className="font-medium text-gray-700">
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                </div>
                <div className="border-t pt-4 mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Articles:</h4>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{item.name}</p>
                          <p className="text-sm text-gray-500">
                            Quantité: {item.quantity} × {item.price.toFixed(2)} €
                          </p>
                        </div>
                        <p className="font-semibold text-gray-800">
                          {(item.price * item.quantity).toFixed(2)} €
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Frais de port:</span>
                    <span className="font-medium">{order.shippingCost.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-blue-600">
                      {(order.totalAmount + order.shippingCost).toFixed(2)} €
                    </span>
                  </div>
                </div>
                {order.shippingAddress && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium text-gray-700 mb-2">Adresse de livraison:</h4>
                    <p className="text-sm text-gray-600">
                      {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{order.shippingAddress.address}</p>
                    <p className="text-sm text-gray-600">
                      {order.shippingAddress.postalCode} {order.shippingAddress.city}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default OrderHistory;
