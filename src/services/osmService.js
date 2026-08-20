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
          timeout: 8000
        }
      )

      const stations = await this.processStations(response.data.elements, lat, lng)
      
      if (stations.length > 0) {
        cacheService.set(cacheKey, stations, 300)
        return stations
      }
    } catch (error) {
      console.error('OSM fetch error, using fallback:', error.message)
    }

    return this.getFallbackStations(lat, lng, radiusKm)
  }

  getFallbackStations(lat, lng, radiusKm) {
    const stations = [
      {
        id: 'station_fallback_1', osm_id: 9001,
        name: 'NNPC Mega Station', brand: 'NNPC',
        address: 'Central Business District, Abuja',
        coordinates: { lat: lat + 0.01, lng: lng + 0.01 },
        distance_km: 1.5,
        phone: '+234 800 000 0001',
        opening_hours: '24/7',
        amenities: ['Toilet', 'Shop', 'ATM', 'Car Wash'],
        fuel_types: ['Petrol (PMS)', 'Diesel (AGO)'],
        payment_methods: ['Cash', 'POS/Card', 'Bank Transfer'],
        source: 'fallback', data_quality: 'good'
      },
      {
        id: 'station_fallback_2', osm_id: 9002,
        name: 'TotalEnergies Service Station', brand: 'TotalEnergies',
        address: 'Wuse Zone 2, Abuja',
        coordinates: { lat: lat - 0.01, lng: lng + 0.02 },
        distance_km: 2.8,
        phone: '+234 800 000 0002',
        opening_hours: '24/7',
        amenities: ['Toilet', 'Shop', 'ATM'],
        fuel_types: ['Petrol (PMS)', 'Diesel (AGO)'],
        payment_methods: ['Cash', 'POS/Card'],
        source: 'fallback', data_quality: 'good'
      },
      {
        id: 'station_fallback_3', osm_id: 9003,
        name: 'Oando Filling Station', brand: 'Oando',
        address: 'Maitama, Abuja',
        coordinates: { lat: lat + 0.02, lng: lng - 0.01 },
        distance_km: 3.2,
        phone: '+234 800 000 0003',
        opening_hours: '06:00 - 22:00',
        amenities: ['Toilet', 'Shop'],
        fuel_types: ['Petrol (PMS)', 'Diesel (AGO)'],
        payment_methods: ['Cash', 'POS/Card'],
        source: 'fallback', data_quality: 'basic'
      },
      {
        id: 'station_fallback_4', osm_id: 9004,
        name: 'Mobil Service Station', brand: 'Mobil',
        address: 'Garki, Abuja',
        coordinates: { lat: lat - 0.02, lng: lng - 0.01 },
        distance_km: 4.1,
        phone: '+234 800 000 0004',
        opening_hours: '24/7',
        amenities: ['Toilet', 'Shop', 'ATM', 'Car Wash'],
        fuel_types: ['Petrol (PMS)', 'Diesel (AGO)'],
        payment_methods: ['Cash', 'POS/Card'],
        source: 'fallback', data_quality: 'excellent'
      },
      {
        id: 'station_fallback_5', osm_id: 9005,
        name: 'Conoil Station', brand: 'Conoil',
        address: 'Wuse, Abuja',
        coordinates: { lat: lat + 0.015, lng: lng - 0.02 },
        distance_km: 5.0,
        phone: '+234 800 000 0005',
        opening_hours: '24/7',
        amenities: ['Toilet', 'Shop'],
        fuel_types: ['Petrol (PMS)', 'Diesel (AGO)'],
        payment_methods: ['Cash'],
        source: 'fallback', data_quality: 'basic'
      }
    ]
    return stations.filter(s => s.distance_km <= radiusKm)
  }

  buildOverpassQuery(lat, lng, radiusMeters) {
    return `
      [out:json][timeout:7];
      (
        node["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
        way["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
      );
      out body center 15;
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

    // Reverse geocode stations with null addresses (first 10 only for serverless)
    const needAddress = stations.filter(s => !s.address).slice(0, 10)
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
        limit: 10,
        addressdetails: 1
      })
      if (countryCode) params.append('countrycodes', countryCode.toLowerCase())

      const response = await axios.get(
        `${this.nominatimUrl}/search?${params.toString()}`,
        { headers: { 'User-Agent': 'FuelFinder/1.0', 'Accept-Language': 'en' }, timeout: 5000 }
      )

      const results = response.data.map(item => ({
        id: `search_${item.place_id}`,
        osm_id: item.osm_id,
        name: item.display_name?.split(',')[0] || 'Unknown',
        address: item.display_name,
        coordinates: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
        type: item.type,
        importance: item.importance
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
        { params: { lat, lon: lng, format: 'json', addressdetails: 1 }, headers: { 'User-Agent': 'FuelFinder/1.0' }, timeout: 5000 }
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