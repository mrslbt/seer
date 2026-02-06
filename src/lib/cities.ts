/**
 * City database for birth location lookup
 * Includes major cities with coordinates and timezones
 */

export interface CityData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

// Major cities around the world
export const CITIES: CityData[] = [
  // North America
  { city: 'New York', country: 'USA', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York' },
  { city: 'Los Angeles', country: 'USA', latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles' },
  { city: 'Chicago', country: 'USA', latitude: 41.8781, longitude: -87.6298, timezone: 'America/Chicago' },
  { city: 'Houston', country: 'USA', latitude: 29.7604, longitude: -95.3698, timezone: 'America/Chicago' },
  { city: 'Phoenix', country: 'USA', latitude: 33.4484, longitude: -112.0740, timezone: 'America/Phoenix' },
  { city: 'Philadelphia', country: 'USA', latitude: 39.9526, longitude: -75.1652, timezone: 'America/New_York' },
  { city: 'San Antonio', country: 'USA', latitude: 29.4241, longitude: -98.4936, timezone: 'America/Chicago' },
  { city: 'San Diego', country: 'USA', latitude: 32.7157, longitude: -117.1611, timezone: 'America/Los_Angeles' },
  { city: 'Dallas', country: 'USA', latitude: 32.7767, longitude: -96.7970, timezone: 'America/Chicago' },
  { city: 'San Francisco', country: 'USA', latitude: 37.7749, longitude: -122.4194, timezone: 'America/Los_Angeles' },
  { city: 'Austin', country: 'USA', latitude: 30.2672, longitude: -97.7431, timezone: 'America/Chicago' },
  { city: 'Seattle', country: 'USA', latitude: 47.6062, longitude: -122.3321, timezone: 'America/Los_Angeles' },
  { city: 'Denver', country: 'USA', latitude: 39.7392, longitude: -104.9903, timezone: 'America/Denver' },
  { city: 'Boston', country: 'USA', latitude: 42.3601, longitude: -71.0589, timezone: 'America/New_York' },
  { city: 'Miami', country: 'USA', latitude: 25.7617, longitude: -80.1918, timezone: 'America/New_York' },
  { city: 'Atlanta', country: 'USA', latitude: 33.7490, longitude: -84.3880, timezone: 'America/New_York' },
  { city: 'Toronto', country: 'Canada', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto' },
  { city: 'Vancouver', country: 'Canada', latitude: 49.2827, longitude: -123.1207, timezone: 'America/Vancouver' },
  { city: 'Montreal', country: 'Canada', latitude: 45.5017, longitude: -73.5673, timezone: 'America/Montreal' },
  { city: 'Mexico City', country: 'Mexico', latitude: 19.4326, longitude: -99.1332, timezone: 'America/Mexico_City' },

  // Europe
  { city: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { city: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' },
  { city: 'Berlin', country: 'Germany', latitude: 52.5200, longitude: 13.4050, timezone: 'Europe/Berlin' },
  { city: 'Madrid', country: 'Spain', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' },
  { city: 'Rome', country: 'Italy', latitude: 41.9028, longitude: 12.4964, timezone: 'Europe/Rome' },
  { city: 'Amsterdam', country: 'Netherlands', latitude: 52.3676, longitude: 4.9041, timezone: 'Europe/Amsterdam' },
  { city: 'Vienna', country: 'Austria', latitude: 48.2082, longitude: 16.3738, timezone: 'Europe/Vienna' },
  { city: 'Brussels', country: 'Belgium', latitude: 50.8503, longitude: 4.3517, timezone: 'Europe/Brussels' },
  { city: 'Stockholm', country: 'Sweden', latitude: 59.3293, longitude: 18.0686, timezone: 'Europe/Stockholm' },
  { city: 'Oslo', country: 'Norway', latitude: 59.9139, longitude: 10.7522, timezone: 'Europe/Oslo' },
  { city: 'Copenhagen', country: 'Denmark', latitude: 55.6761, longitude: 12.5683, timezone: 'Europe/Copenhagen' },
  { city: 'Dublin', country: 'Ireland', latitude: 53.3498, longitude: -6.2603, timezone: 'Europe/Dublin' },
  { city: 'Lisbon', country: 'Portugal', latitude: 38.7223, longitude: -9.1393, timezone: 'Europe/Lisbon' },
  { city: 'Barcelona', country: 'Spain', latitude: 41.3851, longitude: 2.1734, timezone: 'Europe/Madrid' },
  { city: 'Munich', country: 'Germany', latitude: 48.1351, longitude: 11.5820, timezone: 'Europe/Berlin' },
  { city: 'Milan', country: 'Italy', latitude: 45.4642, longitude: 9.1900, timezone: 'Europe/Rome' },
  { city: 'Prague', country: 'Czech Republic', latitude: 50.0755, longitude: 14.4378, timezone: 'Europe/Prague' },
  { city: 'Warsaw', country: 'Poland', latitude: 52.2297, longitude: 21.0122, timezone: 'Europe/Warsaw' },
  { city: 'Budapest', country: 'Hungary', latitude: 47.4979, longitude: 19.0402, timezone: 'Europe/Budapest' },
  { city: 'Athens', country: 'Greece', latitude: 37.9838, longitude: 23.7275, timezone: 'Europe/Athens' },
  { city: 'Moscow', country: 'Russia', latitude: 55.7558, longitude: 37.6173, timezone: 'Europe/Moscow' },
  { city: 'Istanbul', country: 'Turkey', latitude: 41.0082, longitude: 28.9784, timezone: 'Europe/Istanbul' },

  // Asia
  { city: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
  { city: 'Seoul', country: 'South Korea', latitude: 37.5665, longitude: 126.9780, timezone: 'Asia/Seoul' },
  { city: 'Beijing', country: 'China', latitude: 39.9042, longitude: 116.4074, timezone: 'Asia/Shanghai' },
  { city: 'Shanghai', country: 'China', latitude: 31.2304, longitude: 121.4737, timezone: 'Asia/Shanghai' },
  { city: 'Hong Kong', country: 'China', latitude: 22.3193, longitude: 114.1694, timezone: 'Asia/Hong_Kong' },
  { city: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore' },
  { city: 'Bangkok', country: 'Thailand', latitude: 13.7563, longitude: 100.5018, timezone: 'Asia/Bangkok' },
  { city: 'Mumbai', country: 'India', latitude: 19.0760, longitude: 72.8777, timezone: 'Asia/Kolkata' },
  { city: 'Delhi', country: 'India', latitude: 28.7041, longitude: 77.1025, timezone: 'Asia/Kolkata' },
  { city: 'Bangalore', country: 'India', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' },
  { city: 'Jakarta', country: 'Indonesia', latitude: -6.2088, longitude: 106.8456, timezone: 'Asia/Jakarta' },
  { city: 'Manila', country: 'Philippines', latitude: 14.5995, longitude: 120.9842, timezone: 'Asia/Manila' },
  { city: 'Taipei', country: 'Taiwan', latitude: 25.0330, longitude: 121.5654, timezone: 'Asia/Taipei' },
  { city: 'Dubai', country: 'UAE', latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai' },
  { city: 'Tel Aviv', country: 'Israel', latitude: 32.0853, longitude: 34.7818, timezone: 'Asia/Jerusalem' },

  // Oceania
  { city: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { city: 'Melbourne', country: 'Australia', latitude: -37.8136, longitude: 144.9631, timezone: 'Australia/Melbourne' },
  { city: 'Brisbane', country: 'Australia', latitude: -27.4698, longitude: 153.0251, timezone: 'Australia/Brisbane' },
  { city: 'Perth', country: 'Australia', latitude: -31.9505, longitude: 115.8605, timezone: 'Australia/Perth' },
  { city: 'Auckland', country: 'New Zealand', latitude: -36.8509, longitude: 174.7645, timezone: 'Pacific/Auckland' },

  // South America
  { city: 'São Paulo', country: 'Brazil', latitude: -23.5505, longitude: -46.6333, timezone: 'America/Sao_Paulo' },
  { city: 'Rio de Janeiro', country: 'Brazil', latitude: -22.9068, longitude: -43.1729, timezone: 'America/Sao_Paulo' },
  { city: 'Buenos Aires', country: 'Argentina', latitude: -34.6037, longitude: -58.3816, timezone: 'America/Argentina/Buenos_Aires' },
  { city: 'Lima', country: 'Peru', latitude: -12.0464, longitude: -77.0428, timezone: 'America/Lima' },
  { city: 'Bogotá', country: 'Colombia', latitude: 4.7110, longitude: -74.0721, timezone: 'America/Bogota' },
  { city: 'Santiago', country: 'Chile', latitude: -33.4489, longitude: -70.6693, timezone: 'America/Santiago' },

  // Africa
  { city: 'Cairo', country: 'Egypt', latitude: 30.0444, longitude: 31.2357, timezone: 'Africa/Cairo' },
  { city: 'Lagos', country: 'Nigeria', latitude: 6.5244, longitude: 3.3792, timezone: 'Africa/Lagos' },
  { city: 'Johannesburg', country: 'South Africa', latitude: -26.2041, longitude: 28.0473, timezone: 'Africa/Johannesburg' },
  { city: 'Cape Town', country: 'South Africa', latitude: -33.9249, longitude: 18.4241, timezone: 'Africa/Johannesburg' },
  { city: 'Nairobi', country: 'Kenya', latitude: -1.2921, longitude: 36.8219, timezone: 'Africa/Nairobi' },
  { city: 'Casablanca', country: 'Morocco', latitude: 33.5731, longitude: -7.5898, timezone: 'Africa/Casablanca' },
];

/**
 * Search for cities matching a query
 */
export function searchCities(query: string): CityData[] {
  const lowerQuery = query.toLowerCase();
  return CITIES.filter(c =>
    c.city.toLowerCase().includes(lowerQuery) ||
    c.country.toLowerCase().includes(lowerQuery)
  ).slice(0, 10);
}

/**
 * Get city by exact name and country
 */
export function getCity(city: string, country: string): CityData | undefined {
  return CITIES.find(c =>
    c.city.toLowerCase() === city.toLowerCase() &&
    c.country.toLowerCase() === country.toLowerCase()
  );
}

/**
 * Format city for display
 */
export function formatCity(city: CityData): string {
  return `${city.city}, ${city.country}`;
}
