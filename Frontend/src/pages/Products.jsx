import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaShoppingCart } from 'react-icons/fa';
import { useCart } from '../context/CartContext';

const allProducts = [
  {
    id: 1,
    name: 'Carde double flex',
    description: 'Carde professionnelle double face pour démêler efficacement',
    price: 21.00,
    image: '/images/Carde_double_flex.jpg',
    rating: 5,
    category: 'Accessoires',
    weightGrams: 175
  },
  {
    id: 2,
    name: 'Carde à nœud',
    description: 'Carde spécialement conçue pour éliminer les nœuds tenaces',
    price: 21.00,
    image: '/images/Carde_à_nœuds.jpg',
    rating: 5,
    category: 'Accessoires',
    weightGrams: 60
  },
  {
    id: 3,
    name: 'Peigne',
    description: 'Peigne professionnel pour finition et démêlage',
    price: 7.50,
    image: '/images/Peigne.jpg',
    rating: 4,
    category: 'Accessoires',
    weightGrams: 90
  },
  {
    id: 4,
    name: 'Coat prince 20 dents',
    description: 'Peigne Coat Prince professionnel 20 dents pour toilettage précis',
    price: 35.50,
    image: '/images/Coat_prince_20_dents.jpg',
    rating: 5,
    category: 'Accessoires',
    weightGrams: 115
  },
  {
    id: 5,
    name: 'Coupe nœud',
    description: 'Ciseaux spécialisés pour couper les nœuds sans blesser',
    price: 11.00,
    image: '/images/coupe_noeud.png',
    rating: 4,
    category: 'Accessoires',
    weightGrams: 60
  },
  {
    id: 6,
    name: 'Crochets à tique',
    description: 'Outils professionnels pour retirer les tiques en toute sécurité',
    price: 7.00,
    image: '/images/Crochets_a_tique.jpg',
    rating: 4,
    category: 'Accessoires',
    weightGrams: 30
  },
  {
    id: 7,
    name: 'Spray Conditionneur',
    description: 'Produit sublime pour éclat et brillance du pelage',
    price: 20.50,
    image: '/images/Spray_Conditionneur.jpg',
    rating: 4,
    category: 'Soins Et Parfums',
    weightGrams: 285
  },
  {
    id: 8,
    name: 'Lotion Aloe Vera',
    description: 'Lotion démêlante enrichie à l\'aloe vera pour faciliter le brossage',
    price: 16.00,
    image: '/images/Lotion_Aloe_Vera.jpg',
    rating: 5,
    category: 'Soins Et Parfums',
    volumes: {
      '250ml': 16.00
    },
    weightGrams: 285
  },
  {
    id: 9,
    name: 'Lotion Argan',
    description: 'Shampooing doux enrichi à l\'aloe vera pour tous types de poils',
    price: 16,
    image: '/images/Lotion_Argan.jpg',
    rating: 5,
    category: 'Soins Et Parfums',
    volumes: {
      '250ml': 16,
    },
    weightGrams: 285
  },
  {
    id: 10,
    name: 'Crème Argan',
    description: 'Crème démêlante enrichie à l\'argan pour faciliter le brossage',
    price: 16.00,
    image: '/images/Crème_Argan.jpg',
    rating: 5,
    category: 'Soins Et Parfums',
    volumes: {
      '250ml': 16.00,
    },
    weightGrams: 275
  },
  {
    id: 11,
    name: 'Crème Aloe Vera',
    description: 'Crème démêlante enrichie à l\'aloe vera pour faciliter le brossage',
    price: 16.00,
    image: '/images/Crème_Aloe_Vera.jpg',
    rating: 5,
    category: 'Soins Et Parfums',
    volumes: {
      '250ml': 16.00,
    },
    weightGrams: 275
  },
  {
    id: 12,
    name: 'Shampoing Aloe Vera',
    description: 'Shampooing doux enrichi à l\'aloe vera pour tous types de poils',
    price: 12.50,
    image: '/images/Shampoing_Aloe_Vera.jpg',
    rating: 5,
    category: 'Shampoings',
    volumes: {
      '250ml': 12.50,
    },
    weightGrams: 280
  },
  {
    id: 13,
    name: 'Shampoing Forty',
    description: 'Shampooing professionnel forty pour tous types de poils',
    price: 12.50,
    image: '/images/Shampoing_Forty.jpg',
    category: 'Shampoings',
    volumes: {
      '250ml': 12.50,
    },
    weightGrams: 280
  },
  {
    id: 14,
    name: 'Shampooing Copacabana',
    description: 'Shampooing copacabana pour poils brillants et soyeux',
    price: 12.50,
    image: '/images/Shampoing_Forty.jpg',
    category: 'Shampoings',
    volumes: {
      '250ml': 12.50,
    },
    weightGrams: 280,
    isPlaceholder: true
  },
  {
    id: 15,
    name: 'Shampoing Argan',
    description: 'Shampooing doux à l\'argan pour peaux sensibles',
    price: 12.50,
    image: '/images/Shampoing_Argan.jpg',
    rating: 4,
    category: 'Shampoings',
    volumes: {
      '250ml': 12.50,
    },
    weightGrams: 280
  },
  {
    id: 16,
    name: 'Shampooing Amandes',
    description: 'Shampooing doux aux amandes pour peaux sensibles',
    price: 12.50,
    image: '/images/Shampoing_Amandes.jpg',
    rating: 4,
    category: 'Shampoings',
    volumes: {
      '250ml': 12.50,
    },
    weightGrams: 280
  },
  {
    id: 17,
    name: 'Parfum',
    description: 'Parfum délicat pour chiens, senteur fraîche et durable',
    price: 8.00,
    image: '/images/Parfum.jpg',
    rating: 4,
    category: 'Soins Et Parfums',
    weightGrams: 30,
    fragrances: {
      'Malabar': {
        name: 'Malabar',
        description: 'Senteur exotique et envoûtante'
      },
      'Bamboo': {
        name: 'Bamboo',
        description: 'Senteur de bambou apaisante et naturelle'
      },
      'Boo Tella': {
        name: 'Boo Tella',
        description: 'Senteur gourmande et réconfortante'
      },
      'Pitchoun': {
        name: 'Pitchoun',
        description: 'Senteur douce et tendre, parfait pour les petits chiens'
      },
      'Mimosa': {
        name: 'Mimosa',
        description: 'Senteur florale printanière et délicate'
      },
      'Pelluche': {
        name: 'Pelluche',
        description: 'Senteur douce et câline, comme un doudou parfumé'
      },
      'Pomme': {
        name: 'Pomme',
        description: 'Senteur fruitée et fraîche de pomme croquante'
      },
      'Scarlett': {
        name: 'Scarlett',
        description: 'Senteur élégante et sophistiquée'
      },
      'Lulu': {
        name: 'Lulu',
        description: 'Senteur joyeuse et pétillante'
      }
    }
  }
];

function Products() {
  const { addToCart } = useCart();
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Initialiser selectedVolumes avec des valeurs par défaut pour les produits avec volumes
  const [selectedVolumes, setSelectedVolumes] = useState(() => {
    const initialVolumes = {};
    // Initialiser avec '250ml' pour tous les produits qui ont des volumes
    allProducts.forEach(product => {
      if (product.volumes) {
        initialVolumes[product.id] = '250ml';
      }
    });
    return initialVolumes;
  });

  // Initialiser selectedFragrances avec des valeurs par défaut pour les produits avec parfums
  const [selectedFragrances, setSelectedFragrances] = useState(() => {
    const initialFragrances = {};
    // Initialiser avec le premier parfum pour tous les produits qui ont des parfums
    allProducts.forEach(product => {
      if (product.fragrances) {
        const firstFragrance = Object.keys(product.fragrances)[0];
        initialFragrances[product.id] = firstFragrance;
      }
    });
    return initialFragrances;
  });

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

  const handleVolumeChange = (productId, volume) => {
    setSelectedVolumes(prev => ({
      ...prev,
      [productId]: volume
    }));
  };

  const handleFragranceChange = (productId, fragrance) => {
    setSelectedFragrances(prev => ({
      ...prev,
      [productId]: fragrance
    }));
  };

  const handleAddToCart = (product) => {
    const selectedVolume = selectedVolumes[product.id];
    const selectedFragrance = selectedFragrances[product.id];
    let finalPrice = product.price;
    let finalName = product.name;
    let finalWeight = product.weightGrams || 100;

    // Si le produit a des volumes et qu'un volume est sélectionné
    if (product.volumes && selectedVolume) {
      finalPrice = product.volumes[selectedVolume];
      finalName = `${product.name} (${selectedVolume})`;
      
      // Ajuster le poids selon le volume
      if (selectedVolume === '1L') {
        finalWeight = (product.weightGrams || 100) * 4; // 1L = 4x 250ml
      }
    }

    // Si le produit a des parfums et qu'un parfum est sélectionné
    if (product.fragrances && selectedFragrance) {
      finalName = `${product.name} - ${selectedFragrance}`;
    }

    addToCart({
      id: product.id,
      name: finalName,
      price: finalPrice,
      image: product.image,
      volume: selectedVolume || null,
      fragrance: selectedFragrance || null,
      weightGrams: finalWeight
    });
  };

  const getProductPrice = (product) => {
    if (product.volumes && selectedVolumes[product.id]) {
      return product.volumes[selectedVolumes[product.id]];
    }
    return product.price;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Nos Produits de Toilettage
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez notre gamme complète de produits professionnels pour le toilettage de vos compagnons à quatre pattes
          </p>
        </div>

        {/* Filtres par catégorie */}
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

        {/* Grille des produits */}
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
                {/* Image du produit */}
                <div className="relative h-48 bg-gray-200">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setSelectedImage(product.image)}
                    onError={(e) => {
                      // Utiliser une image de fallback si l'image principale échoue
                      const fallbackIndex = product.id % fallbackImages.length;
                      e.target.src = fallbackImages[fallbackIndex];
                    }}
                    loading="lazy"
                  />
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
                </div>

                {/* Contenu du produit */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>

                  {/* Sélecteur de volume */}
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

                  {/* Sélecteur de parfum */}
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

                  {/* Prix et bouton d'ajout */}
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-blue-600">
                      {getProductPrice(product).toFixed(2)} €
                    </div>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <FaShoppingCart className="w-4 h-4" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Message si aucun produit trouvé */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Aucun produit trouvé dans cette catégorie.
            </p>
          </div>
        )}
      </div>

      {/* Modal pour agrandir l'image */}
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
}

export default Products;