import express from 'express'
import { COUNTRIES, FUEL_TYPES, CONTINENTS, DEFAULT_FUEL_TYPES } from '../utils/constants.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = express.Router()

/**
 * GET /api/v1/countries
 * Get all supported countries
 */
router.get('/',
  asyncHandler(async (req, res) => {
    const { continent } = req.query

    let countries = Object.entries(COUNTRIES).map(([code, data]) => ({
      code,
      ...data,
      fuel_types: FUEL_TYPES[code] || DEFAULT_FUEL_TYPES,
      fuel_type_count: (FUEL_TYPES[code] || DEFAULT_FUEL_TYPES).length
    }))

    // Filter by continent if specified
    if (continent && CONTINENTS[continent]) {
      countries = countries.filter(c => CONTINENTS[continent].includes(c.code))
    }

    // Sort by name
    countries.sort((a, b) => a.name.localeCompare(b.name))

    res.json({
      success: true,
      data: countries,
      metadata: {
        count: countries.length,
        continents: Object.keys(CONTINENTS),
        timestamp: new Date().toISOString()
      }
    })
  })
)

/**
 * GET /api/v1/countries/:code
 * Get specific country
 */
router.get('/:code',
  asyncHandler(async (req, res) => {
    const { code } = req.params
    const countryCode = code.toUpperCase()
    const country = COUNTRIES[countryCode]

    if (!country) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Country '${countryCode}' not found`,
          code: 'NOT_FOUND'
        }
      })
    }

    res.json({
      success: true,
      data: {
        code: countryCode,
        ...country,
        fuel_types: FUEL_TYPES[countryCode] || DEFAULT_FUEL_TYPES
      }
    })
  })
)

/**
 * GET /api/v1/countries/:code/fuel-types
 * Get fuel types for a country
 */
router.get('/:code/fuel-types',
  asyncHandler(async (req, res) => {
    const { code } = req.params
    const countryCode = code.toUpperCase()
    
    if (!COUNTRIES[countryCode]) {
      return res.status(404).json({
        success: false,
        error: { message: 'Country not found' }
      })
    }

    const fuelTypes = FUEL_TYPES[countryCode] || DEFAULT_FUEL_TYPES

    res.json({
      success: true,
      data: fuelTypes,
      count: fuelTypes.length
    })
  })
)

/**
 * GET /api/v1/countries/continents/list
 * Get all continents
 */
router.get('/continents/list',
  asyncHandler(async (req, res) => {
    const continents = Object.entries(CONTINENTS).map(([name, countries]) => ({
      name,
      countries: countries.map(code => ({
        code,
        name: COUNTRIES[code]?.name
      })),
      country_count: countries.length
    }))

    res.json({
      success: true,
      data: continents
    })
  })
)

export default router