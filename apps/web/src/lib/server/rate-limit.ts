export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const hits = new Map<string, number[]>();
  return function check(key: string, now = Date.now()): RateLimitResult {
    const windowStart = now - options.windowMs;
    const timestamps = (hits.get(key) ?? []).filter((timestamp) => timestamp > windowStart);
    if (timestamps.length >= options.maxRequests) {
      hits.set(key, timestamps);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((timestamps[0] + options.windowMs - now) / 1000))
      };
    }
    timestamps.push(now);
    hits.set(key, timestamps);
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

const PUBLIC_ROUTE_LIMITS = {
  search: createRateLimiter({ windowMs: 60_000, maxRequests: 30 }),
  clickout: createRateLimiter({ windowMs: 60_000, maxRequests: 60 })
} as const;

export type PublicRateLimitedRoute = keyof typeof PUBLIC_ROUTE_LIMITS;

export function checkPublicRateLimit(route: PublicRateLimitedRoute, key: string): RateLimitResult {
  return PUBLIC_ROUTE_LIMITS[route](key);
}
