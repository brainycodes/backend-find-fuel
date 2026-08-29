import express from 'express'

import {
  priceService
} from '../services/priceService.js'

import {
  priceValidation
} from '../middleware/validator.js'

import {
  asyncHandler
} from '../middleware/errorHandler.js'

import {
  COUNTRIES
} from '../utils/constants.js'

const router =
  express.Router()

router.get(
  '/official/:country',

  asyncHandler(
    async (req, res) => {
      const country =
        req.params.country
          .toUpperCase()

      if (!COUNTRIES[country]) {
        return res.status(404).json({
          success: false,

          error: {
            message:
              `Country '${country}' is not supported`
          }
        })
      }

      const prices =
        await priceService
          .getOfficialPrices(
            country
          )

      res.json({
        success: true,

        data: {
          country,

          prices:
            prices || {},

          count:
            prices
              ? Object.keys(prices)
                  .length
              : 0,

          available:
            Boolean(
              prices &&
              Object.keys(prices)
                .length
            ),

          timestamp:
            new Date()
              .toISOString()
        }
      })
    }
  )
)

router.post(
  '/report',

  priceValidation.report,

  asyncHandler(
    async (req, res) => {
      const {
        station_id,
        fuel_type,
        price,
        currency,
        country_code
      } = req.body

      const report = {
        station_id,

        fuel_type,

        price:
          Number(price),

        currency:
          currency
            ?.toUpperCase() ||
          null,

        country_code:
          country_code
            ?.toUpperCase() ||
          null,

        reported_at:
          new Date()
            .toISOString(),

        verified:
          false,

        status:
          'pending'
      }

      res.status(201).json({
        success: true,

        data:
          report,

        message:
          'Price submitted for verification.'
      })
    }
  )
)

export default router