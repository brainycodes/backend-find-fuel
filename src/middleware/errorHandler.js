import { config } from '../config/index.js'

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

/**
 * Bad request error
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, 'BAD_REQUEST')
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(errors) {
    super('Validation failed', 400, 'VALIDATION_ERROR')
    this.errors = errors
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  })

  // Determine status code
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'
  let code = err.code || 'INTERNAL_ERROR'

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400
    code = 'VALIDATION_ERROR'
  }

  if (err.name === 'CastError') {
    statusCode = 400
    message = 'Invalid ID format'
    code = 'CAST_ERROR'
  }

  if (err.code === 'ECONNREFUSED') {
    statusCode = 503
    message = 'External service unavailable'
    code = 'SERVICE_UNAVAILABLE'
  }

  // Build response
  const response = {
    success: false,
    error: {
      message,
      code,
      status: statusCode
    }
  }

  // Add stack trace in development
  if (config.nodeEnv === 'development') {
    response.error.stack = err.stack
  }

  // Add validation errors if present
  if (err.errors) {
    response.error.details = err.errors
  }

  res.status(statusCode).json(response)
}

/**
 * Async error wrapper
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * 404 handler
 */
export function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Route ${req.originalUrl} not found`))
}