/**
 * Simple in-memory rate limiting utility
 * For production, consider using Redis for distributed rate limiting
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (for single-instance deployments)
// For multi-instance, use Redis instead
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000) // 5 minutes

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
}

/**
 * Check if request is within rate limit
 * @param key - Unique identifier (e.g., userId, IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // If no entry or expired, create new entry
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    }
    rateLimitStore.set(key, newEntry)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
      limit: config.maxRequests,
    }
  }

  // Entry exists and not expired
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      limit: config.maxRequests,
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
    limit: config.maxRequests,
  }
}

/**
 * Predefined rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // QR Code scanning
  QR_SCAN: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Payment operations
  PAYMENT_HOLD: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  PAYMENT_RELEASE: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  PAYMENT_REFUND: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Transaction verification
  TRANSACTION_VERIFY: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Vault sales
  VAULT_SALES: {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Listing creation
  LISTING_CREATE: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Proposal creation
  PROPOSAL_CREATE: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Payment creation
  PAYMENT_CREATE: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Chat messages
  MESSAGE_SEND: {
    maxRequests: 30,  // 30 messaggi
    windowMs: 60 * 1000,  // per minuto
  },
  CONVERSATION_CREATE: {
    maxRequests: 10,  // 10 nuove conversazioni
    windowMs: 60 * 60 * 1000,  // per ora
  },
} as const

/**
 * Get rate limit key for a user
 */
export function getRateLimitKey(userId: string, endpoint: string): string {
  return `${endpoint}:${userId}`
}

