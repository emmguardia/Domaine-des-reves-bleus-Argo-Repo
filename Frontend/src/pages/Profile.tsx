import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../utils/security';
import { secureStorage } from '../utils/security';
import { logger } from '../utils/logger';
import OrderHistory from './OrderHistory';
import { FaDownload, FaTrash } from 'react-icons/fa';

const Profile: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');

  useEffect(() => {
    if (user) {
      refreshUser();
    }
  }, []);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        email: user.email || '',
      });
    }
  }, [user]);

  if (!user) {
    return <div className="pt-24 text-center">Veuillez vous connecter pour voir votre profil.</div>;
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const token = secureStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (res.status === 401) {
        logger.log('Token expiré lors de la mise à jour du profil, déconnexion...');
        logout();
        throw new Error('Session expirée, veuillez vous reconnecter');
      }
      if (!res.ok) throw new Error('Erreur lors de la mise à jour');
      await refreshUser();
      setMessage('Profil mis à jour !');
      setEditMode(false);
    } catch (err) {
      setError('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) return;
    setLoading(true);
    setError('');
    try {
      const token = secureStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/user`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        logger.log('Token expiré lors de la suppression du compte, déconnexion...');
        logout();
        throw new Error('Session expirée, veuillez vous reconnecter');
      }
      if (!res.ok) throw new Error('Erreur lors de la suppression');
      logout();
    } catch (err) {
      setError('Erreur lors de la suppression du compte');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const token = secureStorage.getItem('token');
      if (!token) return;

      const userResponse = await fetch(`${getApiUrl()}/api/user`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const userData = await userResponse.json();

      const addressesResponse = await fetch(`${getApiUrl()}/api/addresses/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const addressesData = addressesResponse.ok ? await addressesResponse.json() : [];

      const ordersResponse = await fetch(`${getApiUrl()}/api/user/orders`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const ordersData = ordersResponse.ok ? await ordersResponse.json() : [];

      const allData = {
        user: userData,
        addresses: addressesData,
        orders: ordersData,
        exportedAt: new Date().toISOString()
      };

      const data = JSON.stringify(allData, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mes-donnees-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Données téléchargées avec succès !');
    } catch (err) {
      logger.error('Erreur:', err);
      setError('Erreur lors du téléchargement');
    }
  };

  return (
    <main className="pt-24 pb-12 min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 max-w-7xl">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Mon Compte</h1>
        
        <div className="bg-white rounded-2xl shadow-lg mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Profil
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Commandes
            </button>
          </div>
        </div>

        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Informations personnelles</h2>
            
            {message && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                {message}
              </div>
            )}
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={!editMode}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={!editMode}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={!editMode}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={!editMode}
                    required
                  />
                </div>
              </div>

              {user?.defaultAddress && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse par défaut
                    <span className="ml-2 text-xs text-gray-500">(Enregistrée lors d'un paiement)</span>
                  </label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                    {user.defaultAddress}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Cette adresse a été enregistrée lors d'un paiement réussi. Elle sera utilisée par défaut pour les prochains paiements.
                  </p>
                </div>
              )}

              <div className="border-t pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {editMode ? (
                    <>
                      <button 
                        type="submit" 
                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        {loading ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                      <button 
                        type="button" 
                        className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                        onClick={() => setEditMode(false)}
                        disabled={loading}
                      >
                        Annuler
                      </button>
                    </>
                  ) : (
                    <button 
                      type="button" 
                      className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      onClick={() => setEditMode(true)}
                    >
                      Modifier mes informations
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <button 
                    type="button" 
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    onClick={handleDownload}
                  >
                    <FaDownload /> Télécharger toutes mes données
                  </button>
                  <button 
                    type="button" 
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    <FaTrash /> Supprimer mon compte
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}


        {activeTab === 'orders' && (
          <div>
            <OrderHistory />
          </div>
        )}
      </div>
    </main>
  );
};

export default Profile;

