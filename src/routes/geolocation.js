// backend/src/routes/geolocation.js

import express from 'express'

import {
  geoService
} from '../services/geoService.js'

import {
  asyncHandler
} from '../middleware/errorHandler.js'

const router =
  express.Router()

// ============================================================
// DETECT
// ============================================================

router.get(
  '/detect',

  asyncHandler(async (req, res) => {
    const location =
      await geoService.detectLocation(req)

    if (!location) {
      return res.status(404).json({
        success: false,

        error: {
          message:
            'Unable to determine your location. Please enable GPS/location access.',

          code:
            'LOCATION_NOT_FOUND'
        }
      })
    }

    return res.json({
      success: true,

      data: location
    })
  })
)

// ============================================================
// REVERSE
// ============================================================

router.get(
  '/reverse',

  asyncHandler(async (req, res) => {
    const lat =
      Number(req.query.lat)

    const lng =
      Number(req.query.lng)

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,

        error: {
          message:
            'Valid latitude and longitude are required',

          code:
            'INVALID_COORDINATES'
        }
      })
    }

    const location =
      await geoService.reverseGeocode(
        lat,
        lng
      )

    if (!location) {
      return res.status(404).json({
        success: false,

        error: {
          message:
            'Could not reverse geocode coordinates',

          code:
            'REVERSE_GEOCODING_FAILED'
        }
      })
    }

    return res.json({
      success: true,

      data: location
    })
  })
)

// ============================================================
// COORDINATES
// ============================================================

router.get(
  '/coordinates',

  asyncHandler(async (req, res) => {
    const lat =
      Number(req.query.lat)

    const lng =
      Number(req.query.lng)

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,

        error: {
          message:
            'Valid latitude and longitude are required',

          code:
            'INVALID_COORDINATES'
        }
      })
    }

    const location =
      await geoService.reverseGeocode(
        lat,
        lng
      )

    if (!location) {
      return res.status(404).json({
        success: false,

        error: {
          message:
            'Could not determine address from coordinates',

          code:
            'LOCATION_NOT_FOUND'
        }
      })
    }

    return res.json({
      success: true,

      data: {
        coordinates: {
          lat,
          lng
        },

        ...location
      }
    })
  })
)

// ============================================================
// IP
// ============================================================

router.get(
  '/ip',

  asyncHandler(async (req, res) => {
    const ip =
      geoService.getClientIP(req)

    const location =
      await geoService.getLocationFromIP(ip)

    if (!location) {
      return res.status(404).json({
        success: false,

        error: {
          message:
            'Unable to determine location from IP',

          code:
            'IP_LOCATION_NOT_FOUND'
        }
      })
    }

    return res.json({
      success: true,

      data: location
    })
  })
)

export default router