/**
 * QR Code Generator for Vault - Generates QR tokens for slots and items
 */

import { randomBytes } from 'crypto'

/**
 * Generate unique QR token for slot
 * Format: VAULT_SLOT_{caseId}_{slotCode}_{random}
 */
export function generateSlotQRToken(caseId: string, slotCode: string): string {
  const random = randomBytes(8).toString('hex')
  return `VAULT_SLOT_${caseId}_${slotCode}_${random}`
}

/**
 * Generate unique QR token for item
 * Format: VAULT_ITEM_{itemId}_{random}
 */
export function generateItemQRToken(itemId: string): string {
  const random = randomBytes(8).toString('hex')
  return `VAULT_ITEM_${itemId}_${random}`
}

/**
 * Parse slot QR token
 */
export function parseSlotQRToken(token: string): { caseId: string; slotCode: string } | null {
  const parts = token.split('_')
  if (parts.length !== 5 || parts[0] !== 'VAULT' || parts[1] !== 'SLOT') {
    return null
  }
  return {
    caseId: parts[2],
    slotCode: parts[3],
  }
}

/**
 * Parse item QR token
 */
export function parseItemQRToken(token: string): { itemId: string } | null {
  const parts = token.split('_')
  if (parts.length !== 4 || parts[0] !== 'VAULT' || parts[1] !== 'ITEM') {
    return null
  }
  return {
    itemId: parts[2],
  }
}

