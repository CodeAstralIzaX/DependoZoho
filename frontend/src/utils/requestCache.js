/**
 * Request Deduplication Cache
 * Prevents duplicate API requests from being made simultaneously
 */

class RequestCache {
  constructor() {
    this.cache = new Map()
  }

  /**
   * Generate cache key from request parameters
   */
  generateKey(url, params = {}) {
    return `${url}:${JSON.stringify(params)}`
  }

  /**
   * Get cached request or execute new one
   */
  async getOrFetch(url, params, fetchFn) {
    const key = this.generateKey(url, params)

    // Return existing pending request if it exists
    if (this.cache.has(key)) {
      return this.cache.get(key)
    }

    // Create new request promise
    const promise = fetchFn()
      .then(response => {
        // Clean up cache after success
        this.cache.delete(key)
        return response
      })
      .catch(error => {
        // Clean up cache after error
        this.cache.delete(key)
        throw error
      })

    // Store promise in cache
    this.cache.set(key, promise)
    return promise
  }

  /**
   * Clear specific cache entry
   */
  clear(url, params) {
    const key = this.generateKey(url, params)
    this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clearAll() {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  size() {
    return this.cache.size
  }
}

// Export singleton instance
export default new RequestCache()
