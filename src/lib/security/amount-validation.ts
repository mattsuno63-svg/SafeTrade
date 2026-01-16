import { z } from 'zod'

/**
 * SECURITY #15: Utility per validazione importi pagamento
 */

// Schema Zod per validazione amount
export const amountSchema = z.number()
  .positive('L\'importo deve essere positivo')
  .min(0.01, 'L\'importo minimo è €0.01')
  .max(100000, 'L\'importo massimo è €100,000')
  .refine(
    (val) => {
      // Verifica che non ci siano più di 2 decimali
      const rounded = Math.round(val * 100) / 100
      return Math.abs(val - rounded) < 0.001
    },
    { message: 'L\'importo può avere massimo 2 decimali' }
  )

/**
 * Valida e arrotonda un importo
 * @param amount Importo da validare
 * @returns Importo arrotondato a 2 decimali
 * @throws Error se importo non valido
 */
export function validateAndRoundAmount(amount: number): number {
  // Valida con Zod
  const validated = amountSchema.parse(amount)
  
  // Arrotonda a 2 decimali
  return Math.round(validated * 100) / 100
}

/**
 * Verifica che un importo corrisponda a quello nella sessione escrow (con tolleranza)
 * @param amount Importo da verificare
 * @param expectedAmount Importo atteso dalla sessione
 * @param tolerancePercent Tolleranza percentuale (default: 5%)
 * @returns true se l'importo è valido
 */
export function validateAmountMatchesSession(
  amount: number,
  expectedAmount: number,
  tolerancePercent: number = 5
): { valid: boolean; reason?: string } {
  const tolerance = expectedAmount * (tolerancePercent / 100)
  const difference = Math.abs(amount - expectedAmount)
  
  if (difference > tolerance) {
    return {
      valid: false,
      reason: `L'importo (€${amount.toFixed(2)}) non corrisponde all'importo della sessione (€${expectedAmount.toFixed(2)}). Differenza: €${difference.toFixed(2)} (tolleranza: €${tolerance.toFixed(2)})`,
    }
  }
  
  return { valid: true }
}

/**
 * Valida che un importo non sia negativo o zero
 */
export function validateAmountPositive(amount: number): { valid: boolean; reason?: string } {
  if (amount <= 0) {
    return {
      valid: false,
      reason: `L'importo deve essere positivo. Ricevuto: €${amount.toFixed(2)}`,
    }
  }
  return { valid: true }
}

/**
 * Valida che un importo non superi un limite
 */
export function validateAmountLimit(amount: number, maxLimit: number = 100000): { valid: boolean; reason?: string } {
  if (amount > maxLimit) {
    return {
      valid: false,
      reason: `L'importo (€${amount.toFixed(2)}) supera il limite massimo di €${maxLimit.toFixed(2)}`,
    }
  }
  return { valid: true }
}

