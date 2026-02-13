/**
 * Merchant Ledger - Tracciamento commissioni merchant per trade completati
 *
 * Per ogni trade LOCAL completato:
 * - La fee totale (es. 5% di €100 = €5) viene divisa tra merchant e piattaforma
 * - platformFeeShare (es. 10%) determina la quota piattaforma (es. €0.50)
 * - Il merchant tiene il resto (es. €4.50)
 *
 * Per CASH: il merchant ha già incassato tutto → piattaforma deve fatturare
 * Per ONLINE: piattaforma deduce automaticamente la sua quota
 */

import { Prisma } from '@prisma/client'

// =====================================================
// FEE SPLIT CALCULATION
// =====================================================

export interface MerchantFeeSplit {
  feeAmount: number       // Fee totale (es. €5)
  platformFeeSharePercent: number // % della fee per la piattaforma (es. 10)
  merchantCut: number     // Quota merchant (es. €4.50)
  platformCut: number     // Quota piattaforma (es. €0.50)
}

/**
 * Calcola lo split della fee tra merchant e piattaforma.
 *
 * Il platformCut prende il remainder per evitare errori di arrotondamento:
 * la somma merchantCut + platformCut === feeAmount è SEMPRE garantita.
 *
 * @param feeAmount - Fee totale in EUR (es. 5.00)
 * @param platformFeeSharePercent - Percentuale della fee che va alla piattaforma (es. 10.0 = 10%)
 */
export function calculateMerchantFeeSplit(
  feeAmount: number,
  platformFeeSharePercent: number
): MerchantFeeSplit {
  if (feeAmount <= 0) {
    return {
      feeAmount: 0,
      platformFeeSharePercent,
      merchantCut: 0,
      platformCut: 0,
    }
  }

  // Clamp platformFeeSharePercent tra 0 e 100
  const clampedShare = Math.max(0, Math.min(100, platformFeeSharePercent))

  // Calcola merchantCut arrotondando ai centesimi
  const merchantPercent = 100 - clampedShare
  const merchantCut = Math.round((feeAmount * merchantPercent / 100) * 100) / 100

  // platformCut = remainder → nessun centesimo perso
  const platformCut = Math.round((feeAmount - merchantCut) * 100) / 100

  return {
    feeAmount,
    platformFeeSharePercent: clampedShare,
    merchantCut,
    platformCut,
  }
}

/**
 * Valida che la somma dello split corrisponda alla fee totale.
 * Tolleranza: max €0.01 per arrotondamento.
 */
export function validateFeeSplit(split: MerchantFeeSplit): boolean {
  const sum = split.merchantCut + split.platformCut
  return Math.abs(sum - split.feeAmount) <= 0.01
}

// =====================================================
// LEDGER ENTRY CREATION
// =====================================================

export interface CreateLedgerEntryParams {
  shopId: string
  transactionId: string
  tradeAmount: number
  feePercentage: number
  feeAmount: number
  feePaidBy: string // "SELLER" | "BUYER" | "SPLIT"
  platformFeeSharePercent: number
  paymentMethod: string // "CASH" | "ONLINE"
}

/**
 * Crea una voce nel registro merchant dopo il completamento di un trade.
 *
 * DEVE essere chiamata dentro una transazione Prisma ($transaction) per
 * garantire atomicità con l'approvazione del rilascio fondi.
 *
 * @param tx - Client Prisma transazionale
 * @param params - Dati del trade completato
 */
export async function createLedgerEntry(
  tx: Prisma.TransactionClient,
  params: CreateLedgerEntryParams
) {
  const {
    shopId,
    transactionId,
    tradeAmount,
    feePercentage,
    feeAmount,
    feePaidBy,
    platformFeeSharePercent,
    paymentMethod,
  } = params

  // Calcola lo split
  const split = calculateMerchantFeeSplit(feeAmount, platformFeeSharePercent)

  // Validazione invariante: split deve essere coerente
  if (!validateFeeSplit(split)) {
    throw new Error(
      `Fee split validation failed: merchantCut(${split.merchantCut}) + platformCut(${split.platformCut}) !== feeAmount(${split.feeAmount})`
    )
  }

  // Per ONLINE la piattaforma deduce automaticamente
  const platformCollected = paymentMethod === 'ONLINE'

  const entry = await tx.merchantLedgerEntry.create({
    data: {
      shopId,
      transactionId,
      tradeAmount,
      feePercentage,
      feeAmount,
      feePaidBy,
      platformFeeSharePercent,
      merchantCut: split.merchantCut,
      platformCut: split.platformCut,
      paymentMethod,
      platformCollected,
    },
  })

  return entry
}

// =====================================================
// LEDGER QUERIES
// =====================================================

/**
 * Ottieni il riepilogo corrente (mese in corso) per un negozio.
 * Utile per il dashboard merchant.
 */
export async function getCurrentMonthSummary(
  prisma: Prisma.TransactionClient | any,
  shopId: string
) {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const entries = await prisma.merchantLedgerEntry.findMany({
    where: {
      shopId,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  })

  return aggregateEntries(entries, periodStart, periodEnd)
}

/**
 * Ottieni riepilogo per un periodo specifico.
 */
export async function getPeriodSummary(
  prisma: Prisma.TransactionClient | any,
  shopId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const entries = await prisma.merchantLedgerEntry.findMany({
    where: {
      shopId,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  })

  return aggregateEntries(entries, periodStart, periodEnd)
}

// =====================================================
// INTERNAL HELPERS
// =====================================================

interface LedgerEntry {
  tradeAmount: number
  feeAmount: number
  merchantCut: number
  platformCut: number
  paymentMethod: string
  platformCollected: boolean
}

function aggregateEntries(
  entries: LedgerEntry[],
  periodStart: Date,
  periodEnd: Date
) {
  const cashEntries = entries.filter(e => e.paymentMethod === 'CASH')
  const onlineEntries = entries.filter(e => e.paymentMethod === 'ONLINE')

  const sum = (arr: LedgerEntry[], field: keyof Pick<LedgerEntry, 'tradeAmount' | 'feeAmount' | 'merchantCut' | 'platformCut'>) =>
    Math.round(arr.reduce((acc, e) => acc + e[field], 0) * 100) / 100

  return {
    periodStart,
    periodEnd,
    totalTrades: entries.length,
    cashTrades: cashEntries.length,
    onlineTrades: onlineEntries.length,

    totalTradeVolume: sum(entries, 'tradeAmount'),
    totalFees: sum(entries, 'feeAmount'),
    totalMerchantCut: sum(entries, 'merchantCut'),
    totalPlatformCut: sum(entries, 'platformCut'),

    cashFees: sum(cashEntries, 'feeAmount'),
    cashMerchantCut: sum(cashEntries, 'merchantCut'),
    cashPlatformCut: sum(cashEntries, 'platformCut'), // Questo è il DEBITO del merchant
    onlineFees: sum(onlineEntries, 'feeAmount'),
    onlineMerchantCut: sum(onlineEntries, 'merchantCut'),
    onlinePlatformCut: sum(onlineEntries, 'platformCut'), // Già auto-dedotto

    // Importo che il merchant deve alla piattaforma = quota piattaforma da trades cash
    amountDue: sum(cashEntries, 'platformCut'),
  }
}
