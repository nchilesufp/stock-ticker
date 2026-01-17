// Simple in-memory cache with TTL
class Cache {
  constructor() {
    this.cache = new Map();
    this.rateLimitUntil = null; // Track when rate limit expires (UTC midnight)
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

  // Set rate limit status - expires at next UTC midnight
  setRateLimited() {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
    this.rateLimitUntil = tomorrow.getTime();
    console.log('Rate limit set until:', new Date(this.rateLimitUntil).toISOString());
  }

  // Check if we're currently rate limited
  isRateLimited() {
    if (!this.rateLimitUntil) {
      return false;
    }
    
    if (Date.now() > this.rateLimitUntil) {
      // Rate limit expired, clear it
      this.rateLimitUntil = null;
      return false;
    }
    
    return true;
  }

  clear() {
    this.cache.clear();
    this.rateLimitUntil = null;
  }
}

// Singleton instance
const cache = new Cache();

module.exports = cache;
