import express from 'express'
import stationsRouter from './stations.js'
import pricesRouter from './prices.js'
import countriesRouter from './countries.js'
import geolocationRouter from './geolocation.js'

const router = express.Router()

// API version
const API_VERSION = 'v1'

// Mount routes
router.use('/stations', stationsRouter)
router.use('/prices', pricesRouter)
router.use('/countries', countriesRouter)
router.use('/geolocation', geolocationRouter)

// API documentation endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'FindFuelSpot API',
    version: API_VERSION,
    endpoints: {
      stations: {
        nearby: `GET /api/${API_VERSION}/stations/nearby?lat={lat}&lng={lng}&radius={km}&country={code}`,
        google: `GET /api/${API_VERSION}/stations/google-nearby?lat={lat}&lng={lng}&radius={km}`,
        search: `GET /api/${API_VERSION}/stations/search?q={query}&country={code}`
      },
      prices: {
        official: `GET /api/${API_VERSION}/prices/official/:country`,
        report: `POST /api/${API_VERSION}/prices/report`,
        all: `GET /api/${API_VERSION}/prices/all`
      },
      countries: {
        list: `GET /api/${API_VERSION}/countries`,
        get: `GET /api/${API_VERSION}/countries/:code`
      },
      geolocation: {
        detect: `GET /api/${API_VERSION}/geolocation/detect`,
        ip: `GET /api/${API_VERSION}/geolocation/ip`
      },
      health: `GET /api/${API_VERSION}/health`
    },
    documentation: 'https://github.com/brainycodes/fuel-finder',
    timestamp: new Date().toISOString()
  })
})

export default router