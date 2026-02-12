/**
 * Rate Limiting — Upstash Redis (produzione) + in-memory fallback (dev)
 *
 * Per attivare Redis, aggiungi in .env:
 *   UPSTASH_REDIS_REST_URL=https://...
 *   UPSTASH_REDIS_REST_TOKEN=...
 *
 * Senza queste env vars, il sistema usa un fallback in-memory
 * (funziona bene in sviluppo, NON affidabile su Vercel serverless).
 */

import { NextRequest } from 'next/server'

// ────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
}

// ────────────────────────────────────────────────────────────────
// REDIS STORE (Upstash)
// ────────────────────────────────────────────────────────────────

let redisClient: import('@upstash/redis').Redis | null = null

async function getRedisClient() {
  if (redisClient) return redisClient

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null

  try {
    const { Redis } = await import('@upstash/redis')
    redisClient = new Redis({ url, token })
    return redisClient
  } catch {
    console.warn('[rate-limit] Failed to initialize Upstash Redis, using in-memory fallback')
    return null
  }
}

async function checkRateLimitRedis(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const redis = await getRedisClient()
  if (!redis) return checkRateLimitMemory(key, config)

  const now = Date.now()
  const windowStart = now - config.windowMs
  const redisKey = `rl:${key}`

  try {
    // Sliding window con sorted set
    const pipeline = redis.pipeline()
    // Rimuovi entries scadute
    pipeline.zremrangebyscore(redisKey, 0, windowStart)
    // Conta entries nella finestra
    pipeline.zcard(redisKey)
    // Aggiungi il timestamp corrente
    pipeline.zadd(redisKey, { score: now, member: `${now}:${Math.random()}` })
    // Imposta TTL per cleanup automatico
    pipeline.pexpire(redisKey, config.windowMs)

    const results = await pipeline.exec()
    const currentCount = (results[1] as number) || 0

    if (currentCount >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + config.windowMs,
        limit: config.maxRequests,
      }
    }

    return {
      allowed: true,
      remaining: config.maxRequests - currentCount - 1,
      resetAt: now + config.windowMs,
      limit: config.maxRequests,
    }
  } catch (error) {
    console.error('[rate-limit] Redis error, falling back to memory:', error)
    return checkRateLimitMemory(key, config)
  }
}

// ────────────────────────────────────────────────────────────────
// IN-MEMORY STORE (fallback)
// ────────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup vecchie entries ogni 5 minuti
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

function checkRateLimitMemory(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
      limit: config.maxRequests,
    }
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      limit: config.maxRequests,
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
    limit: config.maxRequests,
  }
}

// ────────────────────────────────────────────────────────────────
// PUBLIC API
// ────────────────────────────────────────────────────────────────

/**
 * Check rate limit — usa Redis se disponibile, altrimenti in-memory.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const redis = await getRedisClient()
  if (redis) {
    return checkRateLimitRedis(key, config)
  }
  return checkRateLimitMemory(key, config)
}

/**
 * Versione sincrona per retrocompatibilità (usa solo in-memory).
 * Preferire la versione async dove possibile.
 */
export function checkRateLimitSync(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  return checkRateLimitMemory(key, config)
}

// ────────────────────────────────────────────────────────────────
// RATE LIMIT CONFIGS
// ────────────────────────────────────────────────────────────────

export const RATE_LIMITS = {
  // ── Auth (critico) ──
  LOGIN: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 5 tentativi / 15 min
  },
  SIGNUP: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 3 / ora
  },
  RESEND_VERIFICATION: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 3 / ora
  },
  // ── Upload ──
  UPLOAD: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 20 / ora
  },
  // ── QR Code ──
  QR_SCAN: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000,
  },
  // ── Pagamenti ──
  PAYMENT_HOLD: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
  },
  PAYMENT_RELEASE: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
  },
  PAYMENT_REFUND: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  },
  // ── Transazioni ──
  TRANSACTION_VERIFY: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000,
  },
  // ── Vault ──
  VAULT_SALES: {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000,
  },
  // ── Listings ──
  LISTING_CREATE: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
  },
  // ── Proposals ──
  PROPOSAL_CREATE: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000,
  },
  // ── Pagamenti creazione ──
  PAYMENT_CREATE: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
  },
  // ── Chat ──
  MESSAGE_SEND: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 30 / minuto
  },
  CONVERSATION_CREATE: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
  },
  // ── Contact form ──
  CONTACT: {
    maxRequests: 5,
    windowMs: 24 * 60 * 60 * 1000, // 5 / giorno
  },
} as const

// ────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────

/** Genera chiave rate limit per un utente autenticato */
export function getRateLimitKey(userId: string, endpoint: string): string {
  return `${endpoint}:${userId}`
}

/** Estrae IP dal request (supporta proxy / Vercel / Cloudflare) */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.ip ||
    'unknown'
  )
}

/** Genera chiave rate limit per IP (utenti non autenticati) */
export function getRateLimitKeyByIp(ip: string, endpoint: string): string {
  return `${endpoint}:ip:${ip}`
}

/** Aggiunge rate-limit headers alla response */
export function setRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult,
): void {
  headers.set('X-RateLimit-Limit', String(result.limit))
  headers.set('X-RateLimit-Remaining', String(result.remaining))
  headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))
}
