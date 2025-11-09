/**
 * Distance calculation utilities using Haversine formula
 * Industry-standard implementation (Google Maps, Uber, Airbnb pattern)
 * 
 * @module distanceCalculator
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * Accurate for distances up to ~500km (perfect for city-level searches)
 * 
 * @param lat1 - Latitude of point 1 (degrees)
 * @param lon1 - Longitude of point 1 (degrees)
 * @param lat2 - Latitude of point 2 (degrees)
 * @param lon2 - Longitude of point 2 (degrees)
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 * @param km - Distance in kilometers
 * @returns Formatted string (e.g., "2.5 km", "350 m")
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Sort locations by distance from a reference point
 * @param locations - Array of locations with lat/lng
 * @param refLat - Reference latitude
 * @param refLng - Reference longitude
 * @returns Sorted array with distance property added
 */
export function sortByDistance<T extends { latitude: number; longitude: number }>(
  locations: T[],
  refLat: number,
  refLng: number
): (T & { distance_km: number })[] {
  return locations
    .map(location => ({
      ...location,
      distance_km: calculateDistance(refLat, refLng, location.latitude, location.longitude)
    }))
    .sort((a, b) => a.distance_km - b.distance_km);
}

/**
 * Filter locations within a radius
 * @param locations - Array of locations with lat/lng
 * @param refLat - Reference latitude
 * @param refLng - Reference longitude
 * @param radiusKm - Maximum distance in kilometers
 * @returns Filtered array with distance property
 */
export function filterByRadius<T extends { latitude: number; longitude: number }>(
  locations: T[],
  refLat: number,
  refLng: number,
  radiusKm: number
): (T & { distance_km: number })[] {
  return sortByDistance(locations, refLat, refLng)
    .filter(location => location.distance_km <= radiusKm);
}
