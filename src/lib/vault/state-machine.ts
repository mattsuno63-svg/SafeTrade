/**
 * Vault State Machine - Enforces valid state transitions
 */

import { VaultItemStatus, VaultOrderStatus } from '@prisma/client'

/**
 * Check if a state transition is valid for VaultItem
 */
export function canTransitionItemStatus(
  currentStatus: VaultItemStatus,
  newStatus: VaultItemStatus
): { valid: boolean; reason?: string } {
  const validTransitions: Record<VaultItemStatus, VaultItemStatus[]> = {
    PENDING_REVIEW: ['ACCEPTED', 'REJECTED'],
    ACCEPTED: ['ASSIGNED_TO_SHOP'],
    REJECTED: [], // Terminal
    ASSIGNED_TO_SHOP: ['IN_CASE', 'RETURNED'], // Must be in case before listing online; can be returned
    IN_CASE: ['LISTED_ONLINE', 'SOLD', 'RETURNED'],
    LISTED_ONLINE: ['RESERVED', 'RETURNED'],
    RESERVED: ['SOLD', 'RETURNED'], // Can only be sold online or returned
    SOLD: [], // Terminal
    RETURNED: [], // Terminal
  }

  const allowed = validTransitions[currentStatus] || []
  
  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      reason: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowed.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Check if a state transition is valid for VaultOrder
 */
export function canTransitionOrderStatus(
  currentStatus: VaultOrderStatus,
  newStatus: VaultOrderStatus
): { valid: boolean; reason?: string } {
  const validTransitions: Record<VaultOrderStatus, VaultOrderStatus[]> = {
    PENDING_PAYMENT: ['PAID', 'CANCELLED'],
    PAID: ['FULFILLING', 'CANCELLED', 'REFUNDED'],
    FULFILLING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
    SHIPPED: ['DELIVERED', 'DISPUTED', 'REFUNDED'],
    DELIVERED: ['DISPUTED', 'REFUNDED'],
    DISPUTED: ['REFUNDED', 'DELIVERED'], // Can be resolved
    REFUNDED: [], // Terminal
    CANCELLED: [], // Terminal
  }

  const allowed = validTransitions[currentStatus] || []
  
  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      reason: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowed.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Check if item can be sold physically (must be in case or listed online)
 */
export function canSellPhysically(status: VaultItemStatus): boolean {
  return ['IN_CASE', 'LISTED_ONLINE'].includes(status)
}

/**
 * Check if item can be listed online (must be in case first)
 */
export function canListOnline(status: VaultItemStatus): boolean {
  return status === 'IN_CASE'
}

