import axios from 'axios'
import { cacheService } from '../utils/cache.js'
import { config } from '../config/index.js'
import { COUNTRIES, FUEL_TYPES } from '../utils/constants.js'

export class PriceService {
  constructor() {
    this.eiaBaseUrl = config.apis.eia
  }

  getSymbol(currency) {
    const symbols = {
      USD: '$', NGN: '₦', EUR: '€', GBP: '£', ARS: 'AR$',
      INR: '₹', JPY: '¥', AUD: 'A$', CAD: 'C$', ZAR: 'R',
      KES: 'KSh', GHS: '₵', EGP: 'E£', AED: 'د.إ', SAR: '﷼',
      CNY: '¥', MXN: 'Mex$', BRL: 'R$', NZD: 'NZ$'
    }
    return symbols[currency] || '$'
  }

  async getOfficialPrices(countryCode) {
    const cacheKey = `official_prices_${countryCode}`
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    let prices = null

    try {
      switch (countryCode.toUpperCase()) {
        case 'US': prices = await this.getUSPrices(); break
        case 'NG': prices = this.getNigerianPrices(); break
        case 'GB': prices = this.getUKPrices(); break
        case 'IN': prices = this.getIndianPrices(); break
        case 'KE': prices = this.getKenyanPrices(); break
        case 'ZA': prices = this.getSouthAfricanPrices(); break
        default: prices = this.getEstimatedPrices(countryCode)
      }

      if (!prices || Object.keys(prices).length === 0) {
        prices = this.getEstimatedPrices(countryCode)
      }

      if (prices && Object.keys(prices).length > 0) {
        cacheService.set(cacheKey, prices, 600)
      }

      return prices || {}
    } catch (error) {
      console.error(`Price fetch error for ${countryCode}:`, error.message)
      return this.getEstimatedPrices(countryCode) || {}
    }
  }

  async getUSPrices() {
    if (config.eiaApiKey) {
      try {
        const response = await axios.get(`${this.eiaBaseUrl}/petroleum/pri/gnd/data/`, {
          params: {
            api_key: config.eiaApiKey,
            frequency: 'weekly',
            'data[0]': 'value',
            'facets[product][]': ['EPMR', 'EPMP', 'EPMD'],
            'sort[0][column]': 'period',
            'sort[0][direction]': 'desc',
            length: 5
          },
          timeout: 5000
        })

        const prices = {}
        const productNames = { EPMR: 'Regular', EPMP: 'Premium', EPMD: 'Diesel' }

        if (response.data?.response?.data) {
          response.data.response.data.forEach(item => {
            const name = productNames[item.product] || item.product
            if (!prices[name]) {
              prices[name] = {
                price: parseFloat(item.value),
                unit: 'gallon',
                currency: 'USD',
                symbol: '$',
                date: item.period,
                source: 'U.S. EIA'
              }
            }
          })
        }
        if (Object.keys(prices).length > 0) return prices
      } catch (e) {
        console.error('EIA error:', e.message)
      }
    }
    return this.getEstimatedPrices('US')
  }

  getNigerianPrices() {
    return {
      'Petrol (PMS)': {
        price: 568, unit: 'litre', currency: 'NGN', symbol: '₦',
        date: '2026-08-20',
        source: 'NMDPRA - Nigerian Government',
        note: 'Official pump price. May vary by location.'
      },
      'Diesel (AGO)': {
        price: 850, unit: 'litre', currency: 'NGN', symbol: '₦',
        date: '2026-08-20',
        source: 'NMDPRA - Nigerian Government',
        note: 'Deregulated price. Varies by marketer.'
      },
      'Kerosene (DPK)': {
        price: 750, unit: 'litre', currency: 'NGN', symbol: '₦',
        date: '2026-08-20',
        source: 'NMDPRA - Nigerian Government',
        note: 'Household kerosene price.'
      },
      'Cooking Gas (LPG)': {
        price: 1000, unit: 'kg', currency: 'NGN', symbol: '₦',
        date: '2026-08-20',
        source: 'NMDPRA - Nigerian Government',
        note: '12.5kg cylinder refill ~₦12,500'
      }
    }
  }

  getUKPrices() {
    return {
      'Unleaded': { price: 1.45, unit: 'litre', currency: 'GBP', symbol: '£', source: 'UK Government' },
      'Diesel': { price: 1.52, unit: 'litre', currency: 'GBP', symbol: '£', source: 'UK Government' }
    }
  }

  getIndianPrices() {
    return {
      'Petrol': { price: 96.72, unit: 'litre', currency: 'INR', symbol: '₹', source: 'PPAC India', note: 'Delhi price.' },
      'Diesel': { price: 89.62, unit: 'litre', currency: 'INR', symbol: '₹', source: 'PPAC India', note: 'Delhi price.' }
    }
  }

  getKenyanPrices() {
    return {
      'Super Petrol': { price: 195, unit: 'litre', currency: 'KES', symbol: 'KSh', source: 'EPRA Kenya' },
      'Diesel': { price: 180, unit: 'litre', currency: 'KES', symbol: 'KSh', source: 'EPRA Kenya' },
      'Kerosene': { price: 170, unit: 'litre', currency: 'KES', symbol: 'KSh', source: 'EPRA Kenya' }
    }
  }

  getSouthAfricanPrices() {
    return {
      'Petrol 93': { price: 23.50, unit: 'litre', currency: 'ZAR', symbol: 'R', source: 'Department of Energy SA' },
      'Petrol 95': { price: 24.00, unit: 'litre', currency: 'ZAR', symbol: 'R', source: 'Department of Energy SA' },
      'Diesel': { price: 22.00, unit: 'litre', currency: 'ZAR', symbol: 'R', source: 'Department of Energy SA' }
    }
  }

  getEstimatedPrices(countryCode) {
    const country = COUNTRIES[countryCode]
    return {
      'Petrol': {
        price: 1.50,
        unit: 'litre',
        currency: country?.currency || 'USD',
        symbol: country?.symbol || '$',
        source: 'Estimated',
        note: 'Estimated. Check station for exact price.'
      },
      'Diesel': {
        price: 1.30,
        unit: 'litre',
        currency: country?.currency || 'USD',
        symbol: country?.symbol || '$',
        source: 'Estimated',
        note: 'Estimated. Check station for exact price.'
      }
    }
  }

  async getAllPrices() {
    const countries = Object.keys(COUNTRIES)
    const pricePromises = countries.map(code => this.getOfficialPrices(code))
    const results = await Promise.allSettled(pricePromises)
    const allPrices = {}
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        allPrices[countries[index]] = result.value
      }
    })
    return allPrices
  }
}

export const priceService = new PriceService()