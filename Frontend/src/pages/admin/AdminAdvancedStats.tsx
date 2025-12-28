import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaChartLine, FaDownload } from 'react-icons/fa';
import { getApiUrl } from '../../utils/security';
import { secureStorage } from '../../utils/security';
import { logger } from '../../utils/logger';

function AdminAdvancedStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const API_URL = getApiUrl();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = secureStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/stats/advanced`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      logger.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = secureStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/export/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      logger.error('Erreur:', error);
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

  const maxRevenue = Math.max(...(stats?.revenue?.daily?.map((d: any) => d.revenue) || [0]), 1);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Statistiques avancées</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <FaDownload /> Exporter les commandes (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Revenus</h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-600 text-sm">7 derniers jours</p>
              <p className="text-3xl font-bold text-green-600">
                {stats?.revenue?.last7Days?.toFixed(2) || '0.00'} €
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">30 derniers jours</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats?.revenue?.last30Days?.toFixed(2) || '0.00'} €
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Commandes</h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-600 text-sm">7 derniers jours</p>
              <p className="text-3xl font-bold text-purple-600">{stats?.orders?.last7Days || 0}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">30 derniers jours</p>
              <p className="text-3xl font-bold text-indigo-600">{stats?.orders?.last30Days || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Revenus quotidiens (7 derniers jours)</h2>
        <div className="space-y-3">
          {stats?.revenue?.daily?.map((day: any, index: number) => (
            <div key={index}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">{day.date}</span>
                <span className="text-sm font-medium text-gray-900">{day.revenue.toFixed(2)} €</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${(day.revenue / maxRevenue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminAdvancedStats;

