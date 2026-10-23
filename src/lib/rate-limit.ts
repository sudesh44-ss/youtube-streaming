import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export interface RateLimitPolicy {
  name: string;
  max: number;
  windowSeconds: number;
}

export const RATE_LIMIT_POLICIES = {
  LOGIN: { name: "auth_login", max: 5, windowSeconds: 60 },
  REGISTER: { name: "auth_register", max: 3, windowSeconds: 300 },
  PASSWORD_RESET: { name: "password_reset", max: 3, windowSeconds: 900 },
  PASSWORD_CHANGE: { name: "password_change", max: 5, windowSeconds: 300 },
  SEARCH: { name: "content_search", max: 60, windowSeconds: 60 },
  PROVIDER_TEST: { name: "provider_test", max: 10, windowSeconds: 60 },
  PROVIDER_MUTATION: { name: "provider_mutation", max: 10, windowSeconds: 60 },
  ACCOUNT_DELETION: { name: "account_deletion", max: 2, windowSeconds: 3600 },
} as const;

let redisClient: Redis | null = null;

export function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token && !url.includes("your-database-id") && !token.includes("your_upstash")) {
    return true;
  }
  return Boolean(process.env.REDIS_URL && !process.env.REDIS_URL.includes("placeholder"));
}

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  if (isRedisConfigured() && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    return redisClient;
  }

  return null;
}

// In-memory sliding window fallback for local testing & resilience when Redis credentials are not configured
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0].trim();
    if (firstIp && !firstIp.startsWith("unknown")) {
      return firstIp;
    }
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  reset: number;
  retryAfterSeconds: number;
}

/**
 * Distributed rate-limiting checker backed by Redis (or memory fallback when Redis is unconfigured).
 */
export async function checkRateLimit(
  identifier: string,
  policy: RateLimitPolicy
): Promise<RateLimitResult> {
  const key = `ratelimit:${policy.name}:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const client = getRedisClient();

  if (client) {
    try {
      // Atomic increment with window expiration
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, policy.windowSeconds);
      }

      const ttl = await client.ttl(key);
      const reset = now + (ttl > 0 ? ttl : policy.windowSeconds);
      const remaining = Math.max(0, policy.max - count);
      const success = count <= policy.max;

      return {
        success,
        remaining,
        limit: policy.max,
        reset,
        retryAfterSeconds: success ? 0 : Math.max(1, ttl > 0 ? ttl : policy.windowSeconds),
      };
    } catch (err) {
      console.warn(`Redis rate-limit check failed for ${key}, falling back safely:`, err);
      // Fall through to memory fallback
    }
  }

  // Resilient memory store fallback
  const record = memoryStore.get(key);
  if (!record || record.expiresAt <= now) {
    memoryStore.set(key, { count: 1, expiresAt: now + policy.windowSeconds });
    return {
      success: true,
      remaining: policy.max - 1,
      limit: policy.max,
      reset: now + policy.windowSeconds,
      retryAfterSeconds: 0,
    };
  }

  record.count += 1;
  const ttl = Math.max(1, record.expiresAt - now);
  const remaining = Math.max(0, policy.max - record.count);
  const success = record.count <= policy.max;

  return {
    success,
    remaining,
    limit: policy.max,
    reset: record.expiresAt,
    retryAfterSeconds: success ? 0 : ttl,
  };
}

/**
 * Standard HTTP 429 response helper with security headers
 */
export function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests. Please slow down and try again later.",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": result.retryAfterSeconds.toString(),
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": result.reset.toString(),
      },
    }
  );
}

/**
 * Reset helper for testing
 */
export function resetMemoryRateLimits() {
  memoryStore.clear();
}
