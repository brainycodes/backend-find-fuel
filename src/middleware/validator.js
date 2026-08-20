import { body, query, param, validationResult } from 'express-validator'
import { ValidationError } from './errorHandler.js'

/**
 * Validate request and throw errors if invalid
 */
export function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }))
    throw new ValidationError(formattedErrors)
  }
  next()
}

/**
 * Common validation rules
 */
export const rules = {
  latitude: query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  longitude: query('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  radius: query('radius')
    .optional()
    .isFloat({ min: 1, max: 100 })
    .withMessage('Radius must be between 1 and 100 km'),
  
  countryCode: query('country')
    .optional()
    .isString()
    .isLength({ min: 2, max: 2 })
    .withMessage('Country code must be 2 characters'),
  
  searchQuery: query('q')
    .isString()
    .isLength({ min: 2, max: 200 })
    .withMessage('Search query must be between 2 and 200 characters'),
  
  stationId: param('id')
    .isString()
    .notEmpty()
    .withMessage('Station ID is required'),
  
  price: body('price')
    .isFloat({ min: 0.01, max: 9999 })
    .withMessage('Price must be between 0.01 and 9999'),
  
  fuelType: body('fuel_type')
    .isString()
    .notEmpty()
    .withMessage('Fuel type is required'),
  
  currency: body('currency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency code must be 3 characters')
}

/**
 * Station validation chains
 */
export const stationValidation = {
  nearby: [
    rules.latitude,
    rules.longitude,
    rules.radius,
    rules.countryCode,
    validate
  ],
  search: [
    rules.searchQuery,
    rules.countryCode.optional(),
    validate
  ]
}

/**
 * Price validation chains
 */
export const priceValidation = {
  report: [
    body('station_id').isString().notEmpty().withMessage('Station ID required'),
    body('fuel_type').isString().notEmpty().withMessage('Fuel type required'),
    body('price').isFloat({ min: 0.01, max: 9999 }).withMessage('Valid price required'),
    body('currency').optional().isString().isLength({ min: 3, max: 3 }),
    body('country_code').optional().isString().isLength({ min: 2, max: 2 }),
    validate
  ]
}