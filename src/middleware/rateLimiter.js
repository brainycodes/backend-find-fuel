import rateLimit from 'express-rate-limit'
import { config } from '../config/index.js'

/**
 * General rate limiter for all API routes
 */
export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      message: 'Too many requests. Please try again later.',
      code: 429,
      retryAfter: '15 minutes'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests. Please try again later.',
        code: 429,
        retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
      }
    })
  }
})

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  message: {
    success: false,
    error: {
      message: 'Rate limit exceeded for this endpoint.',
      code: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * Price report rate limiter
 */
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 reports per hour
  message: {
    success: false,
    error: {
      message: 'Too many price reports. Please wait before submitting another.',
      code: 429
    }
  }
})

/**
 * Create custom rate limiter
 */
export function createRateLimiter(options = {}) {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || {
      success: false,
      error: { message: 'Too many requests', code: 429 }
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...options
  })
}