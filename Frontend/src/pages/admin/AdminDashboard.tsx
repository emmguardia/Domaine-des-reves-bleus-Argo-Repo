import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FaBox, FaShoppingCart, FaExclamationTriangle, FaEuroSign,
  FaChartLine, FaArrowRight, FaCheckCircle, FaClock, FaTruck,
  FaUsers, FaTags
} from 'react-icons/fa';
import { getApiUrl, adminFetch } from '../../utils/security';
import { logger } from '../../utils/logger';

interface RecentOrder {
  id: number;
  paymentIntentId: string;
  totalAmount: number;
  shippingCost: number;
  status: string;
  createdAt: string;
  customerName: string;
}

function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const API_URL = getApiUrl();

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchStats();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await adminFetch(`${API_URL}/api/admin/stats`, { cache: 'no-store' });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setStats(data);
        }
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques:', error);
    } finally {
      setLoading(false);
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

  const greeting = 'Bonjour Laurence';

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const recentOrders: RecentOrder[] = stats?.recentPaidOrders || [];
  const paidWaiting = Number(stats?.orders?.pending || 0);
  const lowStock   = Number(stats?.products?.lowStock || 0);
  const outOfStock = Number(stats?.products?.outOfStock || 0);
  const alertsCount = (paidWaiting > 0 ? 1 : 0) + (lowStock > 0 ? 1 : 0) + (outOfStock > 0 ? 1 : 0);

  const kpis = [
    {
      title: 'Chiffre d\'affaires',
      value: `${(stats?.revenue?.gross || 0).toFixed(2)} €`,
      sub: 'depuis l\'ouverture',
      icon: FaEuroSign,
      gradient: 'from-emerald-500 to-teal-600',
      link: '/admin-panel/stats',
    },
    {
      title: 'Commandes payées',
      value: stats?.orders?.total || 0,
      sub: 'au total',
      icon: FaShoppingCart,
      gradient: 'from-blue-500 to-indigo-600',
      link: '/admin-panel/orders',
    },
    {
      title: 'Produits en catalogue',
      value: stats?.products?.total || 0,
      sub: 'références actives',
      icon: FaBox,
      gradient: 'from-purple-500 to-fuchsia-600',
      link: '/admin-panel/products',
    },
    {
      title: 'Alertes à traiter',
      value: alertsCount,
      sub: alertsCount === 0 ? 'tout est OK ✨' : 'point(s) d\'attention',
      icon: FaExclamationTriangle,
      gradient: alertsCount === 0 ? 'from-gray-400 to-gray-500' : 'from-amber-500 to-orange-600',
      link: '/admin-panel/orders',
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl mb-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white p-8 shadow-xl"
      >
        <div className="relative z-10">
          <p className="text-white/80 text-sm capitalize">{today}</p>
          <h1 className="text-4xl font-bold mt-1">{greeting} 👋</h1>
          <p className="text-white/90 mt-2 text-lg">Voici un aperçu de votre boutique.</p>
        </div>
        {/* Cercles décoratifs */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -right-20 bottom-0 w-64 h-64 bg-pink-400/20 rounded-full blur-3xl"></div>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                to={k.link}
                className={`relative block rounded-2xl p-5 text-white shadow-lg overflow-hidden bg-gradient-to-br ${k.gradient} hover:scale-[1.02] transition-transform duration-200`}
              >
                <div className="flex justify-between items-start mb-3">
                  <Icon className="w-7 h-7 text-white/80" />
                  <FaArrowRight className="w-3 h-3 text-white/60 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-3xl font-bold">{k.value}</p>
                <p className="text-white/90 text-sm font-medium mt-1">{k.title}</p>
                <p className="text-white/70 text-xs mt-0.5">{k.sub}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Section Alertes / Actions à faire */}
      {alertsCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-white rounded-2xl shadow-lg p-6 border-l-4 border-amber-500"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FaExclamationTriangle className="text-amber-500" />
            Actions à effectuer
          </h2>
          <div className="space-y-2">
            {paidWaiting > 0 && (
              <Link
                to="/admin-panel/orders"
                className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500 text-white p-2 rounded-lg"><FaClock /></div>
                  <span className="text-gray-800">
                    <span className="font-bold">{paidWaiting}</span> commande{paidWaiting > 1 ? 's' : ''} payée{paidWaiting > 1 ? 's' : ''} en attente de préparation
                  </span>
                </div>
                <FaArrowRight className="text-blue-500" />
              </Link>
            )}
            {outOfStock > 0 && (
              <Link
                to="/admin-panel/products"
                className="flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-red-500 text-white p-2 rounded-lg"><FaBox /></div>
                  <span className="text-gray-800">
                    <span className="font-bold">{outOfStock}</span> produit{outOfStock > 1 ? 's' : ''} en rupture de stock
                  </span>
                </div>
                <FaArrowRight className="text-red-500" />
              </Link>
            )}
            {lowStock > 0 && (
              <Link
                to="/admin-panel/products"
                className="flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500 text-white p-2 rounded-lg"><FaExclamationTriangle /></div>
                  <span className="text-gray-800">
                    <span className="font-bold">{lowStock}</span> produit{lowStock > 1 ? 's' : ''} en stock faible (≤ 5)
                  </span>
                </div>
                <FaArrowRight className="text-orange-500" />
              </Link>
            )}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Pipeline commandes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FaShoppingCart className="text-blue-500" />
            Pipeline des commandes
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-transparent">
              <div className="flex items-center gap-2">
                <FaClock className="text-blue-500" />
                <span className="text-sm text-gray-700">À préparer</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">{stats?.orders?.pending || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-50 to-transparent">
              <div className="flex items-center gap-2">
                <FaBox className="text-purple-500" />
                <span className="text-sm text-gray-700">En préparation</span>
              </div>
              <span className="text-2xl font-bold text-purple-600">{stats?.orders?.preparing || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-50 to-transparent">
              <div className="flex items-center gap-2">
                <FaTruck className="text-green-500" />
                <span className="text-sm text-gray-700">Envoyées</span>
              </div>
              <span className="text-2xl font-bold text-green-600">{stats?.orders?.shipped || 0}</span>
            </div>
          </div>
        </motion.div>

        {/* Activité récente */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FaCheckCircle className="text-green-500" />
              Activité récente
            </h2>
            <Link to="/admin-panel/orders" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Voir tout <FaArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <div className="text-4xl mb-2">🌱</div>
              <p className="text-sm">Vos prochaines commandes apparaîtront ici</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentOrders.map((o) => {
                const total = (Number(o.totalAmount) || 0) + (Number(o.shippingCost) || 0);
                const date = new Date(o.createdAt);
                return (
                  <div key={o.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="bg-gradient-to-br from-green-100 to-emerald-100 text-green-700 w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0">
                        {(o.customerName || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{o.customerName}</p>
                        <p className="text-xs text-gray-500">
                          {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold bg-gray-100 text-gray-600">{o.status}</span>
                        </p>
                      </div>
                    </div>
                    <p className="text-base font-bold text-gray-900 ml-2 whitespace-nowrap">
                      {total.toFixed(2)} €
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Bloc revenus détaillé */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900 to-slate-800 text-white rounded-2xl shadow-lg p-6 mb-8"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FaChartLine className="text-emerald-400" />
            Détail des revenus
          </h2>
          <Link to="/admin-panel/stats" className="text-sm text-emerald-300 hover:underline flex items-center gap-1">
            Stats avancées <FaArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/70 text-xs uppercase font-semibold mb-1">Brut (avec livraison)</p>
            <p className="text-3xl font-bold text-emerald-400">
              {(stats?.revenue?.gross || 0).toFixed(2)} €
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/70 text-xs uppercase font-semibold mb-1">Net (hors livraison)</p>
            <p className="text-3xl font-bold text-blue-300">
              {(stats?.revenue?.net || 0).toFixed(2)} €
            </p>
          </div>
        </div>
      </motion.div>

      {/* Raccourcis rapides */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {[
          { to: '/admin-panel/products',  label: 'Produits',    icon: FaBox,           color: 'text-purple-600' },
          { to: '/admin-panel/categories', label: 'Catégories', icon: FaTags,          color: 'text-pink-600' },
          { to: '/admin-panel/users',      label: 'Utilisateurs', icon: FaUsers,       color: 'text-blue-600' },
          { to: '/admin-panel/stats',      label: 'Statistiques', icon: FaChartLine,   color: 'text-emerald-600' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.to}
              to={s.to}
              className="flex flex-col items-center gap-2 bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-4"
            >
              <Icon className={`w-6 h-6 ${s.color}`} />
              <span className="text-sm font-medium text-gray-700">{s.label}</span>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}

export default AdminDashboard;
