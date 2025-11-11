import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { NextRequest } from 'next/server';

// Rate limiters for different tiers
const rateLimiters = {
  // Anonymous users: 10 requests per minute
  anonymous: new RateLimiterMemory({
    points: 10,
    duration: 60,
  }),
  // Authenticated users: 100 requests per minute
  authenticated: new RateLimiterMemory({
    points: 100,
    duration: 60,
  }),
  // Pro users: 500 requests per minute
  pro: new RateLimiterMemory({
    points: 500,
    duration: 60,
  }),
  // API upload endpoints: 5 uploads per 5 minutes
  upload: new RateLimiterMemory({
    points: 5,
    duration: 300,
  }),
  // Auth endpoints: 5 attempts per 15 minutes
  auth: new RateLimiterMemory({
    points: 5,
    duration: 900,
  }),
};

export type RateLimitTier = keyof typeof rateLimiters;

function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from headers (Clerk adds this)
  const userId = request.headers.get('x-clerk-user-id');
  if (userId) return `user:${userId}`;

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
  return `ip:${ip}`;
}

export async function rateLimit(
  request: NextRequest,
  tier: RateLimitTier = 'anonymous'
): Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: Date;
  error?: string;
}> {
  const limiter = rateLimiters[tier];
  const identifier = getClientIdentifier(request);

  try {
    const result: RateLimiterRes = await limiter.consume(identifier);

    return {
      success: true,
      limit: limiter.points,
      remaining: result.remainingPoints,
      reset: new Date(Date.now() + result.msBeforeNext),
    };
  } catch (error) {
    if (error instanceof Error && 'msBeforeNext' in error) {
      const rateLimitError = error as RateLimiterRes;
      return {
        success: false,
        limit: limiter.points,
        remaining: 0,
        reset: new Date(Date.now() + rateLimitError.msBeforeNext),
        error: 'Rate limit exceeded',
      };
    }

    return {
      success: false,
      error: 'Rate limiting error',
    };
  }
}

export function rateLimitHeaders(result: Awaited<ReturnType<typeof rateLimit>>): Record<string, string> {
  if (!result.limit) return {};

  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': (result.remaining || 0).toString(),
    'X-RateLimit-Reset': result.reset?.toISOString() || '',
  };
}
