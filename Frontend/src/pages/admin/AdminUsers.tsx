import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTrash, FaUser } from 'react-icons/fa';
import { getApiUrl } from '../../utils/security';
import { secureStorage } from '../../utils/security';
import { logger } from '../../utils/logger';
interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  ordersCount: number;
}
function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const API_URL = getApiUrl();
  useEffect(() => {
    fetchUsers();
  }, []);
  const fetchUsers = async () => {
    try {
      const token = secureStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      logger.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      const token = secureStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.detail || 'Erreur lors de la suppression');
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
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Gestion des utilisateurs</h1>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commandes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inscription</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <FaUser className="text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </span>
                    {user.role === 'admin' && (
                      <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">Admin</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.ordersCount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => handleDelete(user.id)}
                    disabled={user.role === 'admin'}
                    className={`${
                      user.role === 'admin'
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-red-600 hover:text-red-700'
                    }`}
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default AdminUsers;
