import NodeCache from 'node-cache'
import { config } from '../config/index.js'

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: config.cache.ttl,
      checkperiod: config.cache.checkPeriod,
      useClones: false,
      deleteOnExpire: true,
      maxKeys: 1000
    })
    
    this.stats = {
      hits: 0,
      misses: 0
    }
  }

  /**
   * Get value from cache
   */
  get(key) {
    const value = this.cache.get(key)
    if (value !== undefined) {
      this.stats.hits++
      return value
    }
    this.stats.misses++
    return null
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = null) {
    const success = this.cache.set(key, value, ttl || config.cache.ttl)
    return success
  }

  /**
   * Delete key from cache
   */
  del(key) {
    return this.cache.del(key)
  }

  /**
   * Check if key exists
   */
  has(key) {
    return this.cache.has(key)
  }

  /**
   * Get multiple keys
   */
  mget(keys) {
    return this.cache.mget(keys)
  }

  /**
   * Set multiple keys
   */
  mset(keyValuePairs) {
    return this.cache.mset(keyValuePairs)
  }

  /**
   * Get or set (fetch if not in cache)
   */
  async getOrSet(key, fetchFn, ttl = null) {
    const cached = this.get(key)
    if (cached !== null) return cached
    
    const value = await fetchFn()
    this.set(key, value, ttl)
    return value
  }

  /**
   * Flush all cache
   */
  flush() {
    return this.cache.flushAll()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const cacheStats = this.cache.getStats()
    return {
      ...cacheStats,
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    }
  }

  /**
   * Get all keys
   */
  keys() {
    return this.cache.keys()
  }

  /**
   * Get TTL of a key
   */
  getTtl(key) {
    return this.cache.getTtl(key)
  }
}

// Singleton instance
export const cacheService = new CacheService()

export default cacheService