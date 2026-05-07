import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaShoppingCart, FaExclamationTriangle } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { getApiUrl } from '../utils/security';
import { logger } from '../utils/logger';
interface Product {
  _id?: string;
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  weightGrams?: number;
  volumes?: { [key: string]: number };
  fragrances?: { [key: string]: { description?: string } };
  isNew?: boolean;
  isPlaceholder?: boolean;
}
const Products: React.FC = () => {
  const { addToCart } = useCart();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVolumes, setSelectedVolumes] = useState<{ [key: string]: string }>({});
  const [selectedFragrances, setSelectedFragrances] = useState<{ [key: string]: string }>({});
  // Animation "Ajouté ✓" sur le bouton après ajout au panier
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  useEffect(() => {
    fetchProducts();
  }, []);
  const fetchProducts = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/products/` : '/api/products/';
      logger.log('Récupération des produits depuis:', fullUrl);
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      logger.log('Réponse reçue');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          logger.log('Produits reçus:', data.length, 'produits');
          if (Array.isArray(data) && data.length > 0) {
            const productsWithId = data.map((product: any) => ({
              ...product,
              id: product._id || product.id
            }));
            setAllProducts(productsWithId);
            setError(null);
            logger.log('Produits chargés avec succès');
          } else {
            logger.warn('Aucun produit trouvé dans la réponse');
            setAllProducts([]);
            setError(null);
          }
        } else {
          logger.error('Réponse non-JSON reçue');
        }
      } else {
        const errorText = await response.text().catch(() => 'Impossible de lire la réponse');
        const isCloudflareError = errorText.includes('Cloudflare') || errorText.includes('Bad gateway');
        if (response.status === 502) {
          const errorMsg = isCloudflareError 
            ? 'Le serveur backend n\'est pas accessible. Cloudflare ne peut pas joindre le serveur.'
            : 'Le serveur backend n\'est pas accessible.';
          logger.error('Erreur 502:', errorMsg);
          setError(errorMsg);
        } else if (response.status === 503) {
          logger.error('Erreur 503: Service temporairement indisponible');
          setError('Service temporairement indisponible. Veuillez réessayer dans quelques instants.');
        } else if (response.status === 404) {
          logger.error('Erreur 404: Route API non trouvée');
          setError('Route API non trouvée. Vérifiez la configuration du serveur.');
        } else {
          logger.error('Erreur HTTP:', response.status, response.statusText);
          setError(`Erreur ${response.status}: ${response.statusText}`);
        }
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        const errorMsg = 'Le serveur ne répond pas dans les temps (timeout 10s)';
        logger.error('Timeout:', errorMsg);
        setError(errorMsg);
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        const errorMsg = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
        logger.error('Erreur de connexion:', errorMsg);
        setError(errorMsg);
      } else {
        logger.error('Erreur lors de la récupération des produits:', error);
        setError('Une erreur inattendue s\'est produite.');
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (allProducts.length > 0) {
      const initialVolumes: { [key: string]: string } = {};
      const initialFragrances: { [key: string]: string } = {};
      allProducts.forEach((product) => {
        if (product.volumes) {
          const volumesObj = product.volumes instanceof Map 
            ? Object.fromEntries(product.volumes)
            : product.volumes;
          if (Object.keys(volumesObj).length > 0) {
            initialVolumes[product.id] = Object.keys(volumesObj)[0];
          }
        }
        if (product.fragrances) {
          const fragrancesObj = product.fragrances instanceof Map
            ? Object.fromEntries(product.fragrances)
            : product.fragrances;
          if (Object.keys(fragrancesObj).length > 0) {
            initialFragrances[product.id] = Object.keys(fragrancesObj)[0];
          }
        }
      });
      setSelectedVolumes(initialVolumes);
      setSelectedFragrances(initialFragrances);
    }
  }, [allProducts]);
  const categories = useMemo(() => {
    const uniqueCategories = new Set(allProducts.map(p => p.category));
    return ['Tous', ...Array.from(uniqueCategories)];
  }, [allProducts]);
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Tous') {
      return allProducts;
    }
    return allProducts.filter(product => product.category === selectedCategory);
  }, [selectedCategory, allProducts]);
  const handleVolumeChange = (productId: string, volume: string) => {
    setSelectedVolumes(prev => ({
      ...prev,
      [productId]: volume
    }));
  };
  const handleFragranceChange = (productId: string, fragrance: string) => {
    setSelectedFragrances(prev => ({
      ...prev,
      [productId]: fragrance
    }));
  };
  const handleAddToCart = (product: Product) => {
    const selectedVolume = selectedVolumes[product.id];
    const selectedFragrance = selectedFragrances[product.id];
    let finalPrice = product.price;
    let finalName = product.name;
    let finalWeight = product.weightGrams || 100;
    if (product.volumes && selectedVolume) {
      const volumesObj = product.volumes instanceof Map 
        ? Object.fromEntries(product.volumes)
        : product.volumes;
      if (volumesObj[selectedVolume]) {
        finalPrice = volumesObj[selectedVolume];
        finalName = `${product.name} (${selectedVolume})`;
        if (selectedVolume === '1L') {
          finalWeight = (product.weightGrams || 100) * 4;
        }
      }
    }
    if (product.fragrances && selectedFragrance) {
      finalName = `${product.name} - ${selectedFragrance}`;
    }
    addToCart({
      id: typeof product.id === 'string' ? parseInt(product.id, 10) : product.id,
      name: finalName,
      price: finalPrice,
      quantity: 1,
      image: product.image,
      volume: selectedVolume || null,
      fragrance: selectedFragrance || null,
      weightGrams: finalWeight
    });
    // Feedback visuel : bouton passe en "Ajouté ✓" pendant 1.5s
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1500);
  };
  const getProductPrice = (product: Product): number => {
    if (product.volumes && selectedVolumes[product.id]) {
      const volumesObj = product.volumes instanceof Map 
        ? Object.fromEntries(product.volumes)
        : product.volumes;
      return volumesObj[selectedVolumes[product.id]] || product.price;
    }
    return product.price;
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des produits...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 pt-24 sm:pt-28 md:pt-32 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Nos Produits de Toilettage
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez notre gamme complète de produits professionnels pour le toilettage de vos compagnons à quatre pattes
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className="relative h-48 bg-gray-200">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setSelectedImage(product.image)}
                      loading="lazy"
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
                  {product.isNew && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Nouveau
                    </div>
                  )}
                  {product.isPlaceholder && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="text-sm font-medium">Image en attente</div>
                        <div className="text-xs opacity-75">Bientôt disponible</div>
                      </div>
                    </div>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                      <div className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
                        <FaExclamationTriangle />
                        <span className="font-medium">Rupture de stock</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                  {product.volumes && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Volume
                      </label>
                      <div className="flex space-x-2">
                        {Object.keys(product.volumes).map((volume) => (
                          <button
                            key={volume}
                            onClick={() => handleVolumeChange(product.id, volume)}
                            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                              selectedVolumes[product.id] === volume
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {volume}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {product.fragrances && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parfum
                      </label>
                      <select
                        value={selectedFragrances[product.id] || ''}
                        onChange={(e) => handleFragranceChange(product.id, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {Object.keys(product.fragrances).map((fragrance) => (
                          <option key={fragrance} value={fragrance}>
                            {fragrance}
                          </option>
                        ))}
                      </select>
                      {selectedFragrances[product.id] && (
                        <p className="text-xs text-gray-500 mt-1">
                          {product.fragrances[selectedFragrances[product.id]]?.description}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-blue-600">
                      {getProductPrice(product).toFixed(2)} €
                    </div>
                    <motion.button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0 || addedProductId === product.id}
                      whileTap={product.stock !== 0 ? { scale: 0.92 } : {}}
                      className={`px-4 py-2 rounded-lg transition-all flex items-center space-x-2 ${
                        product.stock === 0
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          : addedProductId === product.id
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      <AnimatePresence mode="wait">
                        {addedProductId === product.id ? (
                          <motion.span
                            key="added"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="flex items-center space-x-2"
                          >
                            <span>✓</span>
                            <span>Ajouté !</span>
                          </motion.span>
                        ) : (
                          <motion.span
                            key="add"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="flex items-center space-x-2"
                          >
                            <FaShoppingCart className="w-4 h-4" />
                            <span>{product.stock === 0 ? 'Rupture' : 'Ajouter'}</span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {error && (
          <div className="text-center py-12 px-4">
            <FaExclamationTriangle className="mx-auto text-red-500 text-4xl mb-4" />
            <p className="text-red-600 text-lg font-semibold mb-2">
              Erreur de connexion
            </p>
            <p className="text-gray-600 text-sm mb-4">
              {error}
            </p>
            <p className="text-gray-500 text-xs">
              Le serveur backend n'est pas accessible. Veuillez contacter l'administrateur.
            </p>
          </div>
        )}
        {!loading && !error && filteredProducts.length === 0 && allProducts.length === 0 && (
          <div className="text-center py-12">
            <FaExclamationTriangle className="mx-auto text-yellow-500 text-4xl mb-4" />
            <p className="text-gray-500 text-lg mb-2">
              Aucun produit disponible pour le moment.
            </p>
            <p className="text-gray-400 text-sm mb-4">
              Les produits seront bientôt disponibles.
            </p>
          </div>
        )}
        {!loading && filteredProducts.length === 0 && allProducts.length > 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Aucun produit trouvé dans cette catégorie.
            </p>
          </div>
        )}
      </div>
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-6xl max-h-full w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Produit"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-70 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-90 transition-all duration-200 text-xl font-bold"
            >
              ×
            </button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-4 py-2 rounded-full text-sm">
              Cliquez en dehors de l'image pour fermer
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Products;
