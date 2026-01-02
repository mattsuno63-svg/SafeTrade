/**
 * Utility functions for SafeTrade Escrow Fee Management
 */

export type FeePaidBy = 'SELLER' | 'BUYER' | 'SPLIT'

export interface FeeCalculation {
  totalAmount: number      // Prezzo originale della transazione
  feePercentage: number    // Percentuale fee (es. 5.0 = 5%)
  feePaidBy: FeePaidBy    // Chi paga la fee
  feeAmount: number        // Importo della fee calcolato
  finalAmount: number      // Importo finale che riceve il venditore
  buyerPays: number        // Quanto paga il compratore
  sellerReceives: number   // Quanto riceve il venditore
}

/**
 * Calcola la fee e gli importi finali per una transazione SafeTrade
 * 
 * @param totalAmount - Prezzo concordato per la transazione
 * @param feePercentage - Percentuale della fee (default 5%)
 * @param feePaidBy - Chi paga la fee: SELLER, BUYER, o SPLIT (default SELLER)
 * @returns FeeCalculation con tutti gli importi calcolati
 * 
 * @example
 * // Fee pagata dal venditore (detratta dal prezzo)
 * calculateEscrowFee(100, 5, 'SELLER')
 * // => { totalAmount: 100, feeAmount: 5, buyerPays: 100, sellerReceives: 95 }
 * 
 * @example
 * // Fee pagata dal compratore (aggiunta al prezzo)
 * calculateEscrowFee(100, 5, 'BUYER')
 * // => { totalAmount: 100, feeAmount: 5, buyerPays: 105, sellerReceives: 100 }
 * 
 * @example
 * // Fee divisa 50/50 tra venditore e compratore
 * calculateEscrowFee(100, 5, 'SPLIT')
 * // => { totalAmount: 100, feeAmount: 5, buyerPays: 102.5, sellerReceives: 97.5 }
 */
export function calculateEscrowFee(
  totalAmount: number,
  feePercentage: number = 5.0,
  feePaidBy: FeePaidBy = 'SELLER'
): FeeCalculation {
  // Calcola l'importo della fee
  const feeAmount = parseFloat(((totalAmount * feePercentage) / 100).toFixed(2))

  let buyerPays: number
  let sellerReceives: number
  let finalAmount: number

  if (feePaidBy === 'SELLER') {
    // Fee detratta dal venditore
    buyerPays = totalAmount
    sellerReceives = totalAmount - feeAmount
    finalAmount = sellerReceives
  } else if (feePaidBy === 'BUYER') {
    // Fee aggiunta e pagata dal compratore
    buyerPays = totalAmount + feeAmount
    sellerReceives = totalAmount
    finalAmount = totalAmount
  } else {
    // SPLIT: Fee divisa 50/50
    const halfFee = parseFloat((feeAmount / 2).toFixed(2))
    buyerPays = totalAmount + halfFee
    sellerReceives = totalAmount - halfFee
    finalAmount = sellerReceives
  }

  return {
    totalAmount,
    feePercentage,
    feePaidBy,
    feeAmount,
    finalAmount,
    buyerPays,
    sellerReceives,
  }
}

/**
 * Formatta un importo in Euro con il simbolo
 */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

/**
 * Genera un messaggio descrittivo della fee per l'utente
 */
export function getFeeDescription(calculation: FeeCalculation): {
  buyerMessage: string
  sellerMessage: string
  merchantMessage: string
} {
  const { feePercentage, feeAmount, buyerPays, sellerReceives, feePaidBy } = calculation

  let buyerMessage: string
  let sellerMessage: string

  if (feePaidBy === 'BUYER') {
    buyerMessage = `Pagherai ${formatEuro(buyerPays)} (prezzo ${formatEuro(calculation.totalAmount)} + fee ${feePercentage}% = ${formatEuro(feeAmount)})`
    sellerMessage = `Riceverai ${formatEuro(sellerReceives)} (acquirente paga la fee)`
  } else if (feePaidBy === 'SELLER') {
    buyerMessage = `Pagherai ${formatEuro(buyerPays)} (fee ${feePercentage}% inclusa nel prezzo)`
    sellerMessage = `Riceverai ${formatEuro(sellerReceives)} (prezzo ${formatEuro(calculation.totalAmount)} - fee ${feePercentage}% = ${formatEuro(feeAmount)})`
  } else {
    // SPLIT
    const halfFee = feeAmount / 2
    buyerMessage = `Pagherai ${formatEuro(buyerPays)} (prezzo ${formatEuro(calculation.totalAmount)} + metà fee ${formatEuro(halfFee)})`
    sellerMessage = `Riceverai ${formatEuro(sellerReceives)} (prezzo ${formatEuro(calculation.totalAmount)} - metà fee ${formatEuro(halfFee)})`
  }

  return {
    buyerMessage,
    sellerMessage,
    merchantMessage: `Fee SafeTrade: ${formatEuro(feeAmount)} (${feePercentage}% su ${formatEuro(calculation.totalAmount)})`,
  }
}

