// backend/src/services/geoService.js

import axios from 'axios'
import { cacheService } from '../utils/cache.js'
import { config } from '../config/index.js'

export class GeoService {
  constructor() {
    this.userAgent = 'FindFuelSpot/1.0'

    this.providers = [
      {
        name: 'ipapi.co',

        getUrl: (ip) =>
          `https://ipapi.co/${encodeURIComponent(ip)}/json/`,

        parse: (data) => {
          if (!data || data.error || !data.country_code) {
            return null
          }

          return {
            country_code: data.country_code.toUpperCase(),
            country_name: data.country_name || null,
            city: data.city || null,
            region: data.region || null,
            region_code: data.region_code || null,
            latitude: this.numberOrNull(data.latitude),
            longitude: this.numberOrNull(data.longitude),
            currency: data.currency || null,
            timezone: data.timezone || null,
            source: 'ipapi'
          }
        }
      },

      {
        name: 'ipwho.is',

        getUrl: (ip) =>
          `https://ipwho.is/${encodeURIComponent(ip)}`,

        parse: (data) => {
          if (
            !data ||
            data.success === false ||
            !data.country_code
          ) {
            return null
          }

          return {
            country_code: data.country_code.toUpperCase(),
            country_name: data.country || null,
            city: data.city || null,
            region: data.region || null,
            region_code: data.region_code || null,
            latitude: this.numberOrNull(data.latitude),
            longitude: this.numberOrNull(data.longitude),
            currency: data.currency?.code || null,
            timezone: data.timezone?.id || null,
            source: 'ipwhois'
          }
        }
      },

      {
        name: 'freeipapi',

        getUrl: (ip) =>
          `https://freeipapi.com/api/json/${encodeURIComponent(ip)}`,

        parse: (data) => {
          if (!data || !data.countryCode) {
            return null
          }

          return {
            country_code: data.countryCode.toUpperCase(),
            country_name: data.countryName || null,
            city: data.cityName || null,
            region: data.regionName || null,
            region_code: data.regionCode || null,
            latitude: this.numberOrNull(data.latitude),
            longitude: this.numberOrNull(data.longitude),
            currency: data.currency?.code || null,
            timezone: data.timeZone || null,
            source: 'freeipapi'
          }
        }
      }
    ]
  }

  // ============================================================
  // DETECT LOCATION
  // ============================================================

  async detectLocation(req) {
    const query = req.query || {}

    /*
     * IMPORTANT:
     *
     * Browser GPS has priority.
     *
     * Frontend should call:
     *
     * /api/v1/geolocation/detect
     * ?lat=9.05
     * &lng=7.49
     * &accuracy=25
     *
     * Never invent coordinates here.
     */

    const lat = this.numberOrNull(query.lat)
    const lng = this.numberOrNull(query.lng)
    const accuracy = this.numberOrNull(query.accuracy)

    if (this.validCoordinates(lat, lng)) {
      const reverse = await this.reverseGeocode(lat, lng)

      return {
        latitude: lat,
        longitude: lng,

        country_code:
          reverse?.country_code || null,

        country_name:
          reverse?.country_name || null,

        city:
          reverse?.city || null,

        town:
          reverse?.town || null,

        village:
          reverse?.village || null,

        municipality:
          reverse?.municipality || null,

        county:
          reverse?.county || null,

        state:
          reverse?.state || null,

        district:
          reverse?.district || null,

        neighbourhood:
          reverse?.neighbourhood || null,

        road:
          reverse?.road || null,

        postcode:
          reverse?.postcode || null,

        display_name:
          reverse?.display_name || null,

        display_location:
          reverse?.display_location || null,

        location_source: 'gps',

        accuracy: 'gps',

        accuracy_meters: accuracy,

        source:
          reverse?.source ||
          'browser_gps'
      }
    }

    /*
     * NO GPS COORDINATES.
     *
     * Now use IP as approximate fallback.
     */

    const ip = this.getClientIP(req)

    const ipLocation =
      await this.getLocationFromIP(ip)

    if (ipLocation) {
      return {
        ...ipLocation,

        location_source: 'ip',

        accuracy: 'approximate',

        accuracy_meters: null
      }
    }

    return null
  }

  // Existing code compatibility
  async detectCountry(req) {
    return this.detectLocation(req)
  }

  // ============================================================
  // IP GEOLOCATION
  // ============================================================

  async getLocationFromIP(ip) {
    if (!ip) {
      return null
    }

    let normalizedIP = this.normalizeIP(ip)

    /*
     * Localhost does NOT represent the user's IP.
     *
     * We can obtain the server's public IP, but remember:
     * this is server location, not user's GPS.
     */

    if (this.isPrivateIP(normalizedIP)) {
      try {
        const response = await axios.get(
          'https://api.ipify.org?format=json',
          {
            timeout: 5000,
            headers: {
              'User-Agent': this.userAgent,
              Accept: 'application/json'
            }
          }
        )

        const publicIP = response.data?.ip

        if (!publicIP) {
          return null
        }

        normalizedIP =
          this.normalizeIP(publicIP)

      } catch (error) {
        console.error(
          'Public IP lookup failed:',
          error.message
        )

        return null
      }
    }

    const cacheKey =
      `ip_location_${normalizedIP}`

    const cached =
      cacheService.get(cacheKey)

    if (cached) {
      return cached
    }

    for (const provider of this.providers) {
      try {
        const response =
          await axios.get(
            provider.getUrl(normalizedIP),
            {
              timeout: 6000,

              headers: {
                'User-Agent':
                  this.userAgent,

                Accept:
                  'application/json'
              }
            }
          )

        const location =
          provider.parse(response.data)

        if (
          location?.country_code &&
          this.validCoordinates(
            location.latitude,
            location.longitude
          )
        ) {
          location.location_source = 'ip'
          location.accuracy = 'approximate'
          location.accuracy_meters = null

          location.display_location =
            this.getBestLocationName(location)

          cacheService.set(
            cacheKey,
            location,
            900
          )

          return location
        }

      } catch (error) {
        console.error(
          `${provider.name} failed:`,
          error.message
        )
      }
    }

    return null
  }

  // ============================================================
  // REVERSE GEOCODING
  // ============================================================

  async reverseGeocode(lat, lng) {
    const latitude =
      this.numberOrNull(lat)

    const longitude =
      this.numberOrNull(lng)

    if (
      !this.validCoordinates(
        latitude,
        longitude
      )
    ) {
      return null
    }

    const cacheKey =
      `reverse_${latitude.toFixed(5)}_${longitude.toFixed(5)}`

    const cached =
      cacheService.get(cacheKey)

    if (cached) {
      return cached
    }

    const nominatimUrl =
      config.apis?.nominatim ||
      'https://nominatim.openstreetmap.org'

    try {
      const response =
        await axios.get(
          `${nominatimUrl}/reverse`,
          {
            params: {
              lat: latitude,
              lon: longitude,
              format: 'jsonv2',
              addressdetails: 1,
              zoom: 18
            },

            headers: {
              'User-Agent':
                this.userAgent,

              'Accept-Language':
                'en',

              Accept:
                'application/json'
            },

            timeout: 10000
          }
        )

      const data =
        response.data

      if (!data) {
        return null
      }

      const address =
        data.address || {}

      const location = {
        latitude,
        longitude,

        display_name:
          data.display_name || null,

        house_number:
          address.house_number || null,

        road:
          address.road ||
          address.street ||
          null,

        neighbourhood:
          address.neighbourhood ||
          address.suburb ||
          null,

        district:
          address.city_district ||
          address.district ||
          null,

        city:
          address.city || null,

        town:
          address.town || null,

        village:
          address.village || null,

        municipality:
          address.municipality || null,

        county:
          address.county || null,

        state:
          address.state || null,

        postcode:
          address.postcode || null,

        country:
          address.country || null,

        country_name:
          address.country || null,

        country_code:
          address.country_code
            ? address.country_code.toUpperCase()
            : null,

        source:
          'OpenStreetMap Nominatim',

        location_source:
          'gps',

        accuracy:
          'gps'
      }

      location.display_location =
        this.getBestLocationName(location)

      cacheService.set(
        cacheKey,
        location,
        86400
      )

      return location

    } catch (error) {
      console.error(
        'Reverse geocoding failed:',
        error.message
      )

      return null
    }
  }

  // ============================================================
  // LOCATION NAME
  // ============================================================

  getBestLocationName(location) {
    if (!location) {
      return null
    }

    const primary =
      location.city ||
      location.town ||
      location.municipality ||
      location.village ||
      location.county ||
      location.state ||
      location.country_name

    if (!primary) {
      return null
    }

    const parts = [primary]

    if (
      location.state &&
      location.state !== primary
    ) {
      parts.push(location.state)
    }

    if (
      location.country_name &&
      location.country_name !== primary
    ) {
      parts.push(location.country_name)
    }

    return [
      ...new Set(parts.filter(Boolean))
    ].join(', ')
  }

  // ============================================================
  // CLIENT IP
  // ============================================================

  getClientIP(req) {
    const forwarded =
      req.headers['x-forwarded-for']

    if (forwarded) {
      return forwarded
        .split(',')[0]
        .trim()
    }

    return (
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['true-client-ip'] ||
      req.ip ||
      req.socket?.remoteAddress ||
      ''
    )
  }

  // ============================================================
  // IP NORMALIZATION
  // ============================================================

  normalizeIP(ip) {
    if (!ip) {
      return ''
    }

    return String(ip)
      .trim()
      .replace(/^::ffff:/, '')
  }

  // ============================================================
  // PRIVATE IP
  // ============================================================

  isPrivateIP(ip) {
    const normalized =
      this.normalizeIP(ip)

    if (!normalized) {
      return false
    }

    if (
      normalized === 'localhost' ||
      normalized === '::1' ||
      normalized === '127.0.0.1'
    ) {
      return true
    }

    const parts =
      normalized
        .split('.')
        .map(Number)

    if (
      parts.length !== 4 ||
      parts.some(
        part => !Number.isFinite(part)
      )
    ) {
      return false
    }

    return (
      parts[0] === 10 ||

      (
        parts[0] === 172 &&
        parts[1] >= 16 &&
        parts[1] <= 31
      ) ||

      (
        parts[0] === 192 &&
        parts[1] === 168
      )
    )
  }

  // ============================================================
  // HELPERS
  // ============================================================

  numberOrNull(value) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null
    }

    const number =
      Number(value)

    return Number.isFinite(number)
      ? number
      : null
  }

  validCoordinates(lat, lng) {
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    )
  }
}

export const geoService =
  new GeoService()