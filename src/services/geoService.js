import axios from 'axios'
import { cacheService } from '../utils/cache.js'
import { config } from '../config/index.js'
import { getCountryFromCoordinates } from '../utils/helpers.js'

export class GeoService {
  async getLocationFromIP(ip) {
    const cacheKey = `ip_location_${ip}`
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    if (this.isPrivateIP(ip)) {
      return this.getDefaultLocation()
    }

    try {
      const response = await axios.get(`${config.apis.ipapi}/${ip}/json/`, {
        timeout: 5000
      })

      if (response.data && !response.data.error) {
        const location = {
          ip: response.data.ip,
          country_code: response.data.country_code,
          country_name: response.data.country_name,
          city: response.data.city,
          region: response.data.region,
          region_code: response.data.region_code,
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          postal: response.data.postal,
          currency: response.data.currency,
          currency_name: response.data.currency_name,
          languages: response.data.languages,
          timezone: response.data.timezone,
          utc_offset: response.data.utc_offset,
          is_eu: response.data.is_eu === true
        }

        cacheService.set(cacheKey, location, 600)
        return location
      }
    } catch (error) {
      console.error('IP geolocation error:', error.message)
    }

    return this.getDefaultLocation()
  }

  async detectCountry(req) {
    const clientIP = this.getClientIP(req)
    const ipLocation = await this.getLocationFromIP(clientIP)
    
    if (ipLocation?.country_code) {
      return ipLocation
    }

    const { lat, lng } = req.query || {}
    if (lat && lng) {
      const countryCode = getCountryFromCoordinates(
        parseFloat(lat),
        parseFloat(lng)
      )
      if (countryCode) {
        return { country_code: countryCode }
      }
    }

    const acceptLang = req.headers['accept-language']
    if (acceptLang) {
      const countryCode = this.extractCountryFromLanguage(acceptLang)
      if (countryCode) {
        return { country_code: countryCode }
      }
    }

    return { country_code: 'US', country_name: 'United States' }
  }

  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.ip ||
           req.connection?.remoteAddress ||
           '8.8.8.8'
  }

  isPrivateIP(ip) {
    if (!ip) return true
    
    const parts = ip.split('.').map(Number)
    
    return (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1'
    )
  }

  extractCountryFromLanguage(acceptLanguage) {
    const langToCountry = {
      'en-US': 'US', 'en-GB': 'GB', 'en-CA': 'CA', 'en-AU': 'AU',
      'en-NG': 'NG', 'en-KE': 'KE', 'en-ZA': 'ZA', 'en-IN': 'IN',
      'fr-FR': 'FR', 'fr-CA': 'CA',
      'de-DE': 'DE', 'de-AT': 'DE',
      'es-ES': 'ES', 'es-MX': 'MX', 'es-AR': 'AR',
      'pt-BR': 'BR', 'pt-PT': 'BR',
      'it-IT': 'IT',
      'ja-JP': 'JP',
      'zh-CN': 'CN',
      'ar-SA': 'SA', 'ar-AE': 'AE', 'ar-EG': 'EG',
      'hi-IN': 'IN',
      'sw-KE': 'KE',
      'ha-NG': 'NG', 'yo-NG': 'NG', 'ig-NG': 'NG',
      'af-ZA': 'ZA', 'zu-ZA': 'ZA'
    }

    const languages = acceptLanguage.split(',')
    for (const lang of languages) {
      const code = langToCountry[lang.trim()]
      if (code) return code
    }

    return null
  }

  getDefaultLocation() {
    return {
      country_code: 'US',
      country_name: 'United States',
      city: 'New York',
      region: 'New York',
      latitude: 40.7128,
      longitude: -74.0060,
      currency: 'USD',
      timezone: 'America/New_York'
    }
  }

  isValidCoordinates(lat, lng) {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180
    )
  }
}

export const geoService = new GeoService()