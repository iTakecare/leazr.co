/**
 * Rate limiting for GoCardless endpoints
 * Uses the existing rate_limit_requests table with atomic increments
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

// Default rate limits for GoCardless endpoints
export const GOCARDLESS_RATE_LIMITS = {
  // Webhook: Higher limit (GoCardless can send many events)
  webhook: { maxRequests: 100, windowSeconds: 60 },
  
  // OAuth routes: Lower limit to prevent abuse
  oauthStart: { maxRequests: 10, windowSeconds: 60 },
  oauthCallback: { maxRequests: 10, windowSeconds: 60 },
  
  // API routes: Moderate limit
  createMandate: { maxRequests: 20, windowSeconds: 60 },
  completeFlow: { maxRequests: 20, windowSeconds: 60 },
  reconcile: { maxRequests: 5, windowSeconds: 300 }, // Admin action, lower limit
  verificationStatus: { maxRequests: 30, windowSeconds: 60 }
} as const;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: Date;
}

/**
 * Check rate limit using atomic database operation
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);

  try {
    // Use atomic function to prevent race conditions
    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_window_start: windowStart.toISOString(),
      p_max_requests: config.maxRequests
    });

    if (error) {
      console.error('[RateLimit] Database error:', { endpoint, error: error.message });
      // Allow on error to prevent blocking legitimate requests
      return { allowed: true, remaining: config.maxRequests };
    }

    const result = data?.[0];
    if (!result) {
      return { allowed: true, remaining: config.maxRequests };
    }

    return {
      allowed: result.allowed,
      remaining: Math.max(0, result.remaining),
      resetAt: new Date(now.getTime() + config.windowSeconds * 1000)
    };
  } catch (error) {
    console.error('[RateLimit] Exception:', { endpoint, error: error instanceof Error ? error.message : 'Unknown' });
    // Allow on error
    return { allowed: true, remaining: config.maxRequests };
  }
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult, config: RateLimitConfig): Record<string, string> {
  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt ? Math.floor(result.resetAt.getTime() / 1000).toString() : ''
  };
}

/**
 * Get identifier for rate limiting
 * - For webhooks: use signature prefix or IP
 * - For authenticated requests: use user ID
 * - For OAuth: use IP address
 */
export function getRateLimitIdentifier(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  // Try to get client IP from various headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return `ip:${forwardedFor.split(',')[0].trim()}`;
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return `ip:${realIp}`;
  }
  
  // Fallback to a generic identifier
  return 'ip:unknown';
}
