// Inline cache to avoid module bundling issues in Cloudflare Workers
class Cache {
  constructor() {
    this.cache = new Map();
    this.rateLimitUntil = null;
  }

  set(key, value, ttlSeconds) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  getStale(key) {
    const item = this.cache.get(key);
    return item ? item.value : null;
  }

  setRateLimited() {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
    this.rateLimitUntil = tomorrow.getTime();
    console.log('Rate limit set until:', new Date(this.rateLimitUntil).toISOString());
  }

  isRateLimited() {
    if (!this.rateLimitUntil) return false;
    if (Date.now() > this.rateLimitUntil) {
      this.rateLimitUntil = null;
      return false;
    }
    return true;
  }

  getRateLimitUntil() {
    return this.rateLimitUntil;
  }
}

export async function GET() {
  // Initialize everything inside function to avoid module-level initialization issues
  const STOCK_SYMBOL = process.env.STOCK_SYMBOL || 'AAPL'; // Default to AAPL if not set
  const CACHE_TTL = 300; // 5 minutes - reduces API calls significantly for free tier
  const CACHE_KEY = STOCK_SYMBOL.toLowerCase();
  
  // Lazy singleton - initialize inside function to avoid bundling issues
  if (!globalThis.__stockTickerCache) {
    globalThis.__stockTickerCache = new Cache();
  }
  const cache = globalThis.__stockTickerCache;
  const requestStartTime = Date.now();
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] GET /api/stock-ticker - Request started`);
  
  try {
    // Check cache first
    const cached = cache.get(CACHE_KEY);
    if (cached) {
      const cacheAge = Math.floor((Date.now() - new Date(cached.timestamp || cached.lastRefreshed).getTime()) / 1000);
      console.log(`[${timestamp}] ✅ Cache HIT - returning cached data (age: ${cacheAge}s)`);
      return Response.json(cached);
    }
    console.log(`[${timestamp}] ❌ Cache MISS - no cached data available`);

    // Check if we're rate limited - if so, try to return stale cache and avoid API call
    const isRateLimited = cache.isRateLimited();
    const rateLimitUntil = cache.getRateLimitUntil();
    if (isRateLimited) {
      console.log(`[${timestamp}] ⚠️ Rate limit ACTIVE (until: ${rateLimitUntil ? new Date(rateLimitUntil).toISOString() : 'N/A'}) - checking for stale cache`);
      const staleCache = cache.getStale(CACHE_KEY);
      if (staleCache) {
        console.log(`[${timestamp}] ✅ Returning STALE cache due to active rate limit - NO API CALL MADE`);
        return Response.json(staleCache);
      }
      console.log(`[${timestamp}] ❌ Rate limited and no stale cache available - returning error WITHOUT API CALL`);
      
      return Response.json(
        {
          status: 'error',
          message: 'Service temporarily unavailable - API rate limit reached',
          debug: {
            stockSymbol: STOCK_SYMBOL,
            apiKeyConfigured: true,
            rateLimitActive: true,
            rateLimitUntil: rateLimitUntil ? new Date(rateLimitUntil).toISOString() : null
          }
        },
        { status: 503 }
      );
    }
    console.log(`[${timestamp}] ✅ Rate limit NOT active - proceeding with API call`);

    // Get API key from environment
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    
    if (!apiKey) {
      return Response.json(
        {
          status: 'error',
          message: 'API key not configured'
        },
        { status: 500 }
      );
    }

    // Fetch from Alpha Vantage
    const apiUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${STOCK_SYMBOL}&apikey=${apiKey}`;
    
    console.log(`[${new Date().toISOString()}] 🔴 *** MAKING ALPHA VANTAGE API CALL ***`);
    console.log(`[${new Date().toISOString()}] API URL: ${apiUrl.replace(/apikey=[^&]+/, 'apikey=***')}`);
    const apiCallStartTime = Date.now();
    const response = await fetch(apiUrl);
    const apiCallDuration = Date.now() - apiCallStartTime;
    const responseTimestamp = new Date().toISOString();
    console.log(`[${responseTimestamp}] Alpha Vantage API response received (status: ${response.status}, duration: ${apiCallDuration}ms)`);
    
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();

    // Check for Alpha Vantage API errors
    if (data['Error Message']) {
      console.error('Alpha Vantage API Error:', data['Error Message']);
      return Response.json(
        {
          status: 'error',
          message: 'Service not available',
          alphaVantageError: data['Error Message'],
          debug: {
            stockSymbol: STOCK_SYMBOL,
            apiKeyConfigured: !!apiKey
          }
        },
        { status: 503 }
      );
    }

    // Check for Alpha Vantage information/notice messages (often rate limit related)
    if (data['Information']) {
      const infoTimestamp = new Date().toISOString();
      console.warn(`[${infoTimestamp}] ⚠️⚠️⚠️ RATE LIMIT DETECTED - Alpha Vantage Information:`, data['Information']);
      console.warn(`[${infoTimestamp}] Setting rate limit flag - will prevent API calls until UTC midnight`);
      // Mark as rate limited to prevent future API calls until midnight UTC
      cache.setRateLimited();
      
      // Try to return cached data even if expired
      const staleCache = cache.getStale(CACHE_KEY);
      if (staleCache) {
        console.log('Returning stale cache due to rate limit');
        return Response.json(staleCache);
      }
      
      return Response.json(
        {
          status: 'error',
          message: 'Service temporarily unavailable - API rate limit reached',
          information: 'Daily API limit reached. Please try again later or upgrade to premium for higher limits.',
          debug: {
            stockSymbol: STOCK_SYMBOL,
            apiKeyConfigured: !!apiKey,
            hasCache: false,
            rateLimitSet: true
          }
        },
        { status: 503 }
      );
    }

    // Check for rate limit message
    if (data['Note']) {
      const noteTimestamp = new Date().toISOString();
      console.warn(`[${noteTimestamp}] ⚠️⚠️⚠️ RATE LIMIT DETECTED - Alpha Vantage Note:`, data['Note']);
      console.warn(`[${noteTimestamp}] Setting rate limit flag - will prevent API calls until UTC midnight`);
      
      // Mark as rate limited to prevent future API calls until midnight UTC
      cache.setRateLimited();
      
      // Sanitize the rate limit message to remove API key
      const sanitizedNote = data['Note'].replace(/API key as [A-Z0-9]+/gi, 'API key');
      
      // If we hit rate limit, try to return cached data even if expired
      const staleCache = cache.getStale(CACHE_KEY);
      if (staleCache) {
        console.log('Returning stale cache due to rate limit (Note)');
        return Response.json(staleCache);
      }
      
      return Response.json(
        {
          status: 'error',
          message: 'Service not available',
          rateLimit: sanitizedNote,
          debug: {
            stockSymbol: STOCK_SYMBOL,
            apiKeyConfigured: !!apiKey,
            rateLimitSet: true
          }
        },
        { status: 503 }
      );
    }

    // Parse response
    if (!data['Global Quote'] || Object.keys(data['Global Quote']).length === 0) {
      console.error('No Global Quote data received:', JSON.stringify(data));
      return Response.json(
        {
          status: 'error',
          message: 'Service not available',
          debug: {
            stockSymbol: STOCK_SYMBOL,
            apiKeyConfigured: !!apiKey,
            responseData: data
          }
        },
        { status: 503 }
      );
    }

    const quote = data['Global Quote'];
    
    const symbol = quote['01. symbol'];
    const price = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change']);
    const changePercent = quote['10. change percent'];
    const lastTradingDay = quote['07. latest trading day'];
    const timestamp = quote['06. timestamp'] || new Date().toISOString();

    // Validate data
    if (!symbol || isNaN(price)) {
      console.error('Invalid data received:', { symbol, price, quote });
      return Response.json(
        {
          status: 'error',
          message: 'Service not available',
          debug: {
            stockSymbol: STOCK_SYMBOL,
            receivedSymbol: symbol,
            receivedPrice: price
          }
        },
        { status: 503 }
      );
    }

    // Format response
    const result = {
      status: 'success',
      symbol,
      price: price.toFixed(2),
      change: change.toFixed(2),
      changePercent,
      lastTradingDay,
      timestamp: new Date().toISOString(),
      lastRefreshed: new Date().toISOString()
    };

    // Cache the result
    cache.set(CACHE_KEY, result, CACHE_TTL);
    const totalDuration = Date.now() - requestStartTime;
    const successTimestamp = new Date().toISOString();
    console.log(`[${successTimestamp}] ✅✅✅ SUCCESS - Stock data cached and returned (total duration: ${totalDuration}ms, cached for ${CACHE_TTL}s)`);

    return Response.json(result);

  } catch (error) {
    console.error('Stock ticker API error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      stockSymbol: STOCK_SYMBOL,
      apiKeyConfigured: !!process.env.ALPHA_VANTAGE_API_KEY
    });
    
    // Try to return stale cache on error
    const staleCache = cache.getStale(CACHE_KEY);
    if (staleCache) {
      console.log('Returning stale cache due to error');
      return Response.json(staleCache);
    }

    return Response.json(
      {
        status: 'error',
        message: 'Service not available',
        error: error.message,
        debug: {
          stockSymbol: STOCK_SYMBOL,
          apiKeyConfigured: !!process.env.ALPHA_VANTAGE_API_KEY
        }
      },
      { status: 503 }
    );
  }
}
