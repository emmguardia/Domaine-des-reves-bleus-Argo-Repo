export const SHIPPING_CONFIG = {
  pricingSystem: 'laposte' as 'laposte' | 'custom',
  customPricing: {
    basePricePerKg: 2.00,
    pricePerKm: 0.05,
    freeDistanceKm: 50,
    minPrice: 4.95,
    maxPrice: 15.00
  },
  cartonFee: 0.00,
  senderAddress: {
    address: "1747 route de Mâcon",
    city: "Mézériat", 
    postalCode: "01660",
    country: "France"
  }
};
export function getPricingSystem(): 'laposte' | 'custom' {
  return SHIPPING_CONFIG.pricingSystem;
}
export function setPricingSystem(system: 'laposte' | 'custom') {
  SHIPPING_CONFIG.pricingSystem = system;
}
