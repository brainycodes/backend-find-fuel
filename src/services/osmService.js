// backend/src/services/osmService.js

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
    this.mirrors = config.apis.openstreetmapMirrors || [config.apis.openstreetmap]
    this.userAgent = 'FindFuelSpot/1.0'
  }

  // ============================================================
  // GET NEARBY STATIONS
  // ============================================================

  async getNearbyStations(lat, lng, radiusKm = 20) {
    const latitude = Number(lat)
    const longitude = Number(lng)
    const radius = Number(radiusKm)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error('Valid coordinates required')
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error('Coordinates are outside valid ranges')
    }

    const radiusMeters = Math.min(Math.max(radius * 1000, 1000), 100000)
    const cacheKey = `osm_${latitude.toFixed(4)}_${longitude.toFixed(4)}_${radiusMeters}`

    const cached = cacheService.get(cacheKey)
    if (cached) {
      return cached
    }

    const query = this.buildOverpassQuery(latitude, longitude, radiusMeters)

    for (const mirror of this.mirrors) {
      try {
        const response = await axios.post(
          mirror,
          `data=${encodeURIComponent(query)}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': this.userAgent,
              Accept: 'application/json'
            },
            timeout: 20000
          }
        )

        const elements = response.data?.elements

        if (!Array.isArray(elements)) {
          continue
        }

        const stations = await this.processStations(elements, latitude, longitude)

        if (stations.length > 0) {
          cacheService.set(cacheKey, stations, 300)
          return stations
        }

        cacheService.set(cacheKey, [], 120)
        return []
      } catch (error) {
        console.error(`Overpass failed ${mirror}:`, error.message)
      }
    }

    return []
  }

  // ============================================================
  // OVERPASS QUERY - Include address tags and nearby streets
  // ============================================================

  buildOverpassQuery(lat, lng, radiusMeters) {
    return `
      [out:json][timeout:25];
      (
        node["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
        way["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
        relation["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
      );
      out body center;
      
      // Get nearby streets for addresses
      way["highway"~"^(residential|primary|secondary|tertiary|service|unclassified)$"](around:50,${lat},${lng});
      out tags center 100;
    `
  }

  // ============================================================
  // PROCESS STATIONS
  // ============================================================

  async processStations(elements, userLat, userLng) {
    if (!Array.isArray(elements)) {
      return []
    }

    // Separate stations from streets
    const stationElements = elements.filter(el => 
      el.tags?.amenity === 'fuel' || 
      el.type === 'relation'
    )
    
    const streetElements = elements.filter(el => 
      el.tags?.highway && el.tags?.name
    )

    // Create street lookup map
    const streets = new Map()
    streetElements.forEach(street => {
      if (street.tags?.name) {
        streets.set(street.id, street.tags.name)
      }
    })

    const stations = stationElements
      .map(element => {
        const stationLat = Number(element.lat ?? element.center?.lat)
        const stationLng = Number(element.lon ?? element.center?.lon)

        if (!Number.isFinite(stationLat) || !Number.isFinite(stationLng)) {
          return null
        }

        const tags = element.tags || {}

        // Build address from OSM tags
        const address = this.buildAddressFromTags(tags, element, streets)

        return {
          id: `osm_${element.type}_${element.id}`,
          osm_id: element.id,
          osm_type: element.type,
          name: tags.name || tags.brand || tags.operator || 'Fuel Station',
          brand: tags.brand || null,
          operator: tags.operator || null,
          address: address || null,
          coordinates: {
            lat: stationLat,
            lng: stationLng
          },
          distance_km: calculateDistance(userLat, userLng, stationLat, stationLng),
          phone: tags.phone || tags['contact:phone'] || null,
          website: tags.website || tags['contact:website'] || null,
          opening_hours: tags.opening_hours || null,
          amenities: extractAmenities(tags),
          fuel_types: extractFuelTypes(tags),
          payment_methods: extractPaymentMethods(tags),
          fuel_prices: [],
          fuel_price_source: null,
          fuel_price_status: 'not_available',
          source: 'openstreetmap',
          source_url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
          last_updated: new Date().toISOString(),
          data_quality: address ? 'good' : 'basic'
        }
      })
      .filter(Boolean)

    stations.sort((a, b) => a.distance_km - b.distance_km)

    return stations
  }

  // ============================================================
  // BUILD ADDRESS FROM OSM TAGS
  // ============================================================

  buildAddressFromTags(tags, element, streets) {
    if (!tags) {
      return null
    }

    const parts = []

    // House number
    if (tags['addr:housenumber']) {
      parts.push(tags['addr:housenumber'])
    }

    // Street name
    const streetName = 
      tags['addr:street'] || 
      tags['addr:road'] ||
      tags['addr:place'] ||
      tags['addr:full']
    
    if (streetName) {
      parts.push(streetName)
    } else if (element.type === 'way' && tags.name) {
      // If the way itself is named, use that as street
      parts.push(tags.name)
    }

    // Suburb/Neighborhood
    if (tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:quarter']) {
      parts.push(tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:quarter'])
    }

    // City/Town
    if (tags['addr:city'] || tags['addr:town'] || tags['addr:municipality'] || tags['addr:village']) {
      parts.push(tags['addr:city'] || tags['addr:town'] || tags['addr:municipality'] || tags['addr:village'])
    }

    // State/Province
    if (tags['addr:state'] || tags['addr:province'] || tags['addr:region']) {
      parts.push(tags['addr:state'] || tags['addr:province'] || tags['addr:region'])
    }

    // Postcode
    if (tags['addr:postcode']) {
      parts.push(tags['addr:postcode'])
    }

    // If we have structured address parts, return them
    if (parts.length > 0) {
      return parts.join(', ')
    }

    // Try addr:full
    if (typeof tags['addr:full'] === 'string' && tags['addr:full'].trim()) {
      return tags['addr:full'].trim()
    }

    // Try to construct from brand/operator and nearby landmarks
    const fallbackParts = []
    
    if (tags.brand) {
      fallbackParts.push(tags.brand)
    }
    
    if (tags.operator && tags.operator !== tags.brand) {
      fallbackParts.push(tags.operator)
    }

    // If station is on a named way, use that
    if (element.type === 'way' && tags.name) {
      fallbackParts.push(tags.name)
    }

    if (fallbackParts.length > 0) {
      return fallbackParts.join(', ')
    }

    return null
  }

  // ============================================================
  // SEARCH STATIONS
  // ============================================================

  async searchStations(query, countryCode = null) {
    if (typeof query !== 'string' || query.trim().length < 2) {
      return []
    }

    try {
      const params = new URLSearchParams({
        q: `${query.trim()} fuel station`,
        format: 'jsonv2',
        limit: '10',
        addressdetails: '1',
        dedupe: '1'
      })

      if (countryCode) {
        params.append('countrycodes', countryCode.toLowerCase())
      }

      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'application/json',
            'Accept-Language': 'en'
          },
          timeout: 10000
        }
      )

      if (!Array.isArray(response.data)) {
        return []
      }

      return response.data
        .map(item => {
          const latitude = Number(item.lat)
          const longitude = Number(item.lon)

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null
          }

          const address = this.getNominatimAddress(item)

          return {
            id: `search_${item.place_id}`,
            place_id: item.place_id,
            name: item.name || item.display_name?.split(',')[0] || 'Fuel Station',
            address,
            coordinates: {
              lat: latitude,
              lng: longitude
            },
            type: item.type || null,
            category: item.category || null,
            osm_type: item.osm_type || null,
            osm_id: item.osm_id || null,
            source: 'nominatim',
            source_url: item.osm_type && item.osm_id
              ? `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`
              : null
          }
        })
        .filter(Boolean)
    } catch (error) {
      console.error('Nominatim station search failed:', error.message)
      return []
    }
  }

  // ============================================================
  // NOMINATIM ADDRESS
  // ============================================================

  getNominatimAddress(item) {
    if (!item) {
      return null
    }

    const address = item.address

    if (!address) {
      if (item.display_name) {
        return item.display_name
      }
      return null
    }

    const parts = [
      address.house_number,
      address.road || address.street || address.pedestrian,
      address.neighbourhood || address.suburb || address.quarter,
      address.city || address.town || address.municipality || address.village,
      address.state,
      address.postcode
    ].filter(Boolean)

    if (parts.length > 0) {
      return parts.join(', ')
    }

    if (item.display_name) {
      return item.display_name
    }

    return null
  }
}

export const osmService = new OSMService()