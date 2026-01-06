import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaEdit, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { getApiUrl } from '../../utils/security';
import { secureStorage } from '../../utils/security';
import { logger } from '../../utils/logger';
interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  weightGrams?: number;
  isPlaceholder?: boolean;
}
function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    category: '',
    stock: '',
    weightGrams: '100',
    isPlaceholder: false,
  });
  const API_URL = getApiUrl();
  useEffect(() => {
    fetchProducts();
  }, []);
  const fetchProducts = async () => {
    try {
      const token = secureStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          const mappedProducts = data.map((product: any) => ({
            ...product,
            _id: product.id || product._id,
            id: product.id || product._id,
            isPlaceholder: product.isPlaceholder !== undefined ? product.isPlaceholder : (product.is_placeholder || false)
          }));
          setProducts(mappedProducts);
        } else {
          logger.error('Réponse non-JSON reçue pour les produits admin');
        }
      } else {
        logger.error('Erreur HTTP produits admin:', response.status);
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des produits:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = secureStorage.getItem('adminToken');
      const productId = editingProduct?._id || editingProduct?.id;
      const url = editingProduct
        ? `${API_URL}/api/admin/products/${productId}`
        : `${API_URL}/api/admin/products`;
      const method = editingProduct ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          weightGrams: parseInt(formData.weightGrams),
          isPlaceholder: formData.isPlaceholder,
        }),
      });
      if (response.ok) {
        setShowModal(false);
        setEditingProduct(null);
        setFormData({
          name: '',
          description: '',
          price: '',
          image: '',
          category: '',
          stock: '',
          weightGrams: '100',
          isPlaceholder: false,
        });
        fetchProducts();
      }
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde du produit:', error);
    }
  };
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    const isPlaceholder = product.isPlaceholder !== undefined 
      ? product.isPlaceholder 
      : (product as any).is_placeholder || false;
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      image: product.image || '',
      category: product.category,
      stock: product.stock.toString(),
      weightGrams: (product.weightGrams || 100).toString(),
      isPlaceholder: isPlaceholder,
    });
    setShowModal(true);
  };
  const handleDelete = async (product: Product) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      return;
    }
    try {
      const token = secureStorage.getItem('adminToken');
      const productId = product._id || product.id;
      const response = await fetch(`${API_URL}/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du produit:', error);
    }
  };
  const handleNewProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      image: '',
      category: '',
      stock: '',
      weightGrams: '100',
    });
    setShowModal(true);
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
      <div className="flex justify-between items-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Produits</h1>
          <p className="text-gray-600 mt-2">Gérez votre catalogue de produits</p>
        </motion.div>
        <button
          onClick={handleNewProduct}
          className="button-primary flex items-center space-x-2"
        >
          <FaPlus className="w-4 h-4" />
          <span>Ajouter un produit</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <motion.div
            key={product._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg overflow-hidden"
          >
            <div className="relative h-48 bg-gray-200">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <span className="text-gray-400 text-sm">Aucune image</span>
                </div>
              )}
              {product.isPlaceholder && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Bientôt disponible
                </div>
              )}
              {product.stock === 0 && (
                <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                  <FaExclamationTriangle />
                  <span>Rupture de stock</span>
                </div>
              )}
              {product.stock > 0 && product.stock <= 5 && !product.isPlaceholder && (
                <div className="absolute top-2 right-2 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Stock faible
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
              <div className="flex justify-between items-center mb-4">
                <span className="text-2xl font-bold text-blue-600">{product.price.toFixed(2)} €</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  product.stock === 0
                    ? 'bg-red-100 text-red-700'
                    : product.stock <= 5
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  Stock: {product.stock}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(product)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <FaEdit className="w-4 h-4" />
                  <span>Modifier</span>
                </button>
                <button
                  onClick={() => handleDelete(product)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="form-input w-full"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prix (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="form-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="form-input w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de l'image
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="form-input w-full"
                      placeholder="https://exemple.com/image.jpg"
                    />
                    {editingProduct && editingProduct.image && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">URL actuelle :</p>
                        <p className="text-sm text-gray-800 break-all font-mono">{editingProduct.image}</p>
                      </div>
                    )}
                    {formData.image && (
                      <div className="space-y-2">
                        <img
                          src={formData.image}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg border"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image: '' })}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Retirer l'image
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isPlaceholder}
                      onChange={(e) => setFormData({ ...formData, isPlaceholder: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Afficher "Image en attente - Bientôt disponible"
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Affichera un overlay "Image en attente - Bientôt disponible" sur l'image du produit
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Catégorie
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="form-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Poids (grammes)
                    </label>
                    <input
                      type="number"
                      value={formData.weightGrams}
                      onChange={(e) => setFormData({ ...formData, weightGrams: e.target.value })}
                      className="form-input w-full"
                    />
                  </div>
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    className="button-primary flex-1"
                  >
                    {editingProduct ? 'Modifier' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingProduct(null);
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
export default AdminProducts;
