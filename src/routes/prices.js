import express from 'express'
import { priceService } from '../services/priceService.js'
import { priceValidation } from '../middleware/validator.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'

const router = express.Router()

/**
 * GET /api/v1/prices/official/:country
 * Get official prices for a country
 */
router.get('/official/:country',
  asyncHandler(async (req, res) => {
    const { country } = req.params
    const countryCode = country.toUpperCase()
    
    const prices = await priceService.getOfficialPrices(countryCode)

    // Return empty object instead of 404 for serverless
    res.json({
      success: true,
      data: {
        country: countryCode,
        prices: prices || {},
        count: prices ? Object.keys(prices).length : 0,
        timestamp: new Date().toISOString()
      }
    })
  })
)

/**
 * POST /api/v1/prices/report
 * Report a fuel price
 */
router.post('/report',
  priceValidation.report,
  asyncHandler(async (req, res) => {
    const { station_id, fuel_type, price, currency, country_code } = req.body

    const report = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      station_id,
      fuel_type,
      price: parseFloat(price),
      currency: currency || 'USD',
      country_code: (country_code || 'US').toUpperCase(),
      reported_at: new Date().toISOString(),
      reported_by_ip: req.headers['x-forwarded-for'] || req.ip || 'unknown',
      verified: false,
      status: 'pending'
    }

    res.status(201).json({
      success: true,
      data: report,
      message: 'Price reported successfully. Thank you for your contribution!'
    })
  })
)

/**
 * GET /api/v1/prices/all
 * Get prices for all countries
 */
router.get('/all',
  asyncHandler(async (req, res) => {
    const allPrices = await priceService.getAllPrices()
    
    res.json({
      success: true,
      data: allPrices,
      count: Object.keys(allPrices).length,
      timestamp: new Date().toISOString()
    })
  })
)

export default router