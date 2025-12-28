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
      coordinates: [number, number];
    };
  }>;
}

export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  if (!query || query.length < 3) return [];

  try {
    const cleanedQuery = query.trim().replace(/\s+/g, ' ');
    if (cleanedQuery.length < 3) return [];
    
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(cleanedQuery)}&limit=5&autocomplete=1&country=FR`
    );

    if (!response.ok) {
      return [];
    }

    const data: AddressSearchResult = await response.json();
    
    return data.features.map(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      const fullAddress = props.housenumber && props.street
        ? `${props.housenumber} ${props.street}`
        : props.street || props.name || '';

      return {
        label: props.label,
        value: `${fullAddress}, ${props.postcode} ${props.city}`,
        city: props.city,
        postalCode: props.postcode,
        address: fullAddress,
        coordinates: {
          lat: coords[1],
          lng: coords[0]
        }
      };
    });
  } catch {
    return [];
  }
}

export function validateCompleteAddress(address: string): boolean {
  if (!address || address.trim().length < 10) return false;
  const parts = address.split(',');
  if (parts.length < 2) return false;
  return /\d{5}/.test(parts[1].trim());
}

export function formatAddressForDisplay(address: string): string {
  if (!address) return '';
  const parts = address.split(',');
  if (parts.length < 2) return address;
  return `${parts[0].trim()}, ${parts[1].trim()}`;
}
