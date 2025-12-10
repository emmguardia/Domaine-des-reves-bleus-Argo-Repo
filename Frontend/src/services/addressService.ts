// Service d'autocomplétion d'adresses françaises
export interface AddressSuggestion {
  label: string;
  value: string;
  city: string;
  postalCode: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface AddressSearchResult {
  features: Array<{
    properties: {
      label: string;
      city: string;
      postcode: string;
      housenumber?: string;
      street?: string;
      name?: string;
    };
    geometry: {
      coordinates: [number, number]; // [lng, lat]
    };
  }>;
}

/**
 * Recherche d'adresses françaises avec autocomplétion
 * Utilise l'API Adresse du gouvernement français
 */
export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodedQuery}&limit=5&autocomplete=1&country=FR`
    );

    if (!response.ok) {
      throw new Error('Erreur lors de la recherche d\'adresses');
    }

    const data: AddressSearchResult = await response.json();
    
    return data.features.map(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      
      // Construire l'adresse complète
      let fullAddress = '';
      if (props.housenumber && props.street) {
        fullAddress = `${props.housenumber} ${props.street}`;
      } else if (props.street) {
        fullAddress = props.street;
      } else if (props.name) {
        fullAddress = props.name;
      }
      
      // Format pour l'affichage
      const displayLabel = props.label;
      
      // Format pour la valeur (adresse, ville, code postal)
      const value = `${fullAddress}, ${props.postcode} ${props.city}`;

      return {
        label: displayLabel,
        value: value,
        city: props.city,
        postalCode: props.postcode,
        address: fullAddress,
        coordinates: {
          lat: coords[1],
          lng: coords[0]
        }
      };
    });
  } catch (error) {
    console.error('Erreur lors de la recherche d\'adresses:', error);
    return [];
  }
}

/**
 * Valide qu'une adresse est complète et valide
 */
export function validateCompleteAddress(address: string): boolean {
  if (!address || address.trim().length < 10) return false;
  
  // Vérifier qu'il y a au moins une virgule (séparateur adresse/ville)
  const parts = address.split(',');
  if (parts.length < 2) return false;
  
  // Vérifier qu'il y a un code postal
  const cityPart = parts[1].trim();
  const postalCodeMatch = cityPart.match(/\d{5}/);
  return !!postalCodeMatch;
}

/**
 * Formate une adresse pour l'affichage
 */
export function formatAddressForDisplay(address: string): string {
  if (!address) return '';
  
  const parts = address.split(',');
  if (parts.length < 2) return address;
  
  const addressPart = parts[0].trim();
  const cityPart = parts[1].trim();
  
  return `${addressPart}, ${cityPart}`;
}
