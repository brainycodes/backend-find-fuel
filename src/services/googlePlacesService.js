import axios from 'axios'

import {
  cacheService
} from '../utils/cache.js'

import {
  config
} from '../config/index.js'

import {
  calculateDistance
} from '../utils/helpers.js'

export class GooglePlacesService {
  constructor() {
    this.apiKey =
      config.googlePlacesApiKey

    this.baseUrl =
      config.apis.googlePlaces
  }

  isConfigured() {
    return Boolean(
      this.apiKey
    )
  }

  async getNearbyStations(
    lat,
    lng,
    radiusKm = 20
  ) {
    if (!this.isConfigured()) {
      throw new Error(
        'GOOGLE_PLACES_API_KEY is not configured'
      )
    }

    const latitude = Number(lat)
    const longitude = Number(lng)

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      throw new Error(
        'Valid latitude and longitude are required'
      )
    }

    const radiusMeters =
      Math.min(
        Math.max(
          Number(radiusKm) * 1000,
          100
        ),
        50000
      )

    const cacheKey =
      `google_fuel_${latitude.toFixed(4)}_${longitude.toFixed(4)}_${radiusMeters}`

    const cached =
      cacheService.get(cacheKey)

    if (cached) {
      return cached
    }

    const response =
      await axios.post(
        `${this.baseUrl}/places:searchNearby`,

        {
          includedTypes: [
            'gas_station'
          ],

          maxResultCount: 20,

          rankPreference:
            'DISTANCE',

          locationRestriction: {
            circle: {
              center: {
                latitude,
                longitude
              },

              radius:
                radiusMeters
            }
          }
        },

        {
          headers: {
            'Content-Type':
              'application/json',

            'X-Goog-Api-Key':
              this.apiKey,

            'X-Goog-FieldMask': [
              'places.id',
              'places.displayName',
              'places.formattedAddress',
              'places.shortFormattedAddress',
              'places.location',
              'places.types',
              'places.primaryType',
              'places.businessStatus',
              'places.internationalPhoneNumber',
              'places.nationalPhoneNumber',
              'places.websiteUri',
              'places.googleMapsUri',
              'places.currentOpeningHours',
              'places.regularOpeningHours',
              'places.fuelOptions',
              'places.paymentOptions'
            ].join(',')
          },

          timeout: 15000
        }
      )

    const places =
      Array.isArray(
        response.data?.places
      )
        ? response.data.places
        : []

    const stations =
      places
        .map(place =>
          this.normalizePlace(
            place,
            latitude,
            longitude
          )
        )
        .filter(Boolean)

    cacheService.set(
      cacheKey,
      stations,
      300
    )

    return stations
  }

  normalizePlace(
    place,
    userLat,
    userLng
  ) {
    const lat =
      Number(
        place.location?.latitude
      )

    const lng =
      Number(
        place.location?.longitude
      )

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return null
    }

    const fuelPrices =
      this.normalizeFuelPrices(
        place.fuelOptions?.fuelPrices
      )

    return {
      id:
        `google_${place.id}`,

      google_place_id:
        place.id,

      name:
        place.displayName?.text ||
        'Fuel Station',

      address:
        place.formattedAddress ||
        place.shortFormattedAddress ||
        null,

      coordinates: {
        lat,
        lng
      },

      distance_km:
        calculateDistance(
          userLat,
          userLng,
          lat,
          lng
        ),

      phone:
        place.internationalPhoneNumber ||
        place.nationalPhoneNumber ||
        null,

      website:
        place.websiteUri ||
        null,

      google_maps_url:
        place.googleMapsUri ||
        null,

      business_status:
        place.businessStatus ||
        null,

      opening_hours:
        place.currentOpeningHours ||
        place.regularOpeningHours ||
        null,

      payment_options:
        place.paymentOptions ||
        null,

      fuel_prices:
        fuelPrices,

      fuel_price_source:
        fuelPrices.length
          ? 'Google Places'
          : null,

      fuel_price_status:
        fuelPrices.length
          ? 'last_known_station_price'
          : 'not_available',

      source:
        'google_places',

      last_updated:
        new Date().toISOString()
    }
  }

  normalizeFuelPrices(
    prices
  ) {
    if (
      !Array.isArray(prices)
    ) {
      return []
    }

    return prices
      .map(item => {
        const units =
          Number(
            item.price?.units
          )

        const nanos =
          Number(
            item.price?.nanos
          )

        const value =
          units +
          nanos / 1_000_000_000

        if (
          !Number.isFinite(value)
        ) {
          return null
        }

        return {
          fuel_type:
            item.type ||
            null,

          price:
            value,

          currency:
            item.price?.currencyCode ||
            null,

          update_time:
            item.updateTime ||
            null
        }
      })
      .filter(Boolean)
  }
}

export const googlePlacesService =
  new GooglePlacesService()