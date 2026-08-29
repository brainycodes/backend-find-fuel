// backend/src/routes/stations.js

import express from 'express'

import {
  osmService
} from '../services/osmService.js'

import {
  priceService
} from '../services/priceService.js'

import {
  geoService
} from '../services/geoService.js'

import {
  stationValidation
} from '../middleware/validator.js'

import {
  asyncHandler
} from '../middleware/errorHandler.js'

import {
  googlePlacesService
} from '../services/googlePlacesService.js'

const router =
  express.Router()

// ============================================================
// NEARBY STATIONS
// ============================================================

router.get(
  '/nearby',

  stationValidation.nearby,

  asyncHandler(async (req, res) => {
    const {
      lat,
      lng,
      radius,
      country
    } = req.query

    let latitude =
      lat !== undefined
        ? Number(lat)
        : null

    let longitude =
      lng !== undefined
        ? Number(lng)
        : null

    let location = null

    /*
     * ==========================================================
     * 1. REAL BROWSER GPS
     * ==========================================================
     */

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      location =
        await geoService.reverseGeocode(
          latitude,
          longitude
        )

      /*
       * Preserve the actual coordinates.
       */
      if (location) {
        location.latitude =
          latitude

        location.longitude =
          longitude

        location.location_source =
          'gps'
      }
    }

    /*
     * ==========================================================
     * 2. IP FALLBACK
     * ==========================================================
     */

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      location =
        await geoService.detectLocation(req)

      if (
        !location ||
        !Number.isFinite(
          location.latitude
        ) ||
        !Number.isFinite(
          location.longitude
        )
      ) {
        return res.status(400).json({
          success: false,

          error: {
            message:
              'Your actual location could not be determined. Please enable location/GPS access and try again.',

            code:
              'LOCATION_REQUIRED'
          }
        })
      }

      latitude =
        Number(location.latitude)

      longitude =
        Number(location.longitude)
    }

    /*
     * ==========================================================
     * VALIDATE FINAL COORDINATES
     * ==========================================================
     */

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,

        error: {
          message:
            'Invalid location coordinates',

          code:
            'INVALID_COORDINATES'
        }
      })
    }

    /*
     * ==========================================================
     * COUNTRY
     * ==========================================================
     */

    const countryCode =
      (
        country ||
        location?.country_code
      )?.toUpperCase()

    if (!countryCode) {
      return res.status(400).json({
        success: false,

        error: {
          message:
            'Country could not be determined',

          code:
            'COUNTRY_REQUIRED'
        }
      })
    }

    /*
     * ==========================================================
     * RADIUS
     * ==========================================================
     */

    let searchRadius =
      Number(radius)

    if (
      !Number.isFinite(
        searchRadius
      )
    ) {
      searchRadius = 20
    }

    searchRadius =
      Math.min(
        Math.max(
          searchRadius,
          1
        ),
        100
      )

    /*
     * ==========================================================
     * SEARCH
     * ==========================================================
     */

    const [
      stations,
      officialPrices
    ] =
      await Promise.all([
        osmService.getNearbyStations(
          latitude,
          longitude,
          searchRadius
        ),

        priceService.getOfficialPrices(
          countryCode
        )
      ])

    return res.json({
      success: true,

      data: {
        stations,

        prices:
          officialPrices || {},

        location: {
          latitude,

          longitude,

          country_code:
            location?.country_code ||
            countryCode,

          country_name:
            location?.country_name ||
            null,

          state:
            location?.state ||
            null,

          county:
            location?.county ||
            null,

          city:
            location?.city ||
            null,

          town:
            location?.town ||
            null,

          municipality:
            location?.municipality ||
            null,

          village:
            location?.village ||
            null,

          display_location:
            location?.display_location ||
            null,

          source:
            location?.location_source ||
            'coordinates',

          accuracy:
            location?.accuracy ||
            null,

          accuracy_meters:
            location?.accuracy_meters ??
            null
        },

        metadata: {
          count:
            stations.length,

          query: {
            latitude,

            longitude,

            radius:
              searchRadius,

            country:
              countryCode
          },

          timestamp:
            new Date().toISOString()
        }
      }
    })
  })
)

// ============================================================
// GOOGLE NEARBY
// ============================================================

router.get(
  '/google-nearby',

  asyncHandler(async (req, res) => {
    const {
      lat,
      lng,
      radius
    } = req.query

    let latitude =
      Number(lat)

    let longitude =
      Number(lng)

    let location = null

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      location =
        await geoService.detectLocation(req)

      if (
        !location ||
        !Number.isFinite(location.latitude) ||
        !Number.isFinite(location.longitude)
      ) {
        return res.status(400).json({
          success: false,

          error: {
            message:
              'Location is required',

            code:
              'LOCATION_REQUIRED'
          }
        })
      }

      latitude =
        location.latitude

      longitude =
        location.longitude
    }

    const searchRadius =
      Math.min(
        Math.max(
          Number(radius) || 20,
          1
        ),
        100
      )

    const stations =
      await googlePlacesService
        .getNearbyStations(
          latitude,
          longitude,
          searchRadius
        )

    return res.json({
      success: true,

      data: {
        stations,

        count:
          stations.length,

        source:
          'google_places',

        location: {
          latitude,
          longitude
        },

        timestamp:
          new Date().toISOString()
      }
    })
  })
)

// ============================================================
// SEARCH
// ============================================================

router.get(
  '/search',

  stationValidation.search,

  asyncHandler(async (req, res) => {
    const {
      q,
      country
    } = req.query

    const results =
      await osmService.searchStations(
        q,
        country
      )

    return res.json({
      success: true,

      data: results,

      metadata: {
        query: q,

        count:
          results.length,

        timestamp:
          new Date().toISOString()
      }
    })
  })
)

// ============================================================
// STATION BY ID
// ============================================================

router.get(
  '/:id',

  asyncHandler(async (req, res) => {
    const {
      id
    } = req.params

    const results =
      await osmService.searchStations(
        id
      )

    if (
      !results ||
      results.length === 0
    ) {
      return res.status(404).json({
        success: false,

        error: {
          message:
            'Station not found',

          code:
            'NOT_FOUND'
        }
      })
    }

    return res.json({
      success: true,

      data:
        results[0]
    })
  })
)

export default router