// Hybrid cache that uses Cloudflare KV in production and in-memory for local dev
class Cache {
  constructor() {
    this.cache = new Map(); // Fallback in-memory cache
    this.rateLimitUntil = null;
    this.kv = null; // Will be set via setKV()
  }

  // Set the KV binding (called from route with Cloudflare context)
  setKV(kvBinding) {
    this.kv = kvBinding;
  }

  async set(key, value, ttlSeconds) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    const item = { value, expiresAt };

    // Always set in-memory cache for fast access
    this.cache.set(key, item);

    // Also set in KV if available (persistent across edge nodes)
    if (this.kv) {
      try {
        await this.kv.put(key, JSON.stringify(item), {
          expirationTtl: ttlSeconds
        });
      } catch (error) {
        console.error('KV put error:', error);
        // Continue with in-memory cache
      }
    }
  }

  async get(key) {
    // Check in-memory cache first (fastest)
    let item = this.cache.get(key);

    if (!item && this.kv) {
      // Try KV if not in memory
      try {
        const kvData = await this.kv.get(key);
        if (kvData) {
          item = JSON.parse(kvData);
          // Populate in-memory cache
          this.cache.set(key, item);
        }
      } catch (error) {
        console.error('KV get error:', error);
        // Fall through to return null
      }
    }

    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      await this.delete(key);
      return null;
    }

    return item.value;
  }

  // Get cached value even if expired (for rate limit fallback)
  async getStale(key) {
    // Check in-memory first
    let item = this.cache.get(key);

    if (!item && this.kv) {
      // Try KV
      try {
        const kvData = await this.kv.get(key);
        if (kvData) {
          item = JSON.parse(kvData);
        }
      } catch (error) {
        console.error('KV getStale error:', error);
      }
    }

    return item ? item.value : null;
  }

  async delete(key) {
    this.cache.delete(key);
    if (this.kv) {
      try {
        await this.kv.delete(key);
      } catch (error) {
        console.error('KV delete error:', error);
      }
    }
  }

  // Set rate limit flag to prevent API calls until specified time
  async setRateLimited(untilTimestamp) {
    this.rateLimitUntil = untilTimestamp;

    // Store in KV so it's shared across all edge nodes
    if (this.kv) {
      try {
        const ttlSeconds = Math.ceil((untilTimestamp - Date.now()) / 1000);
        await this.kv.put('__rate_limit_until__', untilTimestamp.toString(), {
          expirationTtl: Math.max(ttlSeconds, 60) // At least 60 seconds
        });
      } catch (error) {
        console.error('KV setRateLimited error:', error);
      }
    }
  }

  // Check if we're currently rate limited
  async isRateLimited() {
    // Check in-memory first
    if (this.rateLimitUntil && Date.now() < this.rateLimitUntil) {
      return true;
    }

    // Check KV for shared rate limit state
    if (this.kv) {
      try {
        const kvRateLimit = await this.kv.get('__rate_limit_until__');
        if (kvRateLimit) {
          const untilTimestamp = parseInt(kvRateLimit, 10);
          if (Date.now() < untilTimestamp) {
            this.rateLimitUntil = untilTimestamp; // Sync to in-memory
            return true;
          }
        }
      } catch (error) {
        console.error('KV isRateLimited error:', error);
      }
    }

    // Rate limit period expired or not set
    this.rateLimitUntil = null;
    return false;
  }

  clear() {
    this.cache.clear();
    // Note: We don't clear KV here to avoid accidental data loss
  }
}

// Singleton instance
const cache = new Cache();

module.exports = cache;
