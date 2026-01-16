// Simple in-memory cache with TTL
class Cache {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, ttlSeconds) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, {
      value,
      expiresAt
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  // Get cache item even if expired (useful for rate limit scenarios)
  getStale(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Return value even if expired
    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

// Singleton instance
const cache = new Cache();

module.exports = cache;
