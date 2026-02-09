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
  // North America — USA
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
  { city: 'Portland', country: 'USA', latitude: 45.5152, longitude: -122.6784, timezone: 'America/Los_Angeles' },
  { city: 'Nashville', country: 'USA', latitude: 36.1627, longitude: -86.7816, timezone: 'America/Chicago' },
  { city: 'Charlotte', country: 'USA', latitude: 35.2271, longitude: -80.8431, timezone: 'America/New_York' },
  { city: 'Minneapolis', country: 'USA', latitude: 44.9778, longitude: -93.2650, timezone: 'America/Chicago' },
  { city: 'Detroit', country: 'USA', latitude: 42.3314, longitude: -83.0458, timezone: 'America/Detroit' },
  { city: 'Las Vegas', country: 'USA', latitude: 36.1699, longitude: -115.1398, timezone: 'America/Los_Angeles' },
  { city: 'Baltimore', country: 'USA', latitude: 39.2904, longitude: -76.6122, timezone: 'America/New_York' },
  { city: 'Salt Lake City', country: 'USA', latitude: 40.7608, longitude: -111.8910, timezone: 'America/Denver' },
  { city: 'Honolulu', country: 'USA', latitude: 21.3069, longitude: -157.8583, timezone: 'Pacific/Honolulu' },
  { city: 'Anchorage', country: 'USA', latitude: 61.2181, longitude: -149.9003, timezone: 'America/Anchorage' },
  { city: 'New Orleans', country: 'USA', latitude: 29.9511, longitude: -90.0715, timezone: 'America/Chicago' },
  { city: 'Tampa', country: 'USA', latitude: 27.9506, longitude: -82.4572, timezone: 'America/New_York' },
  { city: 'Pittsburgh', country: 'USA', latitude: 40.4406, longitude: -79.9959, timezone: 'America/New_York' },
  { city: 'St. Louis', country: 'USA', latitude: 38.6270, longitude: -90.1994, timezone: 'America/Chicago' },
  { city: 'Kansas City', country: 'USA', latitude: 39.0997, longitude: -94.5786, timezone: 'America/Chicago' },
  { city: 'Indianapolis', country: 'USA', latitude: 39.7684, longitude: -86.1581, timezone: 'America/Indiana/Indianapolis' },
  { city: 'Columbus', country: 'USA', latitude: 39.9612, longitude: -82.9988, timezone: 'America/New_York' },
  { city: 'Cleveland', country: 'USA', latitude: 41.4993, longitude: -81.6944, timezone: 'America/New_York' },
  { city: 'Cincinnati', country: 'USA', latitude: 39.1031, longitude: -84.5120, timezone: 'America/New_York' },
  { city: 'Milwaukee', country: 'USA', latitude: 43.0389, longitude: -87.9065, timezone: 'America/Chicago' },
  { city: 'Raleigh', country: 'USA', latitude: 35.7796, longitude: -78.6382, timezone: 'America/New_York' },
  { city: 'Sacramento', country: 'USA', latitude: 38.5816, longitude: -121.4944, timezone: 'America/Los_Angeles' },
  { city: 'San Jose', country: 'USA', latitude: 37.3382, longitude: -121.8863, timezone: 'America/Los_Angeles' },

  // North America — Canada
  { city: 'Toronto', country: 'Canada', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto' },
  { city: 'Vancouver', country: 'Canada', latitude: 49.2827, longitude: -123.1207, timezone: 'America/Vancouver' },
  { city: 'Montreal', country: 'Canada', latitude: 45.5017, longitude: -73.5673, timezone: 'America/Montreal' },
  { city: 'Ottawa', country: 'Canada', latitude: 45.4215, longitude: -75.6972, timezone: 'America/Toronto' },
  { city: 'Calgary', country: 'Canada', latitude: 51.0447, longitude: -114.0719, timezone: 'America/Edmonton' },
  { city: 'Edmonton', country: 'Canada', latitude: 53.5461, longitude: -113.4938, timezone: 'America/Edmonton' },
  { city: 'Winnipeg', country: 'Canada', latitude: 49.8951, longitude: -97.1384, timezone: 'America/Winnipeg' },
  { city: 'Halifax', country: 'Canada', latitude: 44.6488, longitude: -63.5752, timezone: 'America/Halifax' },

  // North America — Mexico & Central America / Caribbean
  { city: 'Mexico City', country: 'Mexico', latitude: 19.4326, longitude: -99.1332, timezone: 'America/Mexico_City' },
  { city: 'Guadalajara', country: 'Mexico', latitude: 20.6597, longitude: -103.3496, timezone: 'America/Mexico_City' },
  { city: 'Monterrey', country: 'Mexico', latitude: 25.6866, longitude: -100.3161, timezone: 'America/Monterrey' },
  { city: 'Havana', country: 'Cuba', latitude: 23.1136, longitude: -82.3666, timezone: 'America/Havana' },
  { city: 'San José', country: 'Costa Rica', latitude: 9.9281, longitude: -84.0907, timezone: 'America/Costa_Rica' },
  { city: 'Panama City', country: 'Panama', latitude: 8.9824, longitude: -79.5199, timezone: 'America/Panama' },

  // Europe — Western
  { city: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { city: 'Edinburgh', country: 'UK', latitude: 55.9533, longitude: -3.1883, timezone: 'Europe/London' },
  { city: 'Manchester', country: 'UK', latitude: 53.4808, longitude: -2.2426, timezone: 'Europe/London' },
  { city: 'Glasgow', country: 'UK', latitude: 55.8642, longitude: -4.2518, timezone: 'Europe/London' },
  { city: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' },
  { city: 'Lyon', country: 'France', latitude: 45.7640, longitude: 4.8357, timezone: 'Europe/Paris' },
  { city: 'Marseille', country: 'France', latitude: 43.2965, longitude: 5.3698, timezone: 'Europe/Paris' },
  { city: 'Dublin', country: 'Ireland', latitude: 53.3498, longitude: -6.2603, timezone: 'Europe/Dublin' },
  { city: 'Amsterdam', country: 'Netherlands', latitude: 52.3676, longitude: 4.9041, timezone: 'Europe/Amsterdam' },
  { city: 'Brussels', country: 'Belgium', latitude: 50.8503, longitude: 4.3517, timezone: 'Europe/Brussels' },
  { city: 'Lisbon', country: 'Portugal', latitude: 38.7223, longitude: -9.1393, timezone: 'Europe/Lisbon' },
  { city: 'Porto', country: 'Portugal', latitude: 41.1579, longitude: -8.6291, timezone: 'Europe/Lisbon' },

  // Europe — Central
  { city: 'Berlin', country: 'Germany', latitude: 52.5200, longitude: 13.4050, timezone: 'Europe/Berlin' },
  { city: 'Munich', country: 'Germany', latitude: 48.1351, longitude: 11.5820, timezone: 'Europe/Berlin' },
  { city: 'Hamburg', country: 'Germany', latitude: 53.5511, longitude: 9.9937, timezone: 'Europe/Berlin' },
  { city: 'Frankfurt', country: 'Germany', latitude: 50.1109, longitude: 8.6821, timezone: 'Europe/Berlin' },
  { city: 'Vienna', country: 'Austria', latitude: 48.2082, longitude: 16.3738, timezone: 'Europe/Vienna' },
  { city: 'Zurich', country: 'Switzerland', latitude: 47.3769, longitude: 8.5417, timezone: 'Europe/Zurich' },
  { city: 'Geneva', country: 'Switzerland', latitude: 46.2044, longitude: 6.1432, timezone: 'Europe/Zurich' },
  { city: 'Prague', country: 'Czech Republic', latitude: 50.0755, longitude: 14.4378, timezone: 'Europe/Prague' },
  { city: 'Warsaw', country: 'Poland', latitude: 52.2297, longitude: 21.0122, timezone: 'Europe/Warsaw' },
  { city: 'Krakow', country: 'Poland', latitude: 50.0647, longitude: 19.9450, timezone: 'Europe/Warsaw' },
  { city: 'Budapest', country: 'Hungary', latitude: 47.4979, longitude: 19.0402, timezone: 'Europe/Budapest' },

  // Europe — Southern
  { city: 'Madrid', country: 'Spain', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' },
  { city: 'Barcelona', country: 'Spain', latitude: 41.3851, longitude: 2.1734, timezone: 'Europe/Madrid' },
  { city: 'Seville', country: 'Spain', latitude: 37.3891, longitude: -5.9845, timezone: 'Europe/Madrid' },
  { city: 'Valencia', country: 'Spain', latitude: 39.4699, longitude: -0.3763, timezone: 'Europe/Madrid' },
  { city: 'Rome', country: 'Italy', latitude: 41.9028, longitude: 12.4964, timezone: 'Europe/Rome' },
  { city: 'Milan', country: 'Italy', latitude: 45.4642, longitude: 9.1900, timezone: 'Europe/Rome' },
  { city: 'Naples', country: 'Italy', latitude: 40.8518, longitude: 14.2681, timezone: 'Europe/Rome' },
  { city: 'Florence', country: 'Italy', latitude: 43.7696, longitude: 11.2558, timezone: 'Europe/Rome' },
  { city: 'Athens', country: 'Greece', latitude: 37.9838, longitude: 23.7275, timezone: 'Europe/Athens' },

  // Europe — Nordic
  { city: 'Stockholm', country: 'Sweden', latitude: 59.3293, longitude: 18.0686, timezone: 'Europe/Stockholm' },
  { city: 'Oslo', country: 'Norway', latitude: 59.9139, longitude: 10.7522, timezone: 'Europe/Oslo' },
  { city: 'Copenhagen', country: 'Denmark', latitude: 55.6761, longitude: 12.5683, timezone: 'Europe/Copenhagen' },
  { city: 'Helsinki', country: 'Finland', latitude: 60.1699, longitude: 24.9384, timezone: 'Europe/Helsinki' },

  // Europe — Eastern & Southeastern
  { city: 'Moscow', country: 'Russia', latitude: 55.7558, longitude: 37.6173, timezone: 'Europe/Moscow' },
  { city: 'Istanbul', country: 'Turkey', latitude: 41.0082, longitude: 28.9784, timezone: 'Europe/Istanbul' },
  { city: 'Ankara', country: 'Turkey', latitude: 39.9334, longitude: 32.8597, timezone: 'Europe/Istanbul' },
  { city: 'Bucharest', country: 'Romania', latitude: 44.4268, longitude: 26.1025, timezone: 'Europe/Bucharest' },
  { city: 'Sofia', country: 'Bulgaria', latitude: 42.6977, longitude: 23.3219, timezone: 'Europe/Sofia' },
  { city: 'Zagreb', country: 'Croatia', latitude: 45.8150, longitude: 15.9819, timezone: 'Europe/Zagreb' },
  { city: 'Belgrade', country: 'Serbia', latitude: 44.7866, longitude: 20.4489, timezone: 'Europe/Belgrade' },
  { city: 'Kyiv', country: 'Ukraine', latitude: 50.4504, longitude: 30.5234, timezone: 'Europe/Kyiv' },

  // Asia — East
  { city: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
  { city: 'Seoul', country: 'South Korea', latitude: 37.5665, longitude: 126.9780, timezone: 'Asia/Seoul' },
  { city: 'Beijing', country: 'China', latitude: 39.9042, longitude: 116.4074, timezone: 'Asia/Shanghai' },
  { city: 'Shanghai', country: 'China', latitude: 31.2304, longitude: 121.4737, timezone: 'Asia/Shanghai' },
  { city: 'Hong Kong', country: 'China', latitude: 22.3193, longitude: 114.1694, timezone: 'Asia/Hong_Kong' },
  { city: 'Taipei', country: 'Taiwan', latitude: 25.0330, longitude: 121.5654, timezone: 'Asia/Taipei' },

  // Asia — Southeast
  { city: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore' },
  { city: 'Bangkok', country: 'Thailand', latitude: 13.7563, longitude: 100.5018, timezone: 'Asia/Bangkok' },
  { city: 'Jakarta', country: 'Indonesia', latitude: -6.2088, longitude: 106.8456, timezone: 'Asia/Jakarta' },
  { city: 'Kuala Lumpur', country: 'Malaysia', latitude: 3.1390, longitude: 101.6869, timezone: 'Asia/Kuala_Lumpur' },
  { city: 'Hanoi', country: 'Vietnam', latitude: 21.0285, longitude: 105.8542, timezone: 'Asia/Ho_Chi_Minh' },
  { city: 'Ho Chi Minh City', country: 'Vietnam', latitude: 10.8231, longitude: 106.6297, timezone: 'Asia/Ho_Chi_Minh' },
  { city: 'Phnom Penh', country: 'Cambodia', latitude: 11.5564, longitude: 104.9282, timezone: 'Asia/Phnom_Penh' },
  { city: 'Yangon', country: 'Myanmar', latitude: 16.8661, longitude: 96.1951, timezone: 'Asia/Yangon' },

  // Asia — Philippines
  { city: 'Manila', country: 'Philippines', latitude: 14.5995, longitude: 120.9842, timezone: 'Asia/Manila' },
  { city: 'Quezon City', country: 'Philippines', latitude: 14.6760, longitude: 121.0437, timezone: 'Asia/Manila' },
  { city: 'Makati', country: 'Philippines', latitude: 14.5547, longitude: 121.0244, timezone: 'Asia/Manila' },
  { city: 'Pasig', country: 'Philippines', latitude: 14.5764, longitude: 121.0851, timezone: 'Asia/Manila' },
  { city: 'Taguig', country: 'Philippines', latitude: 14.5176, longitude: 121.0509, timezone: 'Asia/Manila' },
  { city: 'Caloocan', country: 'Philippines', latitude: 14.6488, longitude: 120.9840, timezone: 'Asia/Manila' },
  { city: 'Pasay', country: 'Philippines', latitude: 14.5378, longitude: 121.0014, timezone: 'Asia/Manila' },
  { city: 'Valenzuela', country: 'Philippines', latitude: 14.6942, longitude: 120.9842, timezone: 'Asia/Manila' },
  { city: 'Las Piñas', country: 'Philippines', latitude: 14.4445, longitude: 120.9939, timezone: 'Asia/Manila' },
  { city: 'Parañaque', country: 'Philippines', latitude: 14.4793, longitude: 121.0198, timezone: 'Asia/Manila' },
  { city: 'Muntinlupa', country: 'Philippines', latitude: 14.4081, longitude: 121.0415, timezone: 'Asia/Manila' },
  { city: 'Marikina', country: 'Philippines', latitude: 14.6507, longitude: 121.1029, timezone: 'Asia/Manila' },
  { city: 'Mandaluyong', country: 'Philippines', latitude: 14.5794, longitude: 121.0359, timezone: 'Asia/Manila' },
  { city: 'Antipolo', country: 'Philippines', latitude: 14.5862, longitude: 121.1761, timezone: 'Asia/Manila' },
  { city: 'Angeles City', country: 'Philippines', latitude: 15.1450, longitude: 120.5887, timezone: 'Asia/Manila' },
  { city: 'Baguio City', country: 'Philippines', latitude: 16.4023, longitude: 120.5960, timezone: 'Asia/Manila' },
  { city: 'Cebu City', country: 'Philippines', latitude: 10.3157, longitude: 123.8854, timezone: 'Asia/Manila' },
  { city: 'Davao City', country: 'Philippines', latitude: 7.1907, longitude: 125.4553, timezone: 'Asia/Manila' },
  { city: 'Zamboanga City', country: 'Philippines', latitude: 6.9214, longitude: 122.0790, timezone: 'Asia/Manila' },
  { city: 'Cagayan de Oro', country: 'Philippines', latitude: 8.4542, longitude: 124.6319, timezone: 'Asia/Manila' },
  { city: 'Iloilo City', country: 'Philippines', latitude: 10.6920, longitude: 122.5644, timezone: 'Asia/Manila' },
  { city: 'Bacolod', country: 'Philippines', latitude: 10.6840, longitude: 122.9563, timezone: 'Asia/Manila' },
  { city: 'General Santos', country: 'Philippines', latitude: 6.1164, longitude: 125.1716, timezone: 'Asia/Manila' },

  // Asia — South
  { city: 'Mumbai', country: 'India', latitude: 19.0760, longitude: 72.8777, timezone: 'Asia/Kolkata' },
  { city: 'Delhi', country: 'India', latitude: 28.7041, longitude: 77.1025, timezone: 'Asia/Kolkata' },
  { city: 'Bangalore', country: 'India', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' },
  { city: 'Colombo', country: 'Sri Lanka', latitude: 6.9271, longitude: 79.8612, timezone: 'Asia/Colombo' },
  { city: 'Kathmandu', country: 'Nepal', latitude: 27.7172, longitude: 85.3240, timezone: 'Asia/Kathmandu' },
  { city: 'Dhaka', country: 'Bangladesh', latitude: 23.8103, longitude: 90.4125, timezone: 'Asia/Dhaka' },
  { city: 'Karachi', country: 'Pakistan', latitude: 24.8607, longitude: 67.0011, timezone: 'Asia/Karachi' },
  { city: 'Lahore', country: 'Pakistan', latitude: 31.5204, longitude: 74.3587, timezone: 'Asia/Karachi' },
  { city: 'Islamabad', country: 'Pakistan', latitude: 33.6844, longitude: 73.0479, timezone: 'Asia/Karachi' },

  // Asia — Middle East
  { city: 'Dubai', country: 'UAE', latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai' },
  { city: 'Tel Aviv', country: 'Israel', latitude: 32.0853, longitude: 34.7818, timezone: 'Asia/Jerusalem' },
  { city: 'Riyadh', country: 'Saudi Arabia', latitude: 24.7136, longitude: 46.6753, timezone: 'Asia/Riyadh' },
  { city: 'Jeddah', country: 'Saudi Arabia', latitude: 21.4858, longitude: 39.1925, timezone: 'Asia/Riyadh' },
  { city: 'Doha', country: 'Qatar', latitude: 25.2854, longitude: 51.5310, timezone: 'Asia/Qatar' },
  { city: 'Kuwait City', country: 'Kuwait', latitude: 29.3759, longitude: 47.9774, timezone: 'Asia/Kuwait' },
  { city: 'Muscat', country: 'Oman', latitude: 23.5880, longitude: 58.3829, timezone: 'Asia/Muscat' },
  { city: 'Beirut', country: 'Lebanon', latitude: 33.8938, longitude: 35.5018, timezone: 'Asia/Beirut' },
  { city: 'Amman', country: 'Jordan', latitude: 31.9454, longitude: 35.9284, timezone: 'Asia/Amman' },

  // Oceania
  { city: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { city: 'Melbourne', country: 'Australia', latitude: -37.8136, longitude: 144.9631, timezone: 'Australia/Melbourne' },
  { city: 'Brisbane', country: 'Australia', latitude: -27.4698, longitude: 153.0251, timezone: 'Australia/Brisbane' },
  { city: 'Perth', country: 'Australia', latitude: -31.9505, longitude: 115.8605, timezone: 'Australia/Perth' },
  { city: 'Adelaide', country: 'Australia', latitude: -34.9285, longitude: 138.6007, timezone: 'Australia/Adelaide' },
  { city: 'Auckland', country: 'New Zealand', latitude: -36.8509, longitude: 174.7645, timezone: 'Pacific/Auckland' },
  { city: 'Wellington', country: 'New Zealand', latitude: -41.2865, longitude: 174.7762, timezone: 'Pacific/Auckland' },

  // South America
  { city: 'São Paulo', country: 'Brazil', latitude: -23.5505, longitude: -46.6333, timezone: 'America/Sao_Paulo' },
  { city: 'Rio de Janeiro', country: 'Brazil', latitude: -22.9068, longitude: -43.1729, timezone: 'America/Sao_Paulo' },
  { city: 'Buenos Aires', country: 'Argentina', latitude: -34.6037, longitude: -58.3816, timezone: 'America/Argentina/Buenos_Aires' },
  { city: 'Lima', country: 'Peru', latitude: -12.0464, longitude: -77.0428, timezone: 'America/Lima' },
  { city: 'Bogotá', country: 'Colombia', latitude: 4.7110, longitude: -74.0721, timezone: 'America/Bogota' },
  { city: 'Medellín', country: 'Colombia', latitude: 6.2476, longitude: -75.5658, timezone: 'America/Bogota' },
  { city: 'Santiago', country: 'Chile', latitude: -33.4489, longitude: -70.6693, timezone: 'America/Santiago' },
  { city: 'Quito', country: 'Ecuador', latitude: -0.1807, longitude: -78.4678, timezone: 'America/Guayaquil' },
  { city: 'Caracas', country: 'Venezuela', latitude: 10.4806, longitude: -66.9036, timezone: 'America/Caracas' },
  { city: 'Montevideo', country: 'Uruguay', latitude: -34.9011, longitude: -56.1645, timezone: 'America/Montevideo' },

  // Africa
  { city: 'Cairo', country: 'Egypt', latitude: 30.0444, longitude: 31.2357, timezone: 'Africa/Cairo' },
  { city: 'Lagos', country: 'Nigeria', latitude: 6.5244, longitude: 3.3792, timezone: 'Africa/Lagos' },
  { city: 'Abuja', country: 'Nigeria', latitude: 9.0579, longitude: 7.4951, timezone: 'Africa/Lagos' },
  { city: 'Johannesburg', country: 'South Africa', latitude: -26.2041, longitude: 28.0473, timezone: 'Africa/Johannesburg' },
  { city: 'Cape Town', country: 'South Africa', latitude: -33.9249, longitude: 18.4241, timezone: 'Africa/Johannesburg' },
  { city: 'Nairobi', country: 'Kenya', latitude: -1.2921, longitude: 36.8219, timezone: 'Africa/Nairobi' },
  { city: 'Casablanca', country: 'Morocco', latitude: 33.5731, longitude: -7.5898, timezone: 'Africa/Casablanca' },
  { city: 'Accra', country: 'Ghana', latitude: 5.6037, longitude: -0.1870, timezone: 'Africa/Accra' },
  { city: 'Addis Ababa', country: 'Ethiopia', latitude: 9.0250, longitude: 38.7469, timezone: 'Africa/Addis_Ababa' },
  { city: 'Dar es Salaam', country: 'Tanzania', latitude: -6.7924, longitude: 39.2083, timezone: 'Africa/Dar_es_Salaam' },
  { city: 'Kampala', country: 'Uganda', latitude: 0.3476, longitude: 32.5825, timezone: 'Africa/Kampala' },
  { city: 'Algiers', country: 'Algeria', latitude: 36.7538, longitude: 3.0588, timezone: 'Africa/Algiers' },
  { city: 'Tunis', country: 'Tunisia', latitude: 36.8065, longitude: 10.1815, timezone: 'Africa/Tunis' },
  { city: 'Dakar', country: 'Senegal', latitude: 14.7167, longitude: -17.4677, timezone: 'Africa/Dakar' },
  { city: 'Kinshasa', country: 'DR Congo', latitude: -4.4419, longitude: 15.2663, timezone: 'Africa/Kinshasa' },
  { city: 'Luanda', country: 'Angola', latitude: -8.8390, longitude: 13.2894, timezone: 'Africa/Luanda' },
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
