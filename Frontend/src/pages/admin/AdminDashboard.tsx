import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaBox, FaShoppingCart, FaExclamationTriangle, FaEuroSign } from 'react-icons/fa';
import { getApiUrl } from '../../utils/security';
import { secureStorage } from '../../utils/security';
import { logger } from '../../utils/logger';

function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const API_URL = getApiUrl();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = secureStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setStats(data);
        } else {
          logger.error('Réponse non-JSON reçue pour les stats');
        }
      } else {
        logger.error('Erreur HTTP stats:', response.status);
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

  const statCards = [
    {
      title: 'Total Produits',
      value: stats?.products?.total || 0,
      icon: FaBox,
      color: 'bg-blue-500',
    },
    {
      title: 'Rupture de Stock',
      value: stats?.products?.outOfStock || 0,
      icon: FaExclamationTriangle,
      color: 'bg-red-500',
    },
    {
      title: 'Commandes en Attente',
      value: stats?.orders?.pending || 0,
      icon: FaShoppingCart,
      color: 'bg-yellow-500',
    },
    {
      title: 'Chiffre d\'Affaires',
      value: `${(stats?.revenue?.total || 0).toFixed(2)} €`,
      icon: FaEuroSign,
      color: 'bg-green-500',
    },
  ];

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600 mt-2">Vue d'ensemble de votre boutique</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                </div>
                <div className={`${card.color} p-4 rounded-full text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">Commandes</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">En attente</span>
              <span className="text-2xl font-bold text-yellow-600">
                {stats?.orders?.pending || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">En préparation</span>
              <span className="text-2xl font-bold text-blue-600">
                {stats?.orders?.preparing || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Envoyées</span>
              <span className="text-2xl font-bold text-green-600">
                {stats?.orders?.shipped || 0}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">Stock</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Stock faible (≤5)</span>
              <span className="text-2xl font-bold text-orange-600">
                {stats?.products?.lowStock || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Rupture de stock</span>
              <span className="text-2xl font-bold text-red-600">
                {stats?.products?.outOfStock || 0}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default AdminDashboard;

