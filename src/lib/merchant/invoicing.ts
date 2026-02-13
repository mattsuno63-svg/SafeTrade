/**
 * Merchant Invoicing - Generazione fatture mensili per i merchant
 *
 * Ogni mese, per ogni shop che ha avuto trade:
 * 1. Aggrega tutte le MerchantLedgerEntry del periodo
 * 2. Calcola l'amountDue (quota piattaforma da trades CASH)
 * 3. Genera una MerchantInvoice
 *
 * L'amountDue è ciò che il merchant deve pagare alla piattaforma:
 * - Solo la quota piattaforma dei trades CASH (il merchant ha già incassato tutto)
 * - I trades ONLINE sono già stati dedotti automaticamente
 */

import { prisma } from '@/lib/db'
import { getPeriodSummary } from './ledger'

// =====================================================
// INVOICE GENERATION
// =====================================================

/**
 * Genera la fattura mensile per un singolo negozio.
 *
 * @param shopId - ID del negozio
 * @param year - Anno (es. 2026)
 * @param month - Mese 1-indexed (es. 2 = Febbraio)
 * @returns La fattura creata o null se non ci sono trade nel periodo
 */
export async function generateMonthlyInvoice(
  shopId: string,
  year: number,
  month: number
) {
  const periodStart = new Date(year, month - 1, 1) // month è 1-indexed, Date vuole 0-indexed
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999) // Ultimo giorno del mese

  // Verifica che non esista già una fattura per questo periodo
  const existing = await prisma.merchantInvoice.findFirst({
    where: {
      shopId,
      periodStart,
      periodEnd,
    },
  })

  if (existing) {
    return { invoice: existing, created: false, reason: 'Invoice already exists for this period' }
  }

  // Ottieni il riepilogo del periodo
  const summary = await getPeriodSummary(prisma, shopId, periodStart, periodEnd)

  // Se non ci sono trade, non generare fattura
  if (summary.totalTrades === 0) {
    return { invoice: null, created: false, reason: 'No trades in this period' }
  }

  // Se non c'è debito (tutto online e già dedotto), genera comunque per record
  // ma con amountDue = 0

  // Genera numero fattura: INV-YYYY-MM-SHOPSLUG-NNN
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { slug: true, name: true },
  })

  const shopRef = shop?.slug || shopId.slice(0, 8)
  const monthStr = String(month).padStart(2, '0')
  const invoiceNumber = `INV-${year}-${monthStr}-${shopRef.toUpperCase()}`

  // Data scadenza: 15 del mese successivo
  const dueDate = new Date(year, month, 15) // month è già il mese successivo (0-indexed)

  // Crea fattura con transazione atomica
  const invoice = await prisma.$transaction(async (tx) => {
    // 1. Crea la fattura
    const inv = await tx.merchantInvoice.create({
      data: {
        invoiceNumber,
        shopId,
        periodStart,
        periodEnd,

        totalTrades: summary.totalTrades,
        cashTrades: summary.cashTrades,
        onlineTrades: summary.onlineTrades,

        totalTradeVolume: summary.totalTradeVolume,
        totalFees: summary.totalFees,
        totalMerchantCut: summary.totalMerchantCut,
        totalPlatformCut: summary.totalPlatformCut,

        cashFees: summary.cashFees,
        cashMerchantCut: summary.cashMerchantCut,
        cashPlatformCut: summary.cashPlatformCut,
        onlineFees: summary.onlineFees,
        onlineMerchantCut: summary.onlineMerchantCut,
        onlinePlatformCut: summary.onlinePlatformCut,

        amountDue: summary.amountDue,

        status: summary.amountDue > 0 ? 'ISSUED' : 'PAID', // Se debito = 0, segna come pagata
        issuedAt: new Date(),
        dueDate,
      },
    })

    // 2. Collega le voci del ledger a questa fattura
    await tx.merchantLedgerEntry.updateMany({
      where: {
        shopId,
        invoiceId: null, // Solo voci non ancora fatturate
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      data: {
        invoiceId: inv.id,
      },
    })

    return inv
  })

  return { invoice, created: true }
}

/**
 * Genera fatture mensili per TUTTI i negozi che hanno avuto trade nel periodo.
 *
 * @param year - Anno
 * @param month - Mese (1-indexed)
 * @returns Array di risultati per ogni shop
 */
export async function generateAllMonthlyInvoices(year: number, month: number) {
  const periodStart = new Date(year, month - 1, 1)
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999)

  // Trova tutti i negozi che hanno avuto trade nel periodo
  const shopsWithTrades = await prisma.merchantLedgerEntry.findMany({
    where: {
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
      invoiceId: null, // Solo voci non ancora fatturate
    },
    select: {
      shopId: true,
    },
    distinct: ['shopId'],
  })

  const results = []

  for (const { shopId } of shopsWithTrades) {
    try {
      const result = await generateMonthlyInvoice(shopId, year, month)
      results.push({ shopId, ...result })
    } catch (error: any) {
      results.push({
        shopId,
        invoice: null,
        created: false,
        reason: `Error: ${error.message}`,
      })
    }
  }

  return results
}

// =====================================================
// INVOICE STATUS MANAGEMENT
// =====================================================

/**
 * Segna una fattura come pagata dal merchant.
 */
export async function markInvoiceAsPaid(
  invoiceId: string,
  paymentMethod: string,
  paymentReference?: string,
  notes?: string
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.merchantInvoice.findUnique({
      where: { id: invoiceId },
    })

    if (!invoice) {
      throw new Error('Invoice not found')
    }

    if (invoice.status === 'PAID') {
      throw new Error('Invoice is already paid')
    }

    if (invoice.status === 'CANCELLED') {
      throw new Error('Invoice is cancelled')
    }

    // 1. Aggiorna fattura
    const updated = await tx.merchantInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod,
        paymentReference,
        notes: notes || invoice.notes,
      },
    })

    // 2. Segna tutte le voci cash come "piattaforma incassata"
    await tx.merchantLedgerEntry.updateMany({
      where: {
        invoiceId: invoiceId,
        paymentMethod: 'CASH',
        platformCollected: false,
      },
      data: {
        platformCollected: true,
      },
    })

    return updated
  })
}

/**
 * Segna una fattura come scaduta.
 */
export async function markInvoiceAsOverdue(invoiceId: string) {
  return prisma.merchantInvoice.update({
    where: { id: invoiceId },
    data: { status: 'OVERDUE' },
  })
}

/**
 * Annulla una fattura.
 */
export async function cancelInvoice(invoiceId: string, notes?: string) {
  return prisma.$transaction(async (tx) => {
    // Rimuovi l'associazione delle voci alla fattura
    await tx.merchantLedgerEntry.updateMany({
      where: { invoiceId },
      data: { invoiceId: null },
    })

    return tx.merchantInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'CANCELLED',
        notes: notes || 'Fattura annullata',
      },
    })
  })
}

// =====================================================
// QUERIES
// =====================================================

/**
 * Ottieni tutte le fatture per un negozio.
 */
export async function getShopInvoices(shopId: string) {
  return prisma.merchantInvoice.findMany({
    where: { shopId },
    orderBy: { periodStart: 'desc' },
    include: {
      shop: {
        select: { id: true, name: true, slug: true },
      },
      _count: {
        select: { entries: true },
      },
    },
  })
}

/**
 * Ottieni tutte le fatture in attesa di pagamento (per admin).
 */
export async function getPendingInvoices() {
  return prisma.merchantInvoice.findMany({
    where: {
      status: { in: ['ISSUED', 'OVERDUE'] },
    },
    orderBy: { dueDate: 'asc' },
    include: {
      shop: {
        select: { id: true, name: true, slug: true, merchantId: true },
      },
      _count: {
        select: { entries: true },
      },
    },
  })
}

/**
 * Controlla fatture scadute e aggiorna lo stato.
 * Da eseguire periodicamente (cron job).
 */
export async function checkOverdueInvoices() {
  const now = new Date()

  const overdueInvoices = await prisma.merchantInvoice.findMany({
    where: {
      status: 'ISSUED',
      dueDate: { lt: now },
    },
  })

  const results = []

  for (const invoice of overdueInvoices) {
    const updated = await markInvoiceAsOverdue(invoice.id)
    results.push(updated)
  }

  return results
}
