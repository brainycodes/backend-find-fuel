import { app } from './app.js'
import { config } from './config/index.js'

const PORT = config.port
const HOST = config.host

const server = app.listen(PORT, HOST, () => {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║         🚀 FUEL FINDER BACKEND API           ║')
  console.log('╠══════════════════════════════════════════════╣')
  console.log(`║  📡 Server:    http://${HOST}:${PORT}          ║`)
  console.log(`║  🌍 Environment: ${config.nodeEnv.padEnd(23)}║`)
  console.log(`║  📊 API:       http://${HOST}:${PORT}/api/v1   ║`)
  console.log(`║  ❤️  Health:    http://${HOST}:${PORT}/api/v1/health ║`)
  console.log('╚══════════════════════════════════════════════╝')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received. Closing server...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

export default server