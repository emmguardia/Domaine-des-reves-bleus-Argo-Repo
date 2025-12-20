import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCheck, FaTruck, FaTimes } from 'react-icons/fa';

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
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const API_URL = import.meta.env.VITE_API_URL || 'https://domainedesrevesbleus.famillemntmata.eu';

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const url = filter !== 'all'
        ? `${API_URL}/api/admin/orders?status=${filter}`
        : `${API_URL}/api/admin/orders`;

      const response = await fetch(url, {
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
          console.error('Réponse non-JSON reçue pour les commandes');
        }
      } else {
        console.error('Erreur HTTP commandes:', response.status);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la commande:', error);
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
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Commandes</h1>
        <p className="text-gray-600 mt-2">Gérez les commandes de vos clients</p>
      </motion.div>

      <div className="mb-6 flex space-x-2">
        {['all', 'paid', 'preparing', 'shipped'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {status === 'all' ? 'Toutes' : getStatusLabel(status)}
          </button>
        ))}
      </div>

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

            <div className="flex justify-between items-center pt-4 border-t">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(order.totalAmount + order.shippingCost).toFixed(2)} €
                </p>
              </div>
              <div className="flex space-x-2">
                {order.status === 'paid' && (
                  <button
                    onClick={() => updateOrderStatus(order._id, 'preparing')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <FaCheck className="w-4 h-4" />
                    <span>Préparer</span>
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button
                    onClick={() => updateOrderStatus(order._id, 'shipped')}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                  >
                    <FaTruck className="w-4 h-4" />
                    <span>Envoyer</span>
                  </button>
                )}
                {(order.status === 'shipped' || order.status === 'delivered') && (
                  <button
                    onClick={() => deleteOrder(order._id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <FaTimes className="w-4 h-4" />
                    <span>Supprimer</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {orders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <p className="text-gray-600">Aucune commande trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminOrders;

