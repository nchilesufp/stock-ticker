// Admin endpoint to clear rate limit flag
import { getCloudflareContext } from '@opennextjs/cloudflare';
import cache from '../../../lib/cache.js';

export async function GET(request) {
  try {
    // Get Cloudflare KV binding
    try {
      const { env } = getCloudflareContext();
      if (env.KV) {
        cache.setKV(env.KV);
      }
    } catch (error) {
      console.log('KV not available');
    }

    // Delete the rate limit flag
    if (cache.kv) {
      await cache.kv.delete('__rate_limit_until__');
      console.log('Deleted __rate_limit_until__ from KV');
    }

    // Also clear in-memory
    cache.rateLimitUntil = null;

    return Response.json({
      status: 'success',
      message: 'Rate limit flag cleared'
    });
  } catch (error) {
    console.error('Error clearing rate limit:', error);
    return Response.json(
      {
        status: 'error',
        message: error.message
      },
      { status: 500 }
    );
  }
}
