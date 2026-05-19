import { supabase } from '../utils/supabase/client';

export interface PlaceResult {
  place_id: string;
  name: string;
  rating?: number;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface GooglePlacesResponse {
  success: boolean;
  results: PlaceResult[];
  status?: string;
  error?: string;
}

// Get nearby places using Supabase Edge Function (no CORS issues)
export const getNearbyPlaces = async (
  lat: number,
  lng: number,
  radius: number = 500,
  type: string = 'establishment'
): Promise<GooglePlacesResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('google-places', {
      body: { lat, lng, radius, type },
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    throw error;
  }
};

// Get nearby landmarks (schools, hospitals, etc.)
export const getNearbyLandmarks = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await getNearbyPlaces(lat, lng, 500, 'establishment');

    if (response.success && response.results.length > 0) {
      const landmarks = response.results
        .filter((place) =>
          place.types.includes('school') ||
          place.types.includes('university') ||
          place.types.includes('hospital') ||
          place.types.includes('church') ||
          place.types.includes('shopping_mall') ||
          place.types.includes('restaurant') ||
          place.types.includes('bank')
        )
        .slice(0, 2)
        .map((place) => place.name)
        .join(', ');

      return landmarks || '';
    }

    return '';
  } catch (error) {
    console.error('Error fetching landmarks:', error);
    return getStaticLandmarks(lat, lng);
  }
};

// Get nearby safe places (police, hospitals, schools, etc.)
export const getNearbySafePlaces = async (lat: number, lng: number) => {
  const types = ['police', 'hospital', 'school', 'university', 'restaurant', 'health'];
  const allPlaces: any[] = [];

  for (const type of types) {
    try {
      const response = await getNearbyPlaces(lat, lng, 5000, type);

      if (response.success && response.results) {
        const places = response.results.map((place) => {
          const distance = calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng);
          const distanceKm = distance.toFixed(1);

          let placeType = type;
          let color = 'blue';

          if (type === 'police') {
            placeType = 'Police Station';
            color = 'blue';
          } else if (type === 'hospital') {
            placeType = 'Hospital';
            color = 'red';
          } else if (type === 'school' || type === 'university') {
            placeType = type === 'school' ? 'School' : 'College';
            color = 'green';
          } else if (type === 'restaurant') {
            placeType = 'Restaurant';
            color = 'purple';
          } else if (type === 'health') {
            placeType = 'Health Center';
            color = 'orange';
          }

          return {
            name: place.name,
            distance: `${distanceKm} km`,
            type: placeType,
            rating: place.rating || 4.0,
            color: color,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            place_id: place.place_id
          };
        });

        allPlaces.push(...places);
      }
    } catch (error) {
      console.warn(`Error fetching ${type} places:`, error);
    }
  }

  // Sort by distance and limit to top 20
  return allPlaces
    .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
    .slice(0, 20);
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Static landmarks fallback based on location
const getStaticLandmarks = (lat: number, lng: number): string => {
  // Goa area landmarks based on coordinates
  if (lat >= 15.2 && lat <= 15.5 && lng >= 73.7 && lng <= 74.0) {
    // Central Goa area
    return 'Padre Conceicao College, Verna Industrial Estate';
  } else if (lat >= 15.4 && lat <= 15.6 && lng >= 73.8 && lng <= 74.0) {
    // North Goa area
    return 'Panaji Police Station, Goa Medical College';
  } else if (lat >= 15.2 && lat <= 15.4 && lng >= 73.9 && lng <= 74.1) {
    // South Goa area
    return 'Margao Railway Station, Hospicio Hospital';
  } else {
    // Default Goa landmarks
    return 'Goa Medical College, Dabolim Airport';
  }
};
