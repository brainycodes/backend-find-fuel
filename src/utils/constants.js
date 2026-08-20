export const COUNTRIES = {
  // Africa
  NG: { name: 'Nigeria', continent: 'Africa', currency: 'NGN', symbol: '₦', capital: 'Abuja' },
  GH: { name: 'Ghana', continent: 'Africa', currency: 'GHS', symbol: '₵', capital: 'Accra' },
  KE: { name: 'Kenya', continent: 'Africa', currency: 'KES', symbol: 'KSh', capital: 'Nairobi' },
  ZA: { name: 'South Africa', continent: 'Africa', currency: 'ZAR', symbol: 'R', capital: 'Pretoria' },
  EG: { name: 'Egypt', continent: 'Africa', currency: 'EGP', symbol: 'E£', capital: 'Cairo' },
  
  // North America
  US: { name: 'United States', continent: 'North America', currency: 'USD', symbol: '$', capital: 'Washington D.C.' },
  CA: { name: 'Canada', continent: 'North America', currency: 'CAD', symbol: 'C$', capital: 'Ottawa' },
  MX: { name: 'Mexico', continent: 'North America', currency: 'MXN', symbol: 'Mex$', capital: 'Mexico City' },
  
  // South America
  BR: { name: 'Brazil', continent: 'South America', currency: 'BRL', symbol: 'R$', capital: 'Brasília' },
  AR: { name: 'Argentina', continent: 'South America', currency: 'ARS', symbol: 'AR$', capital: 'Buenos Aires' },
  
  // Europe
  GB: { name: 'United Kingdom', continent: 'Europe', currency: 'GBP', symbol: '£', capital: 'London' },
  DE: { name: 'Germany', continent: 'Europe', currency: 'EUR', symbol: '€', capital: 'Berlin' },
  FR: { name: 'France', continent: 'Europe', currency: 'EUR', symbol: '€', capital: 'Paris' },
  IT: { name: 'Italy', continent: 'Europe', currency: 'EUR', symbol: '€', capital: 'Rome' },
  ES: { name: 'Spain', continent: 'Europe', currency: 'EUR', symbol: '€', capital: 'Madrid' },
  
  // Asia
  IN: { name: 'India', continent: 'Asia', currency: 'INR', symbol: '₹', capital: 'New Delhi' },
  JP: { name: 'Japan', continent: 'Asia', currency: 'JPY', symbol: '¥', capital: 'Tokyo' },
  AE: { name: 'UAE', continent: 'Asia', currency: 'AED', symbol: 'د.إ', capital: 'Abu Dhabi' },
  SA: { name: 'Saudi Arabia', continent: 'Asia', currency: 'SAR', symbol: '﷼', capital: 'Riyadh' },
  CN: { name: 'China', continent: 'Asia', currency: 'CNY', symbol: '¥', capital: 'Beijing' },
  
  // Oceania
  AU: { name: 'Australia', continent: 'Oceania', currency: 'AUD', symbol: 'A$', capital: 'Canberra' },
  NZ: { name: 'New Zealand', continent: 'Oceania', currency: 'NZD', symbol: 'NZ$', capital: 'Wellington' }
}

export const FUEL_TYPES = {
  US: [
    { key: 'regular', name: 'Regular', unit: 'gallon', avgPrice: 3.50 },
    { key: 'midgrade', name: 'Midgrade', unit: 'gallon', avgPrice: 3.80 },
    { key: 'premium', name: 'Premium', unit: 'gallon', avgPrice: 4.10 },
    { key: 'diesel', name: 'Diesel', unit: 'gallon', avgPrice: 4.00 }
  ],
  NG: [
    { key: 'pms', name: 'Petrol (PMS)', unit: 'litre', avgPrice: 568 },
    { key: 'ago', name: 'Diesel (AGO)', unit: 'litre', avgPrice: 850 },
    { key: 'dpk', name: 'Kerosene (DPK)', unit: 'litre', avgPrice: 750 },
    { key: 'lpg', name: 'Cooking Gas', unit: 'kg', avgPrice: 1000 }
  ],
  GB: [
    { key: 'unleaded', name: 'Unleaded', unit: 'litre', avgPrice: 1.45 },
    { key: 'super_unleaded', name: 'Super Unleaded', unit: 'litre', avgPrice: 1.58 },
    { key: 'diesel', name: 'Diesel', unit: 'litre', avgPrice: 1.52 }
  ],
  IN: [
    { key: 'petrol', name: 'Petrol', unit: 'litre', avgPrice: 96 },
    { key: 'diesel', name: 'Diesel', unit: 'litre', avgPrice: 89 },
    { key: 'cng', name: 'CNG', unit: 'kg', avgPrice: 76 }
  ],
  DE: [
    { key: 'super_e5', name: 'Super E5', unit: 'litre', avgPrice: 1.75 },
    { key: 'super_e10', name: 'Super E10', unit: 'litre', avgPrice: 1.70 },
    { key: 'diesel', name: 'Diesel', unit: 'litre', avgPrice: 1.65 }
  ],
  AE: [
    { key: 'special_95', name: 'Special 95', unit: 'litre', avgPrice: 2.90 },
    { key: 'super_98', name: 'Super 98', unit: 'litre', avgPrice: 3.05 },
    { key: 'diesel', name: 'Diesel', unit: 'litre', avgPrice: 3.15 }
  ],
  AU: [
    { key: 'unleaded_91', name: 'Unleaded 91', unit: 'litre', avgPrice: 1.90 },
    { key: 'premium_95', name: 'Premium 95', unit: 'litre', avgPrice: 2.05 },
    { key: 'diesel', name: 'Diesel', unit: 'litre', avgPrice: 2.00 }
  ]
}

export const DEFAULT_FUEL_TYPES = [
  { key: 'petrol', name: 'Petrol', unit: 'litre', avgPrice: null },
  { key: 'diesel', name: 'Diesel', unit: 'litre', avgPrice: null }
]

export const CONTINENTS = {
  'Africa': ['NG', 'GH', 'KE', 'ZA', 'EG'],
  'North America': ['US', 'CA', 'MX'],
  'South America': ['BR', 'AR'],
  'Europe': ['GB', 'DE', 'FR', 'IT', 'ES'],
  'Asia': ['IN', 'JP', 'AE', 'SA', 'CN'],
  'Oceania': ['AU', 'NZ']
}

export const DEFAULT_COORDINATES = {
  NG: { lat: 6.5244, lng: 3.3792 },
  GH: { lat: 5.6037, lng: -0.1870 },
  KE: { lat: -1.2921, lng: 36.8219 },
  ZA: { lat: -26.2041, lng: 28.0473 },
  EG: { lat: 30.0444, lng: 31.2357 },
  US: { lat: 40.7128, lng: -74.0060 },
  CA: { lat: 43.6532, lng: -79.3832 },
  MX: { lat: 19.4326, lng: -99.1332 },
  BR: { lat: -23.5505, lng: -46.6333 },
  AR: { lat: -34.6037, lng: -58.3816 },
  GB: { lat: 51.5074, lng: -0.1278 },
  DE: { lat: 52.5200, lng: 13.4050 },
  FR: { lat: 48.8566, lng: 2.3522 },
  IT: { lat: 41.9028, lng: 12.4964 },
  ES: { lat: 40.4168, lng: -3.7038 },
  IN: { lat: 28.6139, lng: 77.2090 },
  JP: { lat: 35.6762, lng: 139.6503 },
  AE: { lat: 25.2048, lng: 55.2708 },
  SA: { lat: 24.7136, lng: 46.6753 },
  CN: { lat: 39.9042, lng: 116.4074 },
  AU: { lat: -33.8688, lng: 151.2093 },
  NZ: { lat: -36.8485, lng: 174.7633 }
}

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
}