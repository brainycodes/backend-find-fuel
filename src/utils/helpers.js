/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0
  
  const R = 6371
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return Math.round(distance * 100) / 100
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180)
}

/**
 * Format OpenStreetMap address from tags
 */
export function formatAddress(tags) {
  if (!tags) return null
  
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'],
    tags['addr:state'],
    tags['addr:postcode'],
    tags['addr:country']
  ].filter(Boolean)
  
  if (parts.length > 0) return parts.join(', ')
  
  return tags['addr:full'] || tags.description || null
}

/**
 * Extract amenities from OSM tags
 */
export function extractAmenities(tags) {
  if (!tags) return []
  
  const amenities = []
  const amenityMap = {
    'toilets': 'Toilet',
    'shop': 'Shop',
    'atm': 'ATM',
    'car_wash': 'Car Wash',
    'compressed_air': 'Air Pump',
    'wifi': 'WiFi',
    'restaurant': 'Restaurant',
    'fast_food': 'Fast Food',
    'cafe': 'Cafe',
    'generator': 'Generator',
    'security': 'Security',
    'parking': 'Parking',
    'wheelchair': 'Wheelchair Access'
  }
  
  for (const [key, value] of Object.entries(amenityMap)) {
    if (tags[key] === 'yes') amenities.push(value)
  }
  
  return amenities
}

/**
 * Extract fuel types from OSM tags
 */
export function extractFuelTypes(tags) {
  if (!tags) return ['Petrol', 'Diesel']
  
  const fuels = []
  const fuelMap = {
    'fuel:diesel': 'Diesel',
    'fuel:biodiesel': 'Biodiesel',
    'fuel:octane_91': 'Regular 91',
    'fuel:octane_95': 'Premium 95',
    'fuel:octane_98': 'Premium 98',
    'fuel:e10': 'E10',
    'fuel:e85': 'E85',
    'fuel:lpg': 'LPG',
    'fuel:cng': 'CNG',
    'fuel:electricity': 'Electric Charging'
  }
  
  for (const [key, value] of Object.entries(fuelMap)) {
    if (tags[key] === 'yes') fuels.push(value)
  }
  
  if (fuels.length === 0) {
    fuels.push('Petrol', 'Diesel')
  }
  
  return fuels
}

/**
 * Extract payment methods from OSM tags
 */
export function extractPaymentMethods(tags) {
  if (!tags) return ['Cash']
  
  const methods = ['Cash']
  
  if (tags['payment:cards'] === 'yes' || tags['payment:credit_cards'] === 'yes') {
    methods.push('Card')
  }
  if (tags['payment:contactless'] === 'yes') {
    methods.push('Contactless')
  }
  
  return methods
}

/**
 * Determine country from coordinates
 */
export function getCountryFromCoordinates(lat, lng) {
  if (!lat || !lng) return null
  
  const boundaries = {
    NG: { lat: [4, 14], lng: [2, 15] },
    GH: { lat: [5, 11], lng: [-4, 2] },
    KE: { lat: [-5, 5], lng: [34, 42] },
    ZA: { lat: [-35, -22], lng: [16, 33] },
    EG: { lat: [22, 32], lng: [25, 37] },
    US: { lat: [24, 50], lng: [-125, -66] },
    CA: { lat: [42, 84], lng: [-141, -52] },
    MX: { lat: [15, 33], lng: [-118, -86] },
    BR: { lat: [-34, 6], lng: [-74, -34] },
    AR: { lat: [-55, -22], lng: [-74, -53] },
    GB: { lat: [50, 59], lng: [-8, 2] },
    DE: { lat: [47, 55], lng: [5, 16] },
    FR: { lat: [42, 52], lng: [-5, 9] },
    IT: { lat: [36, 47], lng: [6, 19] },
    ES: { lat: [36, 44], lng: [-10, 4] },
    IN: { lat: [8, 38], lng: [68, 98] },
    JP: { lat: [30, 46], lng: [128, 146] },
    AE: { lat: [22, 26.5], lng: [51, 56.5] },
    SA: { lat: [16, 33], lng: [34, 56] },
    CN: { lat: [18, 54], lng: [73, 135] },
    AU: { lat: [-44, -10], lng: [112, 154] },
    NZ: { lat: [-47, -34], lng: [166, 179] }
  }
  
  for (const [code, bounds] of Object.entries(boundaries)) {
    if (lat >= bounds.lat[0] && lat <= bounds.lat[1] &&
        lng >= bounds.lng[0] && lng <= bounds.lng[1]) {
      return code
    }
  }
  
  return null
}

/**
 * Generate unique ID
 */
export function generateId(prefix = '') {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Parse boolean from string
 */
export function parseBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1'
  }
  return false
}

/**
 * Sleep/delay helper
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry with exponential backoff (limited for serverless)
 */
export async function retryWithBackoff(fn, maxRetries = 2, baseDelay = 500) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await sleep(baseDelay * Math.pow(2, i))
    }
  }
}