// backend/src/services/priceService.js

import axios from 'axios'
import { cacheService } from '../utils/cache.js'
import { config } from '../config/index.js'

export class PriceService {
  constructor() {
    this.eiaUrl =
      config.apis.eia ||
      'https://api.eia.gov/v2'

    this.googlePlacesUrl =
      config.apis.googlePlaces ||
      'https://places.googleapis.com/v1'

    this.googlePlacesApiKey =
      config.googlePlacesApiKey ||
      process.env.GOOGLE_PLACES_API_KEY ||
      null

    this.eiaApiKey =
      config.eiaApiKey ||
      process.env.EIA_API_KEY ||
      null
  }

  // ============================================================
  // CURRENCY
  // ============================================================

  getSymbol(currency) {
    const symbols = {
      USD: '$',
      NGN: '₦',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      JPY: '¥',
      AUD: 'A$',
      CAD: 'C$',
      ZAR: 'R',
      KES: 'KSh',
      GHS: '₵',
      EGP: 'E£',
      AED: 'د.إ',
      SAR: '﷼',
      CNY: '¥',
      MXN: 'Mex$',
      BRL: 'R$',
      NZD: 'NZ$',
      ARS: 'AR$'
    }

    return symbols[currency] || currency || ''
  }

  // ============================================================
  // COUNTRY CURRENCY
  // ============================================================

  getCurrencyForCountry(code) {
    const currencies = {
      US: 'USD',
      NG: 'NGN',
      GB: 'GBP',
      IN: 'INR',
      KE: 'KES',
      ZA: 'ZAR',
      GH: 'GHS',
      EG: 'EGP',
      DE: 'EUR',
      FR: 'EUR',
      IT: 'EUR',
      ES: 'EUR',
      JP: 'JPY',
      AE: 'AED',
      SA: 'SAR',
      CN: 'CNY',
      AU: 'AUD',
      NZ: 'NZD',
      CA: 'CAD',
      MX: 'MXN',
      BR: 'BRL',
      AR: 'ARS'
    }

    return (
      currencies[
        String(code || '').toUpperCase()
      ] || null
    )
  }

  // ============================================================
  // PUBLIC NATIONAL PRICE API
  // ============================================================

  async getOfficialPrices(countryCode) {
    const code =
      String(countryCode || '')
        .trim()
        .toUpperCase()

    if (!code) {
      return null
    }

    const cacheKey =
      `official_prices_${code}`

    const cached =
      cacheService.get(cacheKey)

    if (cached) {
      return cached
    }

    try {
      let prices = null

      /*
       * US:
       * Use the official U.S. Energy Information
       * Administration API.
       */
      if (code === 'US') {
        prices =
          await this.getUSPrices()
      }

      /*
       * IMPORTANT:
       *
       * There are intentionally NO hard-coded
       * prices here.
       *
       * There is also NO GlobalPetrolPrices
       * scraping fallback.
       *
       * If a verified provider is unavailable,
       * the API returns null.
       */

      if (
        prices &&
        Object.keys(prices).length > 0
      ) {
        cacheService.set(
          cacheKey,
          prices,
          3600
        )

        return prices
      }

      return null
    } catch (error) {
      console.error(
        `Official price fetch failed for ${code}:`,
        error.message
      )

      return null
    }
  }

  // ============================================================
  // EIA — UNITED STATES
  // ============================================================

  async getUSPrices() {
    if (!this.eiaApiKey) {
      console.warn(
        'EIA_API_KEY is not configured'
      )

      return null
    }

    const cacheKey =
      'eia_us_fuel_prices'

    const cached =
      cacheService.get(cacheKey)

    if (cached) {
      return cached
    }

    try {
      const response =
        await axios.get(
          `${this.eiaUrl}/petroleum/pri/gnd/data/`,
          {
            params: {
              api_key:
                this.eiaApiKey,

              frequency:
                'weekly',

              'data[0]':
                'value',

              'facets[product][]': [
                'EPMR',
                'EPMP',
                'EPMD'
              ],

              sort: JSON.stringify([
                {
                  column: 'period',
                  direction: 'desc'
                }
              ]),

              length: 20
            },

            timeout: 8000
          }
        )

      const rows =
        response
          ?.data
          ?.response
          ?.data

      if (
        !Array.isArray(rows)
      ) {
        return null
      }

      const names = {
        EPMR: 'Regular',
        EPMP: 'Premium',
        EPMD: 'Diesel'
      }

      const prices = {}

      for (
        const item of rows
      ) {
        const product =
          item?.product

        const value =
          this.parseNumber(
            item?.value
          )

        if (
          !names[product] ||
          !Number.isFinite(value) ||
          value <= 0
        ) {
          continue
        }

        /*
         * Keep only the newest
         * observation for each product.
         */
        if (
          prices[
            names[product]
          ]
        ) {
          continue
        }

        prices[
          names[product]
        ] = {
          price: value,

          unit: 'gallon',

          currency: 'USD',

          symbol: '$',

          date:
            item?.period ||
            null,

          source:
            'U.S. Energy Information Administration',

          sourceUrl:
            'https://www.eia.gov/petroleum/gasdiesel/',

          price_type:
            'national_published_price'
        }
      }

      if (
        Object.keys(prices)
          .length === 0
      ) {
        return null
      }

      cacheService.set(
        cacheKey,
        prices,
        3600
      )

      return prices
    } catch (error) {
      console.error(
        'EIA price request failed:',
        error.message
      )

      return null
    }
  }

  // ============================================================
  // GOOGLE PLACES — STATION PRICE
  // ============================================================

  /*
   * IMPORTANT:
   *
   * Google Places station fuel prices are
   * station-specific.
   *
   * They must NEVER be used as a national
   * average/reference price.
   */

  async getStationFuelPrices(
    placeId
  ) {
    if (
      !placeId ||
      !this.googlePlacesApiKey
    ) {
      return []
    }

    const cacheKey =
      `station_fuel_prices_${placeId}`

    const cached =
      cacheService.get(cacheKey)

    if (
      cached !== null
    ) {
      return cached
    }

    try {
      const response =
        await axios.get(
          `${this.googlePlacesUrl}/places/${encodeURIComponent(
            placeId
          )}`,
          {
            headers: {
              'X-Goog-Api-Key':
                this.googlePlacesApiKey,

              /*
               * Request only fields we actually need.
               */
              'X-Goog-FieldMask':
                [
                  'id',
                  'displayName',
                  'fuelOptions'
                ].join(',')
            },

            timeout: 8000
          }
        )

      const fuelOptions =
        response
          ?.data
          ?.fuelOptions

      if (
        !Array.isArray(
          fuelOptions
        )
      ) {
        /*
         * Short cache for stations where
         * Google has no fuel information.
         */
        cacheService.set(
          cacheKey,
          [],
          300
        )

        return []
      }

      const prices =
        fuelOptions
          .map(option =>
            this.normalizeGoogleFuelPrice(
              option
            )
          )
          .filter(Boolean)

      /*
       * Cache successful station responses
       * for 15 minutes.
       */
      cacheService.set(
        cacheKey,
        prices,
        900
      )

      return prices
    } catch (error) {
      console.error(
        `Google station fuel price failed for ${placeId}:`,
        error.message
      )

      /*
       * Don't repeatedly hit Google for a
       * station that currently has no data.
       */
      cacheService.set(
        cacheKey,
        [],
        300
      )

      return []
    }
  }

  // ============================================================
  // NORMALIZE GOOGLE FUEL PRICE
  // ============================================================

  normalizeGoogleFuelPrice(
    option
  ) {
    if (
      !option ||
      typeof option !== 'object'
    ) {
      return null
    }

    /*
     * Google may expose money in different
     * nested structures.
     */
    const money =
      option.price ||
      option.fuelPrice ||
      option

    const numericPrice =
      this.extractMoneyValue(
        money
      )

    if (
      !Number.isFinite(
        numericPrice
      ) ||
      numericPrice <= 0
    ) {
      return null
    }

    const currency =
      money?.currencyCode ||
      option?.currencyCode ||
      'USD'

    return {
      fuel_type:
        option.type ||
        option.fuelType ||
        option.name ||
        'Fuel',

      price:
        numericPrice,

      currency,

      symbol:
        this.getSymbol(
          currency
        ),

      unit:
        'litre',

      source:
        'Google Places',

      price_type:
        'station_last_known_price',

      update_time:
        option.updateTime ||
        option.update_time ||
        null
    }
  }

  // ============================================================
  // EXTRACT GOOGLE MONEY VALUE
  // ============================================================

  extractMoneyValue(
    money
  ) {
    if (
      money === null ||
      money === undefined
    ) {
      return null
    }

    if (
      typeof money === 'number'
    ) {
      return Number.isFinite(
        money
      )
        ? money
        : null
    }

    if (
      typeof money === 'string'
    ) {
      return this.parseNumber(
        money
      )
    }

    if (
      typeof money === 'object'
    ) {
      const values = [
        money.units !== undefined
          ? Number(
              money.units
            )
          : null,

        money.value !== undefined
          ? Number(
              money.value
            )
          : null,

        money.amount !== undefined
          ? Number(
              money.amount
            )
          : null,

        money.price !== undefined
          ? Number(
              money.price
            )
          : null
      ]

      for (
        const value of values
      ) {
        if (
          Number.isFinite(
            value
          ) &&
          value > 0
        ) {
          return value
        }
      }
    }

    return null
  }

  // ============================================================
  // STATION PRICE HELPER
  // ============================================================

  async getStationPrices(
    station
  ) {
    if (!station) {
      return []
    }

    const placeId =
      station.google_place_id ||
      station.place_id ||
      station.googlePlaceId ||
      null

    if (!placeId) {
      return []
    }

    return this.getStationFuelPrices(
      placeId
    )
  }

  // ============================================================
  // ALL SUPPORTED NATIONAL PRICES
  // ============================================================

  async getAllPrices() {
    /*
     * Only providers that are actually
     * implemented are queried.
     *
     * At the moment this is EIA for US.
     *
     * We deliberately do not generate
     * values for other countries.
     */

    const countries = [
      'US'
    ]

    const results = {}

    for (
      const code of countries
    ) {
      try {
        const prices =
          await this.getOfficialPrices(
            code
          )

        if (
          prices &&
          Object.keys(prices)
            .length > 0
        ) {
          results[code] =
            prices
        }
      } catch (error) {
        console.error(
          `Failed to get prices for ${code}:`,
          error.message
        )
      }
    }

    return results
  }

  // ============================================================
  // NUMBER PARSER
  // ============================================================

  parseNumber(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return null
    }

    if (
      typeof value === 'number'
    ) {
      return Number.isFinite(
        value
      )
        ? value
        : null
    }

    let text =
      String(value).trim()

    if (!text) {
      return null
    }

    /*
     * Remove currency symbols and
     * other non-numeric characters.
     */
    text =
      text.replace(
        /[^\d.,-]/g,
        ''
      )

    if (!text) {
      return null
    }

    const lastDot =
      text.lastIndexOf('.')

    const lastComma =
      text.lastIndexOf(',')

    if (
      lastComma > lastDot
    ) {
      /*
       * Example:
       * 1.202,75
       */
      text =
        text.replace(
          /\./g,
          ''
        )

      text =
        text.replace(
          ',',
          '.'
        )
    } else {
      /*
       * Example:
       * 1,202.75
       */
      text =
        text.replace(
          /,/g,
          ''
        )
    }

    const number =
      Number(text)

    return Number.isFinite(
      number
    )
      ? number
      : null
  }
}

export const priceService =
  new PriceService()

export default priceService