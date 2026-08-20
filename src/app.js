import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import { config } from './config/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import routes from './routes/index.js'

// Initialize Express app
const app = express()

// ============================================
// SECURITY MIDDLEWARE
// ============================================
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}))

// CORS - Allow all origins for serverless
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400
}))

// ============================================
// GENERAL MIDDLEWARE
// ============================================
app.use(compression())
app.use(morgan(config.logLevel))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Trust proxy for rate limiting
app.set('trust proxy', 1)

// ============================================
// RATE LIMITING (disabled for serverless - doesn't work well)
// ============================================
// app.use('/api/', generalLimiter)

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    success: true,
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    }
  })
})

// ============================================
// API ROUTES
// ============================================
app.use('/api/v1', routes)

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.originalUrl} not found`,
      code: 404
    }
  })
})

// ============================================
// ERROR HANDLER
// ============================================
app.use(errorHandler)

export { app }