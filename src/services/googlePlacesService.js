import axios from 'axios'
import { cacheService } from '../utils/cache.js'

export class GooglePlacesService {
  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place'
  }

  async getNearbyStations(lat, lng, radiusKm = 20) {
    const cacheKey = `google_stations_${lat.toFixed(4)}_${lng.toFixed(4)}_${radiusKm}`
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    if (!this.apiKey) {
      console.warn('Google Places API key not configured')
      return []
    }

    try {
      const response = await axios.get(`${this.baseUrl}/nearbysearch/json`, {
        params: {
          location: `${lat},${lng}`,
          radius: radiusKm * 1000,
          type: 'gas_station',
          key: this.apiKey
        },
        timeout: 10000
      })

      const stations = response.data.results.map(place => ({
        id: `google_${place.place_id}`,
        place_id: place.place_id,
        name: place.name,
        address: place.vicinity,
        coordinates: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        rating: place.rating || null,
        total_ratings: place.user_ratings_total || 0,
        open_now: place.opening_hours?.open_now ?? null,
        source: 'google_places'
      }))

      cacheService.set(cacheKey, stations, 900)
      return stations
    } catch (error) {
      console.error('Google Places error:', error.message)
      return []
    }
  }
}

export const googlePlacesService = new GooglePlacesService()