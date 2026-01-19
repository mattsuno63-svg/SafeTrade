/**
 * Escrow Session Utilities - Helper functions for session management
 */

import { prisma } from '@/lib/db'
import { EscrowSessionStatus, UserRole } from '@prisma/client'
import { canTransitionStatus } from './state-machine'

/**
 * Transition session status with validation and audit logging
 */
export async function transitionSessionStatus(
  sessionId: string,
  newStatus: EscrowSessionStatus,
  performedById: string,
  performedByRole: UserRole,
  options?: {
    metadata?: Record<string, any>
    ipAddress?: string
    userAgent?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current session
    const session = await prisma.escrowSession.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    // Validate transition
    const validation = canTransitionStatus(
      session.status,
      newStatus,
      performedByRole
    )

    if (!validation.valid) {
      return { success: false, error: validation.reason || 'Invalid transition' }
    }

    // Perform transition
    const updated = await prisma.escrowSession.update({
      where: { id: sessionId },
      data: {
        status: newStatus,
        lastActivity: new Date(),
      },
    })

    // Create audit log
    await prisma.escrowAuditLog.create({
      data: {
        sessionId,
        actionType: `TRANSITION_${session.status}_TO_${newStatus}`,
        performedById,
        performedByRole,
        oldStatus: session.status,
        newStatus,
        metadata: options?.metadata || {},
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      },
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error transitioning session status:', error)
    return { success: false, error: error.message || 'Internal server error' }
  }
}

/**
 * Create audit event for session action
 */
export async function createAuditEvent(
  sessionId: string,
  actionType: string,
  performedById: string,
  performedByRole: UserRole,
  options?: {
    oldStatus?: EscrowSessionStatus
    newStatus?: EscrowSessionStatus
    metadata?: Record<string, any>
    ipAddress?: string
    userAgent?: string
  }
): Promise<void> {
  try {
    await prisma.escrowAuditLog.create({
      data: {
        sessionId,
        actionType,
        performedById,
        performedByRole,
        oldStatus: options?.oldStatus,
        newStatus: options?.newStatus,
        metadata: options?.metadata || {},
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      },
    })
  } catch (error: any) {
    console.error('Error creating audit event:', error)
    // Don't throw - audit logging failure shouldn't break main flow
  }
}

/**
 * Check if session is expired
 */
export function isSessionExpired(session: {
  status: EscrowSessionStatus
  expiredAt: Date | null
}): boolean {
  if (!session.expiredAt) return false
  
  const expiredStates: EscrowSessionStatus[] = ['BOOKED', 'CHECKIN_PENDING']
  if (!expiredStates.includes(session.status)) return false
  
  return new Date() > session.expiredAt
}

/**
 * Generate QR token for session check-in (secure, with crypto randomness)
 * Format: escrow_ck_{timestamp}_{randomHex}
 * - Uses crypto.randomBytes for cryptographic randomness
 * - Very low collision probability (timestamp + 16 random bytes = ~2^128 possibilities)
 */
export function generateQRToken(): string {
  const crypto = require('crypto')
  const timestamp = Date.now().toString(36)
  const randomBytes = crypto.randomBytes(16).toString('hex') // 32 hex characters
  return `escrow_ck_${timestamp}_${randomBytes}`
}

/**
 * Generate QR token with uniqueness check (retries if collision)
 * Max 3 attempts to avoid infinite loops
 */
export async function generateUniqueQRToken(
  maxAttempts: number = 3
): Promise<string> {
  const prisma = (await import('@/lib/db')).prisma
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const token = generateQRToken()
    
    // Check if token already exists
    const existing = await prisma.escrowSession.findUnique({
      where: { qrToken: token },
      select: { id: true },
    })
    
    if (!existing) {
      return token // Token is unique
    }
    
    // If this is the last attempt, throw error
    if (attempt === maxAttempts) {
      throw new Error(`Failed to generate unique QR token after ${maxAttempts} attempts`)
    }
    
    // Wait a small random time before retry (to avoid race conditions)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
  }
  
  throw new Error('Failed to generate unique QR token')
}

/**
 * Parse user role from Prisma UserRole enum
 */
export function parseUserRole(role: string): UserRole | null {
  const validRoles: UserRole[] = ['BUYER', 'SELLER', 'MERCHANT', 'ADMIN', 'MODERATOR', 'SYSTEM']
  return validRoles.includes(role as UserRole) ? (role as UserRole) : null
}

