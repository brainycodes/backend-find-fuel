import NodeCache from 'node-cache'
import { config } from '../config/index.js'

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: config.cache.ttl,
      checkperiod: config.cache.checkPeriod,
      useClones: false,
      deleteOnExpire: true,
      maxKeys: 500
    })
    
    this.stats = {
      hits: 0,
      misses: 0
    }
  }

  get(key) {
    const value = this.cache.get(key)
    if (value !== undefined) {
      this.stats.hits++
      return value
    }
    this.stats.misses++
    return null
  }

  set(key, value, ttl = null) {
    return this.cache.set(key, value, ttl || config.cache.ttl)
  }

  del(key) {
    return this.cache.del(key)
  }

  has(key) {
    return this.cache.has(key)
  }

  mget(keys) {
    return this.cache.mget(keys)
  }

  mset(keyValuePairs) {
    return this.cache.mset(keyValuePairs)
  }

  async getOrSet(key, fetchFn, ttl = null) {
    const cached = this.get(key)
    if (cached !== null) return cached
    
    const value = await fetchFn()
    this.set(key, value, ttl)
    return value
  }

  flush() {
    return this.cache.flushAll()
  }

  getStats() {
    const cacheStats = this.cache.getStats()
    return {
      ...cacheStats,
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    }
  }

  keys() {
    return this.cache.keys()
  }

  getTtl(key) {
    return this.cache.getTtl(key)
  }
}

export const cacheService = new CacheService()

export default cacheService