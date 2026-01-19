// Note: OpenNext Cloudflare uses Node.js runtime (edge runtime not yet supported)
// Using in-memory cache (won't persist across worker instances, but works)

import cache from '../../../lib/cache.js';

const STOCK_SYMBOL = process.env.STOCK_SYMBOL || 'AAPL'; // Default to AAPL if not set
const CACHE_TTL = 3600; // 1 hour - limit to 1 call per hour to Alpha Vantage API
const CACHE_KEY = STOCK_SYMBOL.toLowerCase();

export async function GET(request) {
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
          symbol: STOCK_SYMBOL
        },
        { status: 503 }
      );
    }

    // Check for rate limit or information messages (rate limiting)
    if (data['Note'] || data['Information']) {
      const message = data['Note'] || data['Information'];
      console.warn('Alpha Vantage Rate Limit:', message);
      // If we hit rate limit, try to return cached data even if expired
      const staleCache = cache.get(CACHE_KEY);
      if (staleCache) {
        return Response.json(staleCache);
      }
      
      return Response.json(
        {
          status: 'error',
          message: 'Service not available',
          rateLimit: true,
          note: message
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
          reason: 'No quote data',
          responseData: data
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
          reason: 'Invalid data format',
          symbol,
          price
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
    console.error('Error stack:', error.stack);
    
    // Try to return stale cache on error
    const staleCache = cache.get(CACHE_KEY);
    if (staleCache) {
      return Response.json(staleCache);
    }

    return Response.json(
      {
        status: 'error',
        message: 'Service not available',
        error: error.message,
        errorType: error.constructor.name,
        apiKeyConfigured: !!process.env.ALPHA_VANTAGE_API_KEY,
        stockSymbol: STOCK_SYMBOL
      },
      { status: 503 }
    );
  }
}
