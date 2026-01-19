/**
 * Escrow Session State Machine - Enforces valid state transitions
 */

import { EscrowSessionStatus } from '@prisma/client'

export type UserRole = 'BUYER' | 'SELLER' | 'MERCHANT' | 'ADMIN' | 'MODERATOR' | 'SYSTEM'

/**
 * Valid state transitions for EscrowSession
 */
const validTransitions: Record<EscrowSessionStatus, EscrowSessionStatus[]> = {
  CREATED: ['BOOKED', 'CANCELLED'],
  BOOKED: ['CHECKIN_PENDING', 'EXPIRED', 'CANCELLED'],
  CHECKIN_PENDING: ['CHECKED_IN', 'EXPIRED'],
  CHECKED_IN: ['VERIFICATION_IN_PROGRESS'],
  VERIFICATION_IN_PROGRESS: ['VERIFICATION_PASSED', 'VERIFICATION_FAILED', 'DISPUTED'],
  VERIFICATION_PASSED: ['RELEASE_REQUESTED', 'DISPUTED'],
  VERIFICATION_FAILED: ['DISPUTED'],
  RELEASE_REQUESTED: ['RELEASE_APPROVED', 'DISPUTED'],
  RELEASE_APPROVED: ['COMPLETED'],
  COMPLETED: [], // Terminal
  DISPUTED: ['VERIFICATION_IN_PROGRESS', 'VERIFICATION_PASSED', 'RELEASE_REQUESTED'], // Can be resolved
  CANCELLED: [], // Terminal
  EXPIRED: ['CHECKIN_PENDING', 'CANCELLED'], // Can be extended or cancelled
}

/**
 * Who can perform each transition
 */
const transitionPermissions: Record<string, UserRole[]> = {
  'CREATED->BOOKED': ['BUYER', 'SELLER'],
  'BOOKED->CHECKIN_PENDING': ['SYSTEM'], // Auto
  'CHECKIN_PENDING->CHECKED_IN': ['MERCHANT'],
  'CHECKIN_PENDING->EXPIRED': ['SYSTEM'], // Auto timeout
  'BOOKED->EXPIRED': ['SYSTEM'], // Auto timeout
  'CHECKED_IN->VERIFICATION_IN_PROGRESS': ['MERCHANT'],
  'VERIFICATION_IN_PROGRESS->VERIFICATION_PASSED': ['MERCHANT'],
  'VERIFICATION_IN_PROGRESS->VERIFICATION_FAILED': ['MERCHANT'],
  'VERIFICATION_PASSED->RELEASE_REQUESTED': ['BUYER', 'SELLER', 'MERCHANT'],
  'RELEASE_REQUESTED->RELEASE_APPROVED': ['ADMIN', 'MODERATOR'],
  'RELEASE_APPROVED->COMPLETED': ['SYSTEM'], // Auto
  'CREATED->CANCELLED': ['BUYER', 'SELLER'],
  'BOOKED->CANCELLED': ['BUYER', 'SELLER'],
  'EXPIRED->CHECKIN_PENDING': ['MERCHANT', 'ADMIN'], // Extension
  'EXPIRED->CANCELLED': ['MERCHANT', 'ADMIN'],
  // DISPUTED can be opened from any state (handled separately)
}

/**
 * Check if a state transition is valid
 */
export function canTransitionStatus(
  currentStatus: EscrowSessionStatus,
  newStatus: EscrowSessionStatus,
  userRole?: UserRole
): { valid: boolean; reason?: string } {
  // DISPUTED can be opened from any state (except terminal states)
  if (newStatus === 'DISPUTED') {
    const terminalStates: EscrowSessionStatus[] = ['COMPLETED', 'CANCELLED']
    if (terminalStates.includes(currentStatus)) {
      return {
        valid: false,
        reason: `Cannot open dispute from terminal state ${currentStatus}`,
      }
    }
    return { valid: true }
  }

  const allowed = validTransitions[currentStatus] || []
  
  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      reason: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowed.join(', ')}`,
    }
  }

  // Check permissions if userRole is provided
  if (userRole) {
    const transitionKey = `${currentStatus}->${newStatus}`
    const allowedRoles = transitionPermissions[transitionKey] || []
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      return {
        valid: false,
        reason: `User role ${userRole} cannot perform transition ${transitionKey}. Allowed roles: ${allowedRoles.join(', ')}`,
      }
    }
  }

  return { valid: true }
}

/**
 * Check if a specific action can be performed from current status
 */
export function canPerformAction(
  currentStatus: EscrowSessionStatus,
  action: 'CHECK_IN' | 'START_VERIFICATION' | 'PASS_VERIFICATION' | 'FAIL_VERIFICATION' | 'REQUEST_RELEASE' | 'APPROVE_RELEASE' | 'EXTEND_SESSION' | 'CLOSE_SESSION',
  userRole?: UserRole
): { valid: boolean; reason?: string } {
  const actionTransitions: Record<string, EscrowSessionStatus> = {
    CHECK_IN: 'CHECKED_IN',
    START_VERIFICATION: 'VERIFICATION_IN_PROGRESS',
    PASS_VERIFICATION: 'VERIFICATION_PASSED',
    FAIL_VERIFICATION: 'VERIFICATION_FAILED',
    REQUEST_RELEASE: 'RELEASE_REQUESTED',
    APPROVE_RELEASE: 'RELEASE_APPROVED',
    EXTEND_SESSION: 'CHECKIN_PENDING',
    CLOSE_SESSION: 'CANCELLED',
  }

  const newStatus = actionTransitions[action]
  if (!newStatus) {
    return {
      valid: false,
      reason: `Unknown action: ${action}`,
    }
  }

  // Special handling for EXTEND_SESSION (from EXPIRED)
  if (action === 'EXTEND_SESSION' && currentStatus !== 'EXPIRED') {
    return {
      valid: false,
      reason: `Can only extend session from EXPIRED state, current state is ${currentStatus}`,
    }
  }

  // Special handling for CLOSE_SESSION (from any non-terminal state by merchant/admin)
  if (action === 'CLOSE_SESSION') {
    const terminalStates: EscrowSessionStatus[] = ['COMPLETED', 'CANCELLED']
    if (terminalStates.includes(currentStatus)) {
      return {
        valid: false,
        reason: `Cannot close session from terminal state ${currentStatus}`,
      }
    }
    if (userRole && !['MERCHANT', 'ADMIN'].includes(userRole)) {
      return {
        valid: false,
        reason: `Only MERCHANT or ADMIN can close session, current role is ${userRole}`,
      }
    }
    return { valid: true }
  }

  return canTransitionStatus(currentStatus, newStatus, userRole)
}

/**
 * Validate check-in can be performed (requires both buyer and seller present)
 */
export function canCheckIn(buyerPresent: boolean, sellerPresent: boolean): { valid: boolean; reason?: string } {
  if (!buyerPresent || !sellerPresent) {
    return {
      valid: false,
      reason: `Both buyer and seller must be present. Buyer: ${buyerPresent}, Seller: ${sellerPresent}`,
    }
  }
  return { valid: true }
}

/**
 * Validate verification can be completed (requires minimum 3 photos)
 */
export function canCompleteVerification(photoCount: number): { valid: boolean; reason?: string } {
  if (photoCount < 3) {
    return {
      valid: false,
      reason: `Verification requires minimum 3 photos, provided ${photoCount}`,
    }
  }
  return { valid: true }
}

/**
 * Get allowed transitions from current status
 */
export function getAllowedTransitions(currentStatus: EscrowSessionStatus): EscrowSessionStatus[] {
  return validTransitions[currentStatus] || []
}

/**
 * Check if status is terminal (no further transitions possible)
 */
export function isTerminalStatus(status: EscrowSessionStatus): boolean {
  return ['COMPLETED', 'CANCELLED'].includes(status)
}

/**
 * Check if status allows booking operations
 */
export function canBook(status: EscrowSessionStatus): boolean {
  return status === 'CREATED'
}

/**
 * Check if status allows check-in
 */
export function canCheckInStatus(status: EscrowSessionStatus): boolean {
  return status === 'CHECKIN_PENDING'
}

/**
 * Check if status allows verification
 */
export function canVerify(status: EscrowSessionStatus): boolean {
  return status === 'CHECKED_IN' || status === 'DISPUTED'
}

/**
 * Check if status allows release
 */
export function canRequestRelease(status: EscrowSessionStatus): boolean {
  return status === 'VERIFICATION_PASSED'
}

