import { env } from "@/lib/env";

interface RateLimitRecord {
  timestamps: number[];
}

// In-memory sliding window cache
const memoryStore = new Map<string, RateLimitRecord>();

// Cleanup stale records periodically
setInterval(() => {
  const now = Date.now();
  memoryStore.forEach((record, key) => {
    record.timestamps = record.timestamps.filter((ts: number) => now - ts < 60000);
    if (record.timestamps.length === 0) {
      memoryStore.delete(key);
    }
  });
}, 60000);

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Sliding-window rate limiter for protecting free-tier APIs.
 *
 * @param identifier Unique client ID (e.g., client IP or User ID)
 * @param maxRequests Maximum allowed requests in the time window
 * @param windowMs Time window in milliseconds (default: 60,000ms = 1 minute)
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 15,
  windowMs: number = 60000
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = memoryStore.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(identifier, record);
  }

  // Filter out timestamps outside current window
  record.timestamps = record.timestamps.filter((ts: number) => ts > windowStart);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const resetTime = oldest + windowMs;
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: Math.ceil((resetTime - now) / 1000),
    };
  }

  // Record current request timestamp
  record.timestamps.push(now);

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - record.timestamps.length,
    reset: Math.ceil(windowMs / 1000),
  };
}
