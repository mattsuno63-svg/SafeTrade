import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export type SecurityEventType =
  | 'QR_SCAN_UNAUTHORIZED'
  | 'QR_SCAN_EXPIRED'
  | 'PAYMENT_ACCESS_UNAUTHORIZED'
  | 'VAULT_ACCESS_UNAUTHORIZED'
  | 'ESCROW_SESSION_ACCESS_UNAUTHORIZED'
  | 'ROLE_ACCESS_DENIED'
  | 'RATE_LIMIT_EXCEEDED'

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface LogSecurityEventParams {
  eventType: SecurityEventType
  attemptedById?: string
  endpoint: string
  method: string
  resourceId?: string
  resourceType?: string
  request?: NextRequest
  wasBlocked: boolean
  reason?: string
  severity?: SecuritySeverity
  metadata?: Record<string, unknown>
}

/**
 * Log security event to SecurityAuditLog
 * This function logs unauthorized access attempts and other security events
 */
export async function logSecurityEvent(params: LogSecurityEventParams) {
  try {
    const {
      eventType,
      attemptedById,
      endpoint,
      method,
      resourceId,
      resourceType,
      request,
      wasBlocked,
      reason,
      severity = 'MEDIUM',
      metadata,
    } = params

    // Extract IP and User-Agent from request
    const ipAddress = request?.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request?.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request?.headers.get('user-agent') || null

    // Sanitize request body (remove sensitive data)
    let requestBody: Record<string, unknown> | null = null
    if (request) {
      try {
        const clonedRequest = request.clone()
        const body = await clonedRequest.json().catch(() => null)
        if (body) {
          // Remove sensitive fields
          const sanitized = { ...body }
          delete sanitized.password
          delete sanitized.token
          delete sanitized.secret
          delete sanitized.apiKey
          requestBody = sanitized
        }
      } catch {
        // Ignore errors parsing body
      }
    }

    // Create audit log entry
    await prisma.securityAuditLog.create({
      data: {
        eventType,
        attemptedById: attemptedById || null,
        endpoint,
        method,
        resourceId: resourceId || null,
        resourceType: resourceType || null,
        ipAddress,
        userAgent,
        requestBody: requestBody ? (requestBody as any) : null,
        wasBlocked,
        reason: reason || null,
        severity,
        metadata: metadata ? (metadata as any) : null,
      },
    })

    // Log to console for immediate visibility
    console.warn(`[SECURITY AUDIT] ${eventType}`, {
      attemptedBy: attemptedById || 'anonymous',
      endpoint,
      method,
      resourceId,
      wasBlocked,
      reason,
      severity,
      ipAddress,
    })

    // Check if we should alert admin (critical events or multiple failed attempts)
    if (severity === 'CRITICAL' || (wasBlocked && severity === 'HIGH')) {
      await checkAndAlertAdmin(eventType, attemptedById, ipAddress)
    }
  } catch (error) {
    // Don't throw - logging should never break the application
    console.error('[Security Audit] Error logging security event:', error)
  }
}

/**
 * Check if we should alert admin about suspicious activity
 * Alerts if > 5 failed attempts in 10 minutes from same IP/user
 */
async function checkAndAlertAdmin(
  eventType: SecurityEventType,
  attemptedById: string | undefined,
  ipAddress: string
) {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

    // Count failed attempts in last 10 minutes
    const where: Record<string, unknown> = {
      eventType,
      wasBlocked: true,
      createdAt: { gte: tenMinutesAgo },
    }

    // Count by IP or user ID
    if (attemptedById) {
      where.attemptedById = attemptedById
    } else {
      where.ipAddress = ipAddress
    }

    const recentAttempts = await prisma.securityAuditLog.count({ where })

    // Alert if > 5 failed attempts
    if (recentAttempts >= 5) {
      // Create admin notification
      await prisma.adminNotification.create({
        data: {
          type: 'URGENT_ACTION',
          referenceType: 'SECURITY_AUDIT',
          referenceId: `ATTACK_${ipAddress}_${Date.now()}`,
          title: '🚨 Possibile attacco rilevato',
          message: `Rilevati ${recentAttempts} tentativi di accesso non autorizzati in 10 minuti. Tipo: ${eventType}. IP: ${ipAddress}${attemptedById ? `. Utente: ${attemptedById}` : ''}`,
          targetRoles: ['ADMIN'],
          priority: 'URGENT',
        },
      })

      console.error(`[SECURITY ALERT] Possible attack detected: ${recentAttempts} failed attempts in 10 minutes`, {
        eventType,
        attemptedById,
        ipAddress,
      })
    }
  } catch (error) {
    console.error('[Security Audit] Error checking for admin alert:', error)
  }
}

/**
 * Get security audit logs (for admin dashboard)
 */
export async function getSecurityAuditLogs(params: {
  eventType?: SecurityEventType
  attemptedById?: string
  ipAddress?: string
  severity?: SecuritySeverity
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}) {
  const {
    eventType,
    attemptedById,
    ipAddress,
    severity,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = params

  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (eventType) where.eventType = eventType
  if (attemptedById) where.attemptedById = attemptedById
  if (ipAddress) where.ipAddress = ipAddress
  if (severity) where.severity = severity

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate
  }

  const [logs, total] = await Promise.all([
    prisma.securityAuditLog.findMany({
      where,
      include: {
        attemptedBy: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.securityAuditLog.count({ where }),
  ])

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

