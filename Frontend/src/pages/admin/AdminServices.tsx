import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaEdit, FaSave, FaEuroSign } from 'react-icons/fa';
import { getApiUrl, adminFetch } from '../../utils/security';
import { logger } from '../../utils/logger';

interface Service {
  id: number;
  name: string;
  description: string;
  price: string;
  duration: string;
  details: string[];
}

function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const API_URL = getApiUrl();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await adminFetch(`${API_URL}/api/admin/services`);
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      } else {
        logger.error('Erreur récupération services:', response.status);
      }
    } catch (error) {
      logger.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setEditPrice(service.price);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditPrice('');
  };

  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      const response = await adminFetch(`${API_URL}/api/admin/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: editPrice }),
      });
      if (response.ok) {
        const updated = await response.json();
        setServices((prev) =>
          prev.map((s) => (s.id === id ? { ...s, price: updated.price } : s))
        );
        setEditingId(null);
        setEditPrice('');
      } else {
        const err = await response.json();
        alert(err.detail || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      logger.error('Erreur:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
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
        <h1 className="text-3xl font-bold text-gray-900">Prix des services</h1>
        <p className="text-gray-600 mt-2">
          Modifiez les prix affichés sur la page Services du site
        </p>
      </motion.div>

      {services.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium">Aucun service trouvé</p>
          <p className="text-amber-700 text-sm mt-2">
            Exécutez <code className="bg-amber-100 px-2 py-1 rounded">npm run init-services</code> dans le backend pour créer les 4 services.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((service) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{service.description}</p>
              </div>
              <div className="flex items-center gap-3">
                {editingId === service.id ? (
                  <>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <input
                        type="text"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        placeholder="Ex: 90€"
                        className="px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => handleSave(service.id)}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <FaSave className="w-4 h-4" />
                      Enregistrer
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-blue-600 font-semibold">
                      <FaEuroSign className="w-5 h-5" />
                      {service.price || '—'}
                    </div>
                    <button
                      onClick={() => handleEdit(service)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      <FaEdit className="w-4 h-4" />
                      Modifier
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminServices;
