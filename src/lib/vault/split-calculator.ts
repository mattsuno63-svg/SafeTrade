/**
 * Vault Split Calculator - Fixed 70/20/10 split
 * All calculations in cents to avoid rounding discrepancies.
 */

const OWNER_RATIO = 0.70
const MERCHANT_RATIO = 0.20
// Platform gets remainder: grossCents - ownerCents - merchantCents

/**
 * Calculate split amounts (70% owner, 20% merchant, 10% platform)
 * Uses cents internally so sum always equals grossAmount.
 */
export function calculateSplit(grossAmount: number): {
  ownerAmount: number
  merchantAmount: number
  platformAmount: number
} {
  if (!grossAmount || grossAmount <= 0) {
    return { ownerAmount: 0, merchantAmount: 0, platformAmount: 0 }
  }

  const grossCents = Math.round(grossAmount * 100)
  const ownerCents = Math.round(grossCents * OWNER_RATIO)
  const merchantCents = Math.round(grossCents * MERCHANT_RATIO)
  const platformCents = grossCents - ownerCents - merchantCents

  return {
    ownerAmount: ownerCents / 100,
    merchantAmount: merchantCents / 100,
    platformAmount: platformCents / 100,
  }
}

/**
 * Validate split amounts sum to gross amount (with rounding tolerance)
 */
export function validateSplit(
  grossAmount: number,
  ownerAmount: number,
  merchantAmount: number,
  platformAmount: number
): boolean {
  const sum = ownerAmount + merchantAmount + platformAmount
  const diff = Math.abs(sum - grossAmount)
  // Allow 0.01 difference for rounding
  return diff <= 0.01
}

