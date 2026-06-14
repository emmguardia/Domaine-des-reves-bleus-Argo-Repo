import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCheck, FaTruck, FaTimes, FaArrowLeft } from 'react-icons/fa';
import { getApiUrl, adminFetch } from '../../utils/security';
interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  image: string;
}
interface Order {
  _id: string;
  id?: string | number;
  paymentIntentId?: string;
  payment_intent_id?: string;
  items?: OrderItem[];
  totalAmount?: number;
  total_amount?: number;
  shippingCost?: number;
  shipping_cost?: number;
  shippingAddress: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    pickupLocation?: 'Arnas' | 'Mezeria';
  };
  shipping_address?: string | Record<string, unknown>;
  status: string;
  paymentStatus?: string;
  payment_status?: string;
  createdAt?: string;
  created_at?: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}
function AdminOrders() {
  const getOrderId = (order: Order) => String(order._id || order.id || '');
  const getPaymentIntentId = (order: Order) => String(order.paymentIntentId || order.payment_intent_id || '');
  const getCreatedAt = (order: Order) => order.createdAt || order.created_at || new Date().toISOString();
  const getItems = (order: Order) => Array.isArray(order.items) ? order.items : [];
  const getShippingCost = (order: Order) => Number(order.shippingCost ?? order.shipping_cost ?? 0);
  const getPaymentStatus = (order: Order) => String(order.paymentStatus || order.payment_status || '').toLowerCase();
  const getOrderStatus = (order: Order) => String(order.status || '').toLowerCase();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const API_URL = getApiUrl();
  useEffect(() => {
    fetchOrders();
  }, [filter]);
  const fetchOrders = async () => {
    try {
      const url = filter === 'failed'
        ? `${API_URL}/api/admin/orders?paymentStatus=failed`
        : (filter !== 'all'
          ? `${API_URL}/api/admin/orders?status=${filter}`
          : `${API_URL}/api/admin/orders`);
      const response = await adminFetch(url);
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
      const response = await adminFetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
    setDeleteError(null);
    try {
      const response = await adminFetch(`${API_URL}/api/admin/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setConfirmDeleteId(null);
        fetchOrders();
      } else {
        const data = await response.json().catch(() => ({}));
        setDeleteError(data.detail || `Erreur ${response.status}`);
      }
    } catch {
      setDeleteError('Erreur réseau lors de la suppression');
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-orange-100 text-orange-700';
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
        return 'En attente';
      case 'pending':
        return 'Non payée';
      case 'preparing':
        return 'En préparation';
      case 'shipped':
        return 'Envoyée';
      case 'delivered':
        return 'Livrée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
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
      <div className="mb-6 flex flex-wrap gap-2">
        {['all', 'paid', 'preparing', 'shipped', 'delivered', 'failed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {status === 'all' ? 'Toutes' : (status === 'failed' ? 'Paiement échoué' : getStatusLabel(status))}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {orders.map((order) => (
          <motion.div
            key={getOrderId(order)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Commande #{(getPaymentIntentId(order) || 'N/A').slice(-8)}
                </h3>
                <p className="text-sm text-gray-600">
                  {new Date(getCreatedAt(order)).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(getOrderStatus(order))}`}>
                {getStatusLabel(getOrderStatus(order))}
              </span>
            </div>
            <div className="mb-4">
              {(() => {
                const orderSt = getOrderStatus(order);
                const paymentSt = getPaymentStatus(order);
                if (orderSt === 'pending') {
                  return (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                      En attente de paiement
                    </span>
                  );
                }
                if (orderSt === 'cancelled') {
                  return (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Annulée / Paiement échoué
                    </span>
                  );
                }
                if (paymentSt === 'succeeded' || ['paid','preparing','shipped','delivered'].includes(orderSt)) {
                  return (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Paiement validé
                    </span>
                  );
                }
                return (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    Paiement échoué
                  </span>
                );
              })()}
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Articles</h4>
                <div className="space-y-2">
                  {getItems(order).map((item, index) => (
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
                <h4 className="font-medium text-gray-900 mb-2">
                  {(() => {
                    const ship = typeof order.shipping_address === 'string'
                      ? (() => { try { return JSON.parse(order.shipping_address); } catch { return null; } })()
                      : (order.shipping_address || order.shippingAddress);
                    const isPickup = ship?.address?.startsWith?.('Retrait sur place') || ship?.pickupLocation;
                    return isPickup ? 'Retrait sur place' : 'Livraison';
                  })()}
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {(() => {
                    const ship = typeof order.shipping_address === 'string'
                      ? (() => { try { return JSON.parse(order.shipping_address); } catch { return null; } })()
                      : (order.shipping_address || order.shippingAddress);
                    const isPickup = ship?.address?.startsWith?.('Retrait sur place') || ship?.pickupLocation;
                    if (isPickup) {
                      const loc = ship?.pickupLocation || (ship?.address?.includes('Mezeria') ? 'Mezeria' : 'Arnas');
                      return <p className="font-medium text-gray-900">Lieu : {loc}</p>;
                    }
                    const s = order.shippingAddress || ship;
                    return (
                      <>
                        <p><strong>{s?.firstName} {s?.lastName}</strong></p>
                        <p>{s?.address}</p>
                        {s?.city && <p>{s?.postalCode} {s?.city}</p>}
                        <p>{s?.email}</p>
                        <p>{s?.phone}</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-end pt-4 border-t">
              <div className="space-y-0.5">
                {(() => {
                  // On calcule le sous-total à partir des order_items (autoritaire et fiable
                  // quelle que soit la convention stockée dans orders.total_amount).
                  const subtotal = getItems(order).reduce(
                    (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0
                  );
                  const shipping = getShippingCost(order);
                  const total = subtotal + shipping;
                  return (
                    <>
                      <p className="text-sm text-gray-600">
                        Sous-total : <span className="font-medium text-gray-900">{subtotal.toFixed(2)} €</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Frais de port : <span className="font-medium text-gray-900">{shipping.toFixed(2)} €</span>
                      </p>
                      <p className="text-sm text-gray-600 pt-1">
                        Total : <span className="text-2xl font-bold text-gray-900">{total.toFixed(2)} €</span>
                      </p>
                    </>
                  );
                })()}
              </div>
              <div className="flex space-x-2">
                {getOrderStatus(order) === 'preparing' && (
                  <button
                    onClick={() => updateOrderStatus(getOrderId(order), 'paid')}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center space-x-2"
                  >
                    <FaArrowLeft className="w-4 h-4" />
                    <span>Revenir attente</span>
                  </button>
                )}
                {getOrderStatus(order) === 'shipped' && (
                  <button
                    onClick={() => updateOrderStatus(getOrderId(order), 'preparing')}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center space-x-2"
                  >
                    <FaArrowLeft className="w-4 h-4" />
                    <span>Revenir préparation</span>
                  </button>
                )}
                {getOrderStatus(order) === 'paid' && (
                  <button
                    onClick={() => updateOrderStatus(getOrderId(order), 'preparing')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <FaCheck className="w-4 h-4" />
                    <span>Préparer</span>
                  </button>
                )}
                {getOrderStatus(order) === 'preparing' && (
                  <button
                    onClick={() => updateOrderStatus(getOrderId(order), 'shipped')}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                  >
                    <FaTruck className="w-4 h-4" />
                    <span>Envoyer</span>
                  </button>
                )}
                {(['shipped', 'delivered', 'cancelled', 'pending'].includes(getOrderStatus(order))) && (
                  confirmDeleteId === getOrderId(order) ? (
                    <div className="flex items-center gap-2">
                      {deleteError && (
                        <span className="text-xs text-red-600">{deleteError}</span>
                      )}
                      <span className="text-sm text-gray-700">Confirmer ?</span>
                      <button
                        onClick={() => deleteOrder(getOrderId(order))}
                        className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Oui, supprimer
                      </button>
                      <button
                        onClick={() => { setConfirmDeleteId(null); setDeleteError(null); }}
                        className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setConfirmDeleteId(getOrderId(order)); setDeleteError(null); }}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                    >
                      <FaTimes className="w-4 h-4" />
                      <span>Supprimer</span>
                    </button>
                  )
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
