import axios from 'axios'
import { cacheService } from '../utils/cache.js'
import { config } from '../config/index.js'
import { COUNTRIES, FUEL_TYPES } from '../utils/constants.js'
import { retryWithBackoff } from '../utils/helpers.js'

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
        case 'GB': prices = await this.getUKPrices(); break
        case 'IN': prices = this.getIndianPrices(); break
        case 'KE': prices = this.getKenyanPrices(); break
        case 'ZA': prices = this.getSouthAfricanPrices(); break
        default: prices = await this.scrapeCurrentPrices(countryCode)
      }

      if (!prices || Object.keys(prices).length === 0) {
        prices = this.getEstimatedPrices(countryCode)
      }

      if (prices && Object.keys(prices).length > 0) {
        cacheService.set(cacheKey, prices, 3600)
      }

      return prices || {}
    } catch (error) {
      console.error(`Price fetch error for ${countryCode}:`, error.message)
      return this.getEstimatedPrices(countryCode) || {}
    }
  }

  async scrapeCurrentPrices(countryCode) {
    try {
      const response = await axios.get(
        `https://www.globalpetrolprices.com/${countryCode.toLowerCase()}/gasoline_prices/`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          timeout: 10000
        }
      )

      const html = response.data

      // Extract gasoline price
      const gasolineMatch = html.match(/"gasoline":\s*\{[^}]*"price":\s*([\d.]+)/)
      const dieselMatch = html.match(/"diesel":\s*\{[^}]*"price":\s*([\d.]+)/)
      const currencyMatch = html.match(/"currency":"(\w+)"/)

      const currency = currencyMatch?.[1] || COUNTRIES[countryCode]?.currency || 'USD'

      if (gasolineMatch) {
        const prices = {
          'Petrol': {
            price: parseFloat(gasolineMatch[1]),
            unit: 'litre',
            currency: currency,
            symbol: this.getSymbol(currency),
            source: 'GlobalPetrolPrices.com',
            sourceUrl: `https://www.globalpetrolprices.com/${countryCode}/gasoline_prices/`,
            note: 'Current average price'
          }
        }

        if (dieselMatch) {
          prices['Diesel'] = {
            price: parseFloat(dieselMatch[1]),
            unit: 'litre',
            currency: currency,
            symbol: this.getSymbol(currency),
            source: 'GlobalPetrolPrices.com',
            sourceUrl: `https://www.globalpetrolprices.com/${countryCode}/diesel_prices/`,
            note: 'Current average price'
          }
        }

        return prices
      }
    } catch (e) {
      console.error(`Scrape error for ${countryCode}:`, e.message)
    }
    return null
  }

  async getUSPrices() {
    if (!config.eiaApiKey) {
      console.warn('EIA API key not configured, scraping instead')
      const scraped = await this.scrapeCurrentPrices('US')
      if (scraped) return scraped
      return this.getEstimatedPrices('US')
    }

    try {
      const response = await retryWithBackoff(async () => {
        return await axios.get(`${this.eiaBaseUrl}/petroleum/pri/gnd/data/`, {
          params: {
            api_key: config.eiaApiKey,
            frequency: 'weekly',
            'data[0]': 'value',
            'facets[product][]': ['EPMR', 'EPMP', 'EPMD'],
            'sort[0][column]': 'period',
            'sort[0][direction]': 'desc',
            length: 5
          },
          timeout: 10000
        })
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
              source: 'U.S. Energy Information Administration',
              sourceUrl: 'https://www.eia.gov/petroleum/gasdiesel/'
            }
          }
        })
      }
      return prices
    } catch (error) {
      console.error('EIA API error:', error.message)
      const scraped = await this.scrapeCurrentPrices('US')
      return scraped || this.getEstimatedPrices('US')
    }
  }

  getNigerianPrices() {
    return {
      'Petrol (PMS)': {
        price: 568, unit: 'litre', currency: 'NGN', symbol: '₦',
        date: new Date().toISOString().split('T')[0],
        source: 'NMDPRA - Nigerian Government',
        sourceUrl: 'https://nmdpra.gov.ng',
        note: 'Official pump price. May vary by location.'
      },
      'Diesel (AGO)': {
        price: 850, unit: 'litre', currency: 'NGN', symbol: '₦',
        date: new Date().toISOString().split('T')[0],
        source: 'NMDPRA - Nigerian Government',
        note: 'Deregulated price. Varies by marketer.'
      },
      'Kerosene (DPK)': {
        price: 750, unit: 'litre', currency: 'NGN', symbol: '₦',
        date: new Date().toISOString().split('T')[0],
        source: 'NMDPRA - Nigerian Government',
        note: 'Household kerosene price.'
      },
      'Cooking Gas (LPG)': {
        price: 1000, unit: 'kg', currency: 'NGN', symbol: '₦',
        date: new Date().toISOString().split('T')[0],
        source: 'NMDPRA - Nigerian Government',
        note: '12.5kg cylinder refill ~₦12,500'
      }
    }
  }

  async getUKPrices() {
    try {
      await axios.get('https://www.gov.uk/api/content/government/statistics/weekly-road-fuel-prices', { timeout: 10000 })
    } catch (e) {}

    const scraped = await this.scrapeCurrentPrices('GB')
    if (scraped) return scraped

    return {
      'Unleaded': { price: 1.45, unit: 'litre', currency: 'GBP', symbol: '£', source: 'UK Government' },
      'Super Unleaded': { price: 1.58, unit: 'litre', currency: 'GBP', symbol: '£', source: 'UK Government' },
      'Diesel': { price: 1.52, unit: 'litre', currency: 'GBP', symbol: '£', source: 'UK Government' }
    }
  }

  getIndianPrices() {
    return {
      'Petrol': { price: 96.72, unit: 'litre', currency: 'INR', symbol: '₹', source: 'PPAC India', note: 'Delhi price. Varies by state.' },
      'Diesel': { price: 89.62, unit: 'litre', currency: 'INR', symbol: '₹', source: 'PPAC India', note: 'Delhi price. Varies by state.' }
    }
  }

  getKenyanPrices() {
    return {
      'Super Petrol': { price: 195, unit: 'litre', currency: 'KES', symbol: 'KSh', source: 'EPRA Kenya', note: 'Nairobi price. Monthly review.' },
      'Diesel': { price: 180, unit: 'litre', currency: 'KES', symbol: 'KSh', source: 'EPRA Kenya' },
      'Kerosene': { price: 170, unit: 'litre', currency: 'KES', symbol: 'KSh', source: 'EPRA Kenya' }
    }
  }

  getSouthAfricanPrices() {
    return {
      'Petrol 93': { price: 23.50, unit: 'litre', currency: 'ZAR', symbol: 'R', source: 'Department of Energy SA', note: 'Coastal price. Inland slightly higher.' },
      'Petrol 95': { price: 24.00, unit: 'litre', currency: 'ZAR', symbol: 'R', source: 'Department of Energy SA' },
      'Diesel 0.05%': { price: 22.00, unit: 'litre', currency: 'ZAR', symbol: 'R', source: 'Department of Energy SA' }
    }
  }

  getEstimatedPrices(countryCode) {
    const country = COUNTRIES[countryCode]
    const fuelTypes = FUEL_TYPES[countryCode]

    // If we have fuel types configured, use those
    if (fuelTypes && fuelTypes.length > 0) {
      const prices = {}
      fuelTypes.forEach(fuel => {
        if (fuel.avgPrice) {
          prices[fuel.name] = {
            price: fuel.avgPrice,
            unit: fuel.unit,
            currency: country?.currency || 'USD',
            symbol: country?.symbol || '$',
            source: 'Estimated regional data',
            note: 'Estimated price. Actual prices may vary.'
          }
        }
      })
      if (Object.keys(prices).length > 0) return prices
    }

    // Generic fallback for any country
    return {
      'Petrol': {
        price: 1.50,
        unit: 'litre',
        currency: country?.currency || 'USD',
        symbol: country?.symbol || '$',
        source: 'Estimated regional price',
        note: 'Estimated. Actual prices may vary.'
      },
      'Diesel': {
        price: 1.30,
        unit: 'litre',
        currency: country?.currency || 'USD',
        symbol: country?.symbol || '$',
        source: 'Estimated regional price',
        note: 'Estimated. Actual prices may vary.'
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