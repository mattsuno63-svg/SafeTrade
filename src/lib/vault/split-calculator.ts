/**
 * Vault Split Calculator - Fixed 70/20/10 split
 */

/**
 * Calculate split amounts (70% owner, 20% merchant, 10% platform)
 * Platform takes remainder to handle rounding
 */
export function calculateSplit(grossAmount: number): {
  ownerAmount: number
  merchantAmount: number
  platformAmount: number
} {
  if (!grossAmount || grossAmount <= 0) {
    return { ownerAmount: 0, merchantAmount: 0, platformAmount: 0 }
  }

  // Calculate with consistent rounding (Math.round for all)
  const ownerAmount = Math.round(grossAmount * 0.70 * 100) / 100
  const merchantAmount = Math.round(grossAmount * 0.20 * 100) / 100
  // Platform gets remainder to guarantee sum === grossAmount
  const platformAmount = Math.round((grossAmount - ownerAmount - merchantAmount) * 100) / 100

  return {
    ownerAmount,
    merchantAmount,
    platformAmount,
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

