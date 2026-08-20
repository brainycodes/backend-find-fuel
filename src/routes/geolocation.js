import express from 'express'
import { geoService } from '../services/geoService.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { getCountryFromCoordinates } from '../utils/helpers.js'

const router = express.Router()

/**
 * GET /api/v1/geolocation/detect
 * Detect user's country
 */
router.get('/detect',
  asyncHandler(async (req, res) => {
    const location = await geoService.detectCountry(req)
    
    res.json({
      success: true,
      data: location,
      timestamp: new Date().toISOString()
    })
  })
)

/**
 * GET /api/v1/geolocation/ip
 * Get location from IP
 */
router.get('/ip',
  asyncHandler(async (req, res) => {
    const clientIP = geoService.getClientIP(req)
    const location = await geoService.getLocationFromIP(clientIP)
    
    if (!location) {
      return res.status(404).json({
        success: false,
        error: { message: 'Could not determine location from IP' }
      })
    }

    res.json({
      success: true,
      data: location
    })
  })
)

/**
 * GET /api/v1/geolocation/coordinates
 * Get country from coordinates
 */
router.get('/coordinates',
  asyncHandler(async (req, res) => {
    const { lat, lng } = req.query
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: { message: 'Latitude and longitude required' }
      })
    }

    const countryCode = getCountryFromCoordinates(
      parseFloat(lat),
      parseFloat(lng)
    )

    res.json({
      success: true,
      data: {
        coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
        country_code: countryCode
      }
    })
  })
)

export default router