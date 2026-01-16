import cache from '../../../lib/cache.js';

const STOCK_SYMBOL = process.env.STOCK_SYMBOL || 'AAPL'; // Default to AAPL if not set
// Increased cache TTL to 60 seconds to reduce API calls (free tier: 25 requests/day)
// This means max 1440 requests/day if called every second, but with 60s cache = max 1440/day
// With 15s client polling, that's 4 calls/min = 5760 calls/day theoretical max
// But cache reduces actual API calls to ~1440/day, still over limit
// Better: cache for 5 minutes (300s) = ~288 API calls/day max
const CACHE_TTL = 300; // 5 minutes - reduces API calls significantly for free tier
const CACHE_KEY = STOCK_SYMBOL.toLowerCase();

export async function GET() {
  try {
    // Check cache first
    const cached = cache.get(CACHE_KEY);
    if (cached) {
      return Response.json(cached);
    }

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
    
    const response = await fetch(apiUrl);
    
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
      console.warn('Alpha Vantage Information:', data['Information']);
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
            hasCache: false
          }
        },
        { status: 503 }
      );
    }

    // Check for rate limit message
    if (data['Note']) {
      console.warn('Alpha Vantage Rate Limit:', data['Note']);
      
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
            apiKeyConfigured: !!apiKey
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
