// utils/rateLimiter.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Rate limit configuration for different endpoints
 */
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: NextRequest) => string; // Custom key generation
}

/**
 * Endpoint-specific rate limit configurations
 */
const RATE_LIMIT_RULES: Record<string, RateLimitConfig> = {
  // Authentication endpoints - stricter limits
  "/api/auth/signin": {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: "Too many login attempts. Please try again later.",
  },
  "/api/auth/signup": {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: "Too many signup attempts. Please try again later.",
  },
  "/api/delete-account": {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 2,
    message: "Account deletion rate limit exceeded.",
  },
  // Evidence submission
  "/api/submit-evidence": {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: "Too many submissions. Please try again later.",
  },
  // General API endpoints
  "/api/": {
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: "Too many requests. Please slow down.",
  },
  // Public pages - more lenient
  "/": {
    windowMs: 60 * 1000, // 1 minute
    max: 60,
  },
};

/**
 * Simple LRU Cache implementation without external dependencies
 */
class SimpleLRUCache<K, V> {
  private cache: Map<K, { value: V; timestamp: number }> = new Map();
  private accessOrder: K[] = [];
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 10000, ttl: number = 24 * 60 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.delete(key);
      return undefined;
    }

    // Update access order
    this.updateAccessOrder(key);
    return item.value;
  }

  set(key: K, value: V): void {
    // Remove if exists to update position
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    // Add to cache
    this.cache.set(key, { value, timestamp: Date.now() });
    this.accessOrder.push(key);

    // Evict if over capacity
    while (this.cache.size > this.maxSize) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
  }

  delete(key: K): void {
    this.cache.delete(key);
    this.removeFromAccessOrder(key);
  }

  purgeStale(): void {
    const now = Date.now();
    const keysToDelete: K[] = [];

    // ES5-compatible iteration
    this.cache.forEach((item, key) => {
      if (now - item.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.delete(key));
  }

  private updateAccessOrder(key: K): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: K): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}

/**
 * In-memory store with LRU eviction and TTL
 * This is suitable for single-instance deployments
 */
class MemoryRateLimiter {
  private cache: SimpleLRUCache<string, { count: number; resetTime: number }>;

  constructor() {
    this.cache = new SimpleLRUCache(10000, 24 * 60 * 60 * 1000);

    // Periodic cleanup
    setInterval(
      () => {
        this.cleanup();
      },
      60 * 60 * 1000
    ); // Every hour
  }

  private cleanup() {
    this.cache.purgeStale();
  }

  async increment(
    key: string,
    windowMs: number
  ): Promise<{ allowed: boolean; count: number; resetTime: number }> {
    const now = Date.now();
    const record = this.cache.get(key);

    if (!record || now > record.resetTime) {
      const resetTime = now + windowMs;
      this.cache.set(key, { count: 1, resetTime });
      return { allowed: true, count: 1, resetTime };
    }

    record.count++;
    this.cache.set(key, record);

    return {
      allowed: record.count <= this.getRateLimit(key).max,
      count: record.count,
      resetTime: record.resetTime,
    };
  }

  private getRateLimit(key: string): RateLimitConfig {
    // Extract path from key to find matching rule
    const path = key.split(":")[1] || "/";

    // Find the most specific matching rule
    const patterns = Object.keys(RATE_LIMIT_RULES);
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      if (path.startsWith(pattern)) {
        return RATE_LIMIT_RULES[pattern];
      }
    }

    // Default fallback
    return RATE_LIMIT_RULES["/"];
  }

  reset(key: string): void {
    this.cache.delete(key);
  }
}

/**
 * Database-backed rate limiter for distributed environments
 * Uses Supabase to store rate limit data
 */
class DatabaseRateLimiter {
  private supabase: any;
  private memoryCache: SimpleLRUCache<
    string,
    { count: number; resetTime: number }
  >;

  constructor() {
    // Small memory cache to reduce database hits
    this.memoryCache = new SimpleLRUCache(1000, 10 * 1000); // 10 seconds TTL
  }

  private async getSupabase() {
    if (!this.supabase) {
      const { createClient } = await import("@/utils/supabase/server");
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  async increment(
    key: string,
    windowMs: number
  ): Promise<{ allowed: boolean; count: number; resetTime: number }> {
    const now = Date.now();

    // Check memory cache first
    const cached = this.memoryCache.get(key);
    if (cached && now < cached.resetTime) {
      cached.count++;
      this.memoryCache.set(key, cached);

      // Only update database every 5 requests to reduce load
      if (cached.count % 5 === 0) {
        this.updateDatabase(key, cached.count, cached.resetTime);
      }

      const limit = this.getRateLimit(key).max;
      return {
        allowed: cached.count <= limit,
        count: cached.count,
        resetTime: cached.resetTime,
      };
    }

    // Not in cache, check database
    const supabase = await this.getSupabase();
    const resetTime = now + windowMs;

    try {
      // Upsert rate limit record
      const { data, error } = await supabase.rpc("increment_rate_limit", {
        limit_key: key,
        window_ms: windowMs,
        current_time_ms: Math.floor(now),
      });

      if (error) {
        console.error("Rate limit database error:", error);
        // Fallback to allowing the request on database error
        return { allowed: true, count: 1, resetTime };
      }

      const record = {
        count: data.request_count,
        resetTime: data.reset_time,
      };

      // Update memory cache
      this.memoryCache.set(key, record);

      const limit = this.getRateLimit(key).max;
      return {
        allowed: record.count <= limit,
        count: record.count,
        resetTime: record.resetTime,
      };
    } catch (error) {
      console.error("Rate limit error:", error);
      // Allow request on error to avoid blocking legitimate users
      return { allowed: true, count: 1, resetTime };
    }
  }

  private async updateDatabase(key: string, count: number, resetTime: number) {
    try {
      const supabase = await this.getSupabase();
      await supabase.from("rate_limits").upsert({
        key,
        count,
        reset_time: new Date(resetTime).toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to update rate limit in database:", error);
    }
  }

  private getRateLimit(key: string): RateLimitConfig {
    const path = key.split(":")[1] || "/";

    const patterns = Object.keys(RATE_LIMIT_RULES);
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      if (path.startsWith(pattern)) {
        return RATE_LIMIT_RULES[pattern];
      }
    }

    return RATE_LIMIT_RULES["/"];
  }

  async reset(key: string): Promise<void> {
    this.memoryCache.delete(key);

    try {
      const supabase = await this.getSupabase();
      await supabase.from("rate_limits").delete().eq("key", key);
    } catch (error) {
      console.error("Failed to reset rate limit:", error);
    }
  }

  // Cleanup old records
  async cleanup(): Promise<void> {
    try {
      const supabase = await this.getSupabase();
      const oneDayAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();

      await supabase.from("rate_limits").delete().lt("reset_time", oneDayAgo);
    } catch (error) {
      console.error("Failed to cleanup rate limits:", error);
    }
  }
}

/**
 * Rate limiter instance - choose based on your deployment
 */
const rateLimiter =
  process.env.USE_DATABASE_RATE_LIMIT === "true"
    ? new DatabaseRateLimiter()
    : new MemoryRateLimiter();

/**
 * Generate rate limit key from request
 */
function generateKey(req: NextRequest, config?: RateLimitConfig): string {
  if (config?.keyGenerator) {
    return config.keyGenerator(req);
  }

  // Get identifier (IP address or user ID)
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : "unknown";
  const userId = req.headers.get("x-user-id"); // Set by your auth middleware

  const identifier = userId || ip;
  const path = req.nextUrl.pathname;

  return `rate_limit:${path}:${identifier}`;
}

/**
 * Rate limiting middleware function
 */
export async function rateLimit(
  req: NextRequest
): Promise<NextResponse | null> {
  // Skip rate limiting for static assets
  const path = req.nextUrl.pathname;
  if (
    path.startsWith("/_next/") ||
    path.includes(".") ||
    path.startsWith("/favicon")
  ) {
    return null;
  }

  // Find applicable rate limit config
  let config: RateLimitConfig = RATE_LIMIT_RULES["/"];
  const patterns = Object.keys(RATE_LIMIT_RULES);
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    if (path.startsWith(pattern)) {
      config = RATE_LIMIT_RULES[pattern];
      break;
    }
  }

  // Generate rate limit key
  const key = generateKey(req, config);

  // Check rate limit
  const { allowed, count, resetTime } = await rateLimiter.increment(
    key,
    config.windowMs
  );

  // Add rate limit headers
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", config.max.toString());
  headers.set(
    "X-RateLimit-Remaining",
    Math.max(0, config.max - count).toString()
  );
  headers.set("X-RateLimit-Reset", new Date(resetTime).toISOString());

  if (!allowed) {
    headers.set(
      "Retry-After",
      Math.ceil((resetTime - Date.now()) / 1000).toString()
    );

    return new NextResponse(
      JSON.stringify({
        error: config.message || "Too many requests",
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers,
      }
    );
  }

  // Request allowed - return null to continue
  return null;
}

/**
 * Reset rate limit for a specific user/IP
 */
export async function resetRateLimit(
  identifier: string,
  path: string = "/"
): Promise<void> {
  const key = `rate_limit:${path}:${identifier}`;
  await rateLimiter.reset(key);
}

/**
 * Express/Connect style middleware wrapper
 */
export function rateLimitMiddleware(config?: Partial<RateLimitConfig>) {
  return async (req: NextRequest) => {
    const customConfig = config
      ? { ...RATE_LIMIT_RULES["/"], ...config }
      : undefined;

    if (customConfig) {
      const key = generateKey(req, customConfig);
      const { allowed, count, resetTime } = await rateLimiter.increment(
        key,
        customConfig.windowMs
      );

      if (!allowed) {
        return new NextResponse(
          JSON.stringify({
            error: customConfig.message || "Too many requests",
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
          }),
          { status: 429 }
        );
      }
    }

    return rateLimit(req);
  };
}

// Export types
export type { RateLimitConfig };
export { rateLimiter };
