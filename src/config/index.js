import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env file
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../../.env') })

export const config = {
  // Server
  port: parseInt(process.env.PORT) || 5000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // API Keys
  eiaApiKey: process.env.EIA_API_KEY || null,
  
  // Cache
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 900,
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD) || 120
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'dev',
  
  // API
  api: {
    version: 'v1',
    prefix: '/api/v1'
  },
  
  // External APIs
  apis: {
    openstreetmap: 'https://overpass-api.de/api/interpreter',
    nominatim: 'https://nominatim.openstreetmap.org',
    eia: 'https://api.eia.gov/v2',
    ipapi: 'https://ipapi.co'
  }
}