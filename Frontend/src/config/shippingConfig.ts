// Configuration du système de livraison

export const SHIPPING_CONFIG = {
  // Système de tarification à utiliser
  // 'laposte' = Tarifs officiels La Poste (fixes selon le poids)
  // 'custom' = Tarifs personnalisés (basés sur le poids + distance)
  pricingSystem: 'laposte' as 'laposte' | 'custom',
  
  // Configuration des tarifs personnalisés (utilisé si pricingSystem = 'custom')
  customPricing: {
    // Frais de base par kg
    basePricePerKg: 2.00,
    // Frais par km (au-delà de la distance gratuite)
    pricePerKm: 0.05,
    // Distance gratuite (km)
    freeDistanceKm: 50,
    // Prix minimum
    minPrice: 4.95,
    // Prix maximum
    maxPrice: 15.00
  },
  
  // Frais de carton (commun aux deux systèmes)
  cartonFee: 0.00,
  
  // Adresse d'expédition
  senderAddress: {
    address: "1747 route de Mâcon",
    city: "Mézériat", 
    postalCode: "01660",
    country: "France"
  }
};

// Fonction pour obtenir le système de tarification actuel
export function getPricingSystem(): 'laposte' | 'custom' {
  return SHIPPING_CONFIG.pricingSystem;
}

// Fonction pour basculer entre les systèmes
export function setPricingSystem(system: 'laposte' | 'custom') {
  SHIPPING_CONFIG.pricingSystem = system;
}
