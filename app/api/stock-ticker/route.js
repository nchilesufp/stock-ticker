import cache from '../../../lib/cache.js';

const STOCK_SYMBOL = process.env.STOCK_SYMBOL || 'AAPL'; // Default to AAPL if not set
const CACHE_TTL = 12; // 12 seconds to respect 5 calls/min limit
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
      return Response.json(
        {
          status: 'error',
          message: 'Service not available'
        },
        { status: 503 }
      );
    }

    // Check for rate limit message
    if (data['Note']) {
      // If we hit rate limit, try to return cached data even if expired
      const staleCache = cache.get(CACHE_KEY);
      if (staleCache) {
        return Response.json(staleCache);
      }
      
      return Response.json(
        {
          status: 'error',
          message: 'Service not available'
        },
        { status: 503 }
      );
    }

    // Parse response
    if (!data['Global Quote'] || Object.keys(data['Global Quote']).length === 0) {
      return Response.json(
        {
          status: 'error',
          message: 'Service not available'
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
      return Response.json(
        {
          status: 'error',
          message: 'Service not available'
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
    
    // Try to return stale cache on error
    const staleCache = cache.get(CACHE_KEY);
    if (staleCache) {
      return Response.json(staleCache);
    }

    return Response.json(
      {
        status: 'error',
        message: 'Service not available'
      },
      { status: 503 }
    );
  }
}
