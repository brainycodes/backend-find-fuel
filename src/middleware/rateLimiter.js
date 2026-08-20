import rateLimit from 'express-rate-limit'

/**
 * General rate limiter - disabled for serverless
 * Vercel has its own rate limiting built-in
 */
export const generalLimiter = (req, res, next) => next()

/**
 * Strict rate limiter - disabled for serverless
 */
export const strictLimiter = (req, res, next) => next()

/**
 * Price report rate limiter - disabled for serverless
 */
export const reportLimiter = (req, res, next) => next()

/**
 * Create custom rate limiter - returns no-op for serverless
 */
export function createRateLimiter(options = {}) {
  return (req, res, next) => next()
}