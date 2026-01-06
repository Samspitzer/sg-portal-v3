// ============================================================================
// Radar.io Address Autocomplete Utilities
// Location: src/utils/addressAutocomplete.ts
// 
// Provides address autocomplete functionality using Radar.io API
// Free tier: 100,000 requests/month
// 
// SETUP: 
// Add to packages/frontend/.env: VITE_RADAR_PUBLISHABLE_KEY=your_key_here
// ============================================================================

// Radar.io Publishable API Key from environment variable
const RADAR_API_KEY = import.meta.env.VITE_RADAR_PUBLISHABLE_KEY as string || '';

if (!RADAR_API_KEY) {
  console.warn('Radar.io API key not found. Add VITE_RADAR_PUBLISHABLE_KEY to your .env file.');
}

// Types for address
export interface AddressComponents {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  fullAddress: string;
}

// Radar.io autocomplete result type
interface RadarAutocompleteAddress {
  addressLabel?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  number?: string;
  street?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
}

interface RadarAutocompleteResponse {
  meta: {
    code: number;
  };
  addresses: RadarAutocompleteAddress[];
}

/**
 * Search for addresses using Radar.io autocomplete API
 * 
 * @param query - Search query (partial address)
 * @param options - Optional settings
 * @returns Array of address suggestions
 */
export const searchAddresses = async (
  query: string,
  options?: {
    country?: string;
    limit?: number;
  }
): Promise<AddressComponents[]> => {
  if (!query || query.length < 3) {
    return [];
  }

  if (!RADAR_API_KEY) {
    console.error('Radar.io API key not configured');
    return [];
  }

  try {
    const params = new URLSearchParams({
      query,
      country: options?.country || 'US',
      limit: String(options?.limit || 5),
    });

    const response = await fetch(
      `https://api.radar.io/v1/search/autocomplete?${params}`,
      {
        headers: {
          'Authorization': RADAR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Radar API error: ${response.status}`);
    }

    const data: RadarAutocompleteResponse = await response.json();

    if (data.meta.code !== 200) {
      throw new Error(`Radar API error code: ${data.meta.code}`);
    }

    return data.addresses.map((addr) => ({
      street: addr.number && addr.street 
        ? `${addr.number} ${addr.street}` 
        : addr.street || addr.addressLabel || '',
      city: addr.city || '',
      state: addr.stateCode || addr.state || '',
      zip: addr.postalCode || '',
      country: addr.countryCode || addr.country || '',
      fullAddress: addr.formattedAddress || '',
    }));
  } catch (error) {
    console.error('Error searching addresses:', error);
    return [];
  }
};

/**
 * Check if Radar.io API is configured
 */
export const isRadarConfigured = (): boolean => {
  return !!RADAR_API_KEY;
};