
import { SHIPPING_CONFIG, getPricingSystem } from '../config/shippingConfig';

export interface ShippingAddress {
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface ShippingCalculation {
  basePrice: number;
  distanceKm: number;
  weightKg: number;
  cartonFee: number;
  totalShipping: number;
  estimatedDeliveryDays: number;
}

const SENDER_ADDRESS = SHIPPING_CONFIG.senderAddress;

const SHIPPING_TARIFFS = {

  FRANCE: {
    "0-250g": 5.25,
    "250-500g": 7.35,
    "500-750g": 8.65,
    "750g-1kg": 9.40,
    "1-2kg": 10.70,
    "2-5kg": 16.60,
    "5-10kg": 24.20,
    "10-15kg": 30.55,
    "15-30kg": 37.85
  }
};

const CARTON_FEE = SHIPPING_CONFIG.cartonFee;


async function geocodeAddress(address: ShippingAddress): Promise<{ lat: number; lng: number } | null> {
  try {

    const query = `${address.address}, ${address.postalCode} ${address.city}, ${address.country}`;
    const encodedQuery = encodeURIComponent(query);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&countrycodes=fr`
    );
    
    if (!response.ok) {
      throw new Error('Erreur de géocodage');
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors du géocodage:', error);
    return null;
  }
}


function calculateDistance(
  lat1: number, lng1: number, 
  lat2: number, lng2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}


function getLaPostePrice(weightKg: number): number {
  const tariffs = SHIPPING_TARIFFS.FRANCE;
  
  if (weightKg <= 0.25) return tariffs["0-250g"];
  if (weightKg <= 0.5) return tariffs["250-500g"];
  if (weightKg <= 0.75) return tariffs["500-750g"];
  if (weightKg <= 1) return tariffs["750g-1kg"];
  if (weightKg <= 2) return tariffs["1-2kg"];
  if (weightKg <= 5) return tariffs["2-5kg"];
  if (weightKg <= 10) return tariffs["5-10kg"];
  if (weightKg <= 15) return tariffs["10-15kg"];
  if (weightKg <= 30) return tariffs["15-30kg"];

  const parcels = Math.ceil(weightKg / 30);
  return parcels * tariffs["15-30kg"];
}


function getCustomPrice(weightKg: number, distanceKm: number): number {
  const config = SHIPPING_CONFIG.customPricing;

  let price = weightKg * config.basePricePerKg;

  if (distanceKm > config.freeDistanceKm) {
    const extraDistance = distanceKm - config.freeDistanceKm;
    price += extraDistance * config.pricePerKm;
  }

  price = Math.max(price, config.minPrice);
  price = Math.min(price, config.maxPrice);
  
  return Math.round(price * 100) / 100; // Arrondir à 2 décimales
}


export async function calculateShippingCost(
  deliveryAddress: string,
  weightGrams: number,
  useCustomPricing?: boolean
): Promise<ShippingCalculation | null> {

  const useCustom = useCustomPricing ?? (getPricingSystem() === 'custom');
  try {

    const addressParts = deliveryAddress.split(',');
    if (addressParts.length < 2) {
      throw new Error('Adresse de livraison invalide');
    }
    
    const address = addressParts[0].trim();
    const cityPostal = addressParts[1].trim();
    const postalCodeMatch = cityPostal.match(/(\d{5})/);
    const postalCode = postalCodeMatch ? postalCodeMatch[1] : '';
    const city = cityPostal.replace(/\d{5}/, '').trim();
    
    const shippingAddress: ShippingAddress = {
      address,
      city,
      postalCode,
      country: 'France'
    };

    console.log('Géocodage de l\'adresse de livraison:', shippingAddress);
    const deliveryCoords = await geocodeAddress(shippingAddress);
    if (!deliveryCoords) {
      console.error('Échec du géocodage de l\'adresse de livraison');
      throw new Error('Impossible de géocoder l\'adresse de livraison');
    }
    console.log('Coordonnées de livraison:', deliveryCoords);

    console.log('Géocodage de l\'adresse d\'expédition:', SENDER_ADDRESS);
    const senderCoords = await geocodeAddress(SENDER_ADDRESS);
    if (!senderCoords) {
      console.error('Échec du géocodage de l\'adresse d\'expédition');
      throw new Error('Impossible de géocoder l\'adresse d\'expédition');
    }
    console.log('Coordonnées d\'expédition:', senderCoords);

    const distanceKm = calculateDistance(
      senderCoords.lat, senderCoords.lng,
      deliveryCoords.lat, deliveryCoords.lng
    );
    console.log('Distance calculée:', distanceKm, 'km');

    const weightKg = weightGrams / 1000;
    console.log('Poids total calculé:', weightGrams, 'grammes =', weightKg, 'kg');

    let basePrice: number;
    if (useCustom) {
      basePrice = getCustomPrice(weightKg, distanceKm);
      console.log('Prix personnalisé calculé:', basePrice, '€ pour', weightKg, 'kg et', distanceKm, 'km');
    } else {
      basePrice = getLaPostePrice(weightKg);
      console.log('Prix de livraison calculé:', basePrice, '€ pour', weightKg, 'kg');
    }

    const cartonFee = CARTON_FEE;

    const totalShipping = basePrice + cartonFee;

    const estimatedDeliveryDays = distanceKm < 100 ? 1 : distanceKm < 300 ? 2 : 3;
    
    return {
      basePrice,
      distanceKm: Math.round(distanceKm),
      weightKg: Math.round(weightKg * 100) / 100,
      cartonFee,
      totalShipping: Math.round(totalShipping * 100) / 100,
      estimatedDeliveryDays
    };
    
  } catch (error) {
    console.error('Erreur lors du calcul des frais de port:', error);
    return null;
  }
}


export function calculateShippingCostFallback(weightGrams: number): ShippingCalculation {
  const weightKg = weightGrams / 1000;
  const basePrice = getLaPostePrice(weightKg);
  const cartonFee = CARTON_FEE;
  const totalShipping = basePrice + cartonFee;
  
  return {
    basePrice,
    distanceKm: 0, // Distance inconnue
    weightKg: Math.round(weightKg * 100) / 100,
    cartonFee,
    totalShipping: Math.round(totalShipping * 100) / 100,
    estimatedDeliveryDays: 3 // Estimation par défaut
  };
}


export async function calculateCustomShippingCost(
  deliveryAddress: string,
  weightGrams: number
): Promise<ShippingCalculation | null> {
  return calculateShippingCost(deliveryAddress, weightGrams, true);
}


export function validateDeliveryAddress(address: string): boolean {
  if (!address || address.trim().length < 10) return false;

  const parts = address.split(',');
  if (parts.length < 2) return false;

  const cityPart = parts[1].trim();
  const postalCodeMatch = cityPart.match(/\d{5}/);
  return !!postalCodeMatch;
}
