import express from 'express'
import { osmService } from '../services/osmService.js'
import { priceService } from '../services/priceService.js'
import { geoService } from '../services/geoService.js'
import { stationValidation } from '../middleware/validator.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { googlePlacesService } from '../services/googlePlacesService.js'

const router = express.Router()

/**
 * GET /api/v1/stations/nearby
 * Get nearby fuel stations
 */
router.get('/nearby', 
  stationValidation.nearby,
  asyncHandler(async (req, res) => {
    const { lat, lng, radius, country } = req.query
    
    let countryCode = country
    if (!countryCode) {
      const detected = await geoService.detectCountry(req)
      countryCode = detected.country_code
    }

    let latitude = lat ? parseFloat(lat) : null
    let longitude = lng ? parseFloat(lng) : null
    
    if (!latitude || !longitude) {
      const detected = await geoService.detectCountry(req)
      latitude = detected.latitude || 40.7128
      longitude = detected.longitude || -74.0060
    }

    const searchRadius = radius ? parseFloat(radius) : 20

    const [stations, officialPrices] = await Promise.all([
      osmService.getNearbyStations(latitude, longitude, searchRadius),
      priceService.getOfficialPrices(countryCode.toUpperCase())
    ])

    res.json({
      success: true,
      data: {
        stations,
        prices: officialPrices,
        metadata: {
          count: stations.length,
          query: {
            latitude,
            longitude,
            radius: searchRadius,
            country: countryCode.toUpperCase()
          },
          timestamp: new Date().toISOString()
        }
      }
    })
  })
)

/**
 * GET /api/v1/stations/google-nearby
 * Get nearby fuel stations from Google Places
 */
router.get('/google-nearby',
  asyncHandler(async (req, res) => {
    const { lat, lng, radius } = req.query
    
    const latitude = lat ? parseFloat(lat) : 9.0567
    const longitude = lng ? parseFloat(lng) : 7.4969
    const searchRadius = radius ? parseFloat(radius) : 20

    const stations = await googlePlacesService.getNearbyStations(latitude, longitude, searchRadius)

    res.json({
      success: true,
      data: {
        stations,
        count: stations.length,
        source: 'google_places',
        timestamp: new Date().toISOString()
      }
    })
  })
)

/**
 * GET /api/v1/stations/search
 * Search stations by name/address
 */
router.get('/search',
  stationValidation.search,
  asyncHandler(async (req, res) => {
    const { q, country } = req.query
    
    const results = await osmService.searchStations(q, country)

    res.json({
      success: true,
      data: results,
      metadata: {
        query: q,
        count: results.length,
        timestamp: new Date().toISOString()
      }
    })
  })
)

/**
 * GET /api/v1/stations/:id
 * Get station by ID
 */
router.get('/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params
    
    const results = await osmService.searchStations(id)
    
    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Station not found', code: 'NOT_FOUND' }
      })
    }

    res.json({
      success: true,
      data: results[0]
    })
  })
)

export default router