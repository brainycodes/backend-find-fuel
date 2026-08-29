// backend/src/config/index.js

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({
  path: join(__dirname, '../../.env')
})

const number = (value, fallback) => {
  const parsed = Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : fallback
}

const stringOrNull = value => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ''
  ) {
    return null
  }

  return String(value).trim()
}

export const config = {
  // ============================================================
  // SERVER
  // ============================================================

  port: number(
    process.env.PORT,
    5000
  ),

  host:
    process.env.HOST ||
    '0.0.0.0',

  nodeEnv:
    process.env.NODE_ENV ||
    'development',

  frontendUrl:
    process.env.FRONTEND_URL ||
    '*',

  // ============================================================
  // GOOGLE PLACES
  // ============================================================

  googlePlacesApiKey:
    stringOrNull(
      process.env.GOOGLE_PLACES_API_KEY
    ),

  // ============================================================
  // EIA
  // ============================================================

  eiaApiKey:
    stringOrNull(
      process.env.EIA_API_KEY
    ),

  // ============================================================
  // CACHE
  // ============================================================

  cache: {
    ttl: number(
      process.env.CACHE_TTL,
      900
    ),

    checkPeriod: number(
      process.env.CACHE_CHECK_PERIOD,
      120
    )
  },

  // ============================================================
  // EXTERNAL APIS
  // ============================================================

  apis: {
    // ----------------------------------------------------------
    // OPENSTREETMAP / OVERPASS
    // ----------------------------------------------------------

    openstreetmap:
      process.env.OVERPASS_URL ||
      'https://overpass-api.de/api/interpreter',

    openstreetmapMirrors: [
      process.env.OVERPASS_URL,

      'https://overpass-api.de/api/interpreter',

      'https://overpass.kumi.systems/api/interpreter',

      'https://overpass.private.coffee/api/interpreter'
    ].filter(Boolean),

    // ----------------------------------------------------------
    // NOMINATIM
    // ----------------------------------------------------------

    nominatim:
      process.env.NOMINATIM_URL ||
      'https://nominatim.openstreetmap.org',

    // ----------------------------------------------------------
    // GOOGLE PLACES
    // ----------------------------------------------------------

    googlePlaces:
      process.env.GOOGLE_PLACES_URL ||
      'https://places.googleapis.com/v1',

    // ----------------------------------------------------------
    // GLOBAL PETROL PRICES
    //
    // This is only a published/reference source.
    // It is NOT station-level pricing.
    // ----------------------------------------------------------

    globalPetrolPrices:
      process.env.GLOBAL_PETROL_PRICES_URL ||
      'https://www.globalpetrolprices.com',

    // ----------------------------------------------------------
    // EIA
    // ----------------------------------------------------------

    eia:
      process.env.EIA_URL ||
      'https://api.eia.gov/v2'
  },

  // ============================================================
  // API
  // ============================================================

  api: {
    version: 'v1',
    prefix: '/api/v1'
  },

  // ============================================================
  // LOGGING
  // ============================================================

  logLevel:
    process.env.LOG_LEVEL ||
    'dev'
}