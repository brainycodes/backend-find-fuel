import axios from 'axios'
import { cacheService } from '../utils/cache.js'
import { config } from '../config/index.js'
import {
  calculateDistance,
  formatAddress,
  extractAmenities,
  extractFuelTypes,
  extractPaymentMethods
} from '../utils/helpers.js'

export class OSMService {
  constructor() {
    this.baseUrl = config.apis.openstreetmap
    this.nominatimUrl = config.apis.nominatim
  }

  async getNearbyStations(lat, lng, radiusKm = 20) {
    const cacheKey = `osm_stations_${lat}_${lng}_${radiusKm}`
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    try {
      const radiusMeters = radiusKm * 1000
      const query = this.buildOverpassQuery(lat, lng, radiusMeters)
      
      const response = await axios.post(
        this.baseUrl,
        `data=${encodeURIComponent(query)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'FuelFinder/1.0'
          },
          timeout: 30000
        }
      )

      const stations = await this.processStations(response.data.elements, lat, lng)
      cacheService.set(cacheKey, stations, 900)
      
      return stations
    } catch (error) {
      console.error('OSM fetch error:', error.message)
      throw new Error(`Failed to fetch stations: ${error.message}`)
    }
  }

  buildOverpassQuery(lat, lng, radiusMeters) {
    return `
      [out:json][timeout:25];
      (
        node["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
        way["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
        relation["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
      );
      out body center;
      >;
      out skel qt;
    `
  }

  async getAddressFromCoordinates(lat, lng) {
    const cacheKey = `addr_${lat.toFixed(5)}_${lng.toFixed(5)}`
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    try {
      const response = await axios.get(
        `${this.nominatimUrl}/reverse`,
        {
          params: { lat, lon: lng, format: 'json', addressdetails: 1, zoom: 18 },
          headers: { 'User-Agent': 'FuelFinder/1.0', 'Accept-Language': 'en' },
          timeout: 5000
        }
      )

      if (response.data?.address) {
        const addr = response.data.address
        const parts = [
          addr.road || addr.street || addr.pedestrian,
          addr.suburb || addr.neighbourhood || addr.district || addr.quarter,
          addr.city || addr.town || addr.state || addr.county
        ].filter(Boolean)
        
        const shortAddress = parts.length > 0 ? parts.join(', ') : response.data.display_name
        cacheService.set(cacheKey, shortAddress, 86400)
        return shortAddress
      }
    } catch (error) {
      // Silently fail
    }
    return null
  }

  async processStations(elements, userLat, userLng) {
    if (!elements || !Array.isArray(elements)) return []

    const stations = elements
      .filter(el => el.tags?.amenity === 'fuel')
      .map(el => {
        const stationLat = el.lat || el.center?.lat
        const stationLng = el.lon || el.center?.lon
        
        if (!stationLat || !stationLng) return null

        const distance = calculateDistance(userLat, userLng, stationLat, stationLng)
        const tags = el.tags || {}

        return {
          id: `station_${el.id}`,
          osm_id: el.id,
          osm_type: el.type,
          name: tags.name || tags.brand || 'Fuel Station',
          brand: tags.brand || tags.operator || null,
          operator: tags.operator || null,
          address: formatAddress(tags) || null,
          coordinates: { lat: stationLat, lng: stationLng },
          distance_km: distance,
          phone: tags.phone || null,
          website: tags.website || null,
          email: tags.email || null,
          opening_hours: tags.opening_hours || 'Not specified',
          amenities: extractAmenities(tags),
          fuel_types: extractFuelTypes(tags),
          payment_methods: extractPaymentMethods(tags),
          wheelchair_accessible: tags.wheelchair === 'yes',
          has_car_wash: tags.car_wash === 'yes',
          has_shop: tags.shop === 'yes' || tags.shop === 'convenience',
          is_24_hours: tags.opening_hours === '24/7',
          source: 'openstreetmap',
          last_updated: el.timestamp || new Date().toISOString(),
          data_quality: this.assessDataQuality(tags)
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.distance_km - b.distance_km)

    // Reverse geocode stations with null addresses (first 15 only)
    const needAddress = stations.filter(s => !s.address).slice(0, 15)
    if (needAddress.length > 0) {
      await Promise.allSettled(
        needAddress.map(async (station) => {
          const addr = await this.getAddressFromCoordinates(
            station.coordinates.lat,
            station.coordinates.lng
          )
          if (addr) {
            station.address = addr
            if (station.data_quality === 'minimal') station.data_quality = 'basic'
          }
        })
      )
    }

    return stations
  }

  assessDataQuality(tags) {
    let score = 0
    const fields = ['name', 'brand', 'operator', 'phone', 'website', 'opening_hours']
    fields.forEach(field => { if (tags[field]) score++ })
    if (score >= 5) return 'excellent'
    if (score >= 3) return 'good'
    if (score >= 1) return 'basic'
    return 'minimal'
  }

  async searchStations(query, countryCode = null) {
    const cacheKey = `osm_search_${query}_${countryCode}`
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    try {
      const params = new URLSearchParams({
        q: `${query} fuel station`,
        format: 'json',
        limit: 20,
        addressdetails: 1
      })
      if (countryCode) params.append('countrycodes', countryCode.toLowerCase())

      const response = await axios.get(
        `${this.nominatimUrl}/search?${params.toString()}`,
        { headers: { 'User-Agent': 'FuelFinder/1.0', 'Accept-Language': 'en' }, timeout: 10000 }
      )

      const results = response.data.map(item => ({
        id: `search_${item.place_id}`,
        osm_id: item.osm_id,
        name: item.display_name?.split(',')[0] || 'Unknown',
        address: item.display_name,
        coordinates: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
        type: item.type,
        category: item.category,
        importance: item.importance,
        boundingbox: item.boundingbox?.map(Number)
      }))

      cacheService.set(cacheKey, results, 3600)
      return results
    } catch (error) {
      console.error('OSM search error:', error.message)
      return []
    }
  }

  async reverseGeocode(lat, lng) {
    const cacheKey = `osm_reverse_${lat}_${lng}`
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    try {
      const response = await axios.get(
        `${this.nominatimUrl}/reverse`,
        { params: { lat, lon: lng, format: 'json', addressdetails: 1 }, headers: { 'User-Agent': 'FuelFinder/1.0' }, timeout: 10000 }
      )
      cacheService.set(cacheKey, response.data, 86400)
      return response.data
    } catch (error) {
      console.error('Reverse geocode error:', error.message)
      return null
    }
  }
}

export const osmService = new OSMService()