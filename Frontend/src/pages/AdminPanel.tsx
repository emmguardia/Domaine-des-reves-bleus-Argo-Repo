import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaBox,
  FaShoppingCart,
  FaChartLine,
  FaSignOutAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaTruck,
  FaHistory,
  FaExclamationTriangle
} from 'react-icons/fa';
import AdminDashboard from './admin/AdminDashboard';
import AdminProducts from './admin/AdminProducts';
import AdminOrders from './admin/AdminOrders';
import AdminOrderHistory from './admin/AdminOrderHistory';

function AdminPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminUser, setAdminUser] = useState<any>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'https://domainedesrevesbleus.famillemntmata.eu';

  useEffect(() => {
    // Vérifier l'authentification admin
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');

    if (!token || !user) {
      navigate('/admin-panel');
      return;
    }

    setAdminUser(JSON.parse(user));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin-panel');
  };

  if (!adminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { path: '/admin-panel/dashboard', icon: FaChartLine, label: 'Tableau de bord' },
    { path: '/admin-panel/products', icon: FaBox, label: 'Produits' },
    { path: '/admin-panel/orders', icon: FaShoppingCart, label: 'Commandes' },
    { path: '/admin-panel/history', icon: FaHistory, label: 'Historique' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-blue-600">Admin Panel</h1>
            <p className="text-sm text-gray-600 mt-1">Les Rêves Bleus</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t">
            <div className="mb-4 px-4 py-2 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">{adminUser.username}</p>
              <p className="text-xs text-gray-500">Administrateur</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FaSignOutAlt className="w-5 h-5" />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        <Routes>
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/products" element={<AdminProducts />} />
          <Route path="/orders" element={<AdminOrders />} />
          <Route path="/history" element={<AdminOrderHistory />} />
          <Route path="/" element={<AdminDashboard />} />
        </Routes>
      </div>
    </div>
  );
}

export default AdminPanel;

