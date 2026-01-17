import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { canTransitionItemStatus, canSellPhysically } from '@/lib/vault/state-machine'
import { calculateSplit } from '@/lib/vault/split-calculator'
import { notifySaleComplete } from '@/lib/vault/notifications'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { logSecurityEvent } from '@/lib/security/audit'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

/**
 * POST /api/vault/merchant/sales
 * Record physical sale - MERCHANT only
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Get merchant's shop
    const shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // BUG #8 FIX: Rate limiting for vault sales
    const rateLimitKey = getRateLimitKey(user.id, 'VAULT_SALES')
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.VAULT_SALES)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Troppe richieste. Limite di 50 vendite per ora raggiunto.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const body = await request.json()
    // SECURITY #7: Validazione prezzo con range e arrotondamento
    const schema = z.object({
      itemId: z.string(),
      soldPrice: z.number()
        .positive('Il prezzo deve essere positivo')
        .min(0.01, 'Il prezzo minimo è €0.01')
        .max(100000, 'Il prezzo massimo è €100,000')
        .refine(
          (val) => {
            // Arrotonda a 2 decimali e verifica che non ci siano più di 2 decimali
            const rounded = Math.round(val * 100) / 100
            return Math.abs(val - rounded) < 0.001
          },
          { message: 'Il prezzo può avere massimo 2 decimali' }
        ),
      proofImage: z.string().optional(),
      requiresConfirmation: z.boolean().optional(), // Per vendite > €500
    })

    const data = schema.parse(body)

    // SECURITY #7: Arrotonda prezzo a 2 decimali
    const soldPrice = Math.round(data.soldPrice * 100) / 100

    // Get item with slot verification
    const item = await prisma.vaultItem.findUnique({
      where: { id: data.itemId },
      include: {
        slot: {
          include: {
            case: true,
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Validazione 1: Item deve essere assegnato a questo shop
    if (item.shopIdCurrent !== shop.id) {
      return NextResponse.json(
        { error: 'La carta non è assegnata al tuo negozio' },
        { status: 403 }
      )
    }

    // Validazione 2: Item deve essere fisicamente nella teca del negozio (IN_CASE)
    if (item.status !== 'IN_CASE') {
      return NextResponse.json(
        { error: `La carta non può essere venduta fisicamente. Deve essere nella teca (stato: ${item.status})` },
        { status: 400 }
      )
    }

    // Validazione 3: Item deve essere in uno slot della teca autorizzata del negozio
    if (!item.slotId || !item.slot) {
      return NextResponse.json(
        { error: 'La carta non è in uno slot della teca' },
        { status: 400 }
      )
    }

    // Validazione 4: Verifica che lo slot appartenga alla teca autorizzata del negozio
    if (item.slot.case.authorizedShopId !== shop.id) {
      return NextResponse.json(
        { error: 'La carta non è nella tua teca autorizzata' },
        { status: 403 }
      )
    }

    // Validazione 5: Verifica che il negozio sia autorizzato
    if (!shop.vaultCaseAuthorized) {
      return NextResponse.json(
        { error: 'Il tuo negozio non è autorizzato a vendere carte dalla teca' },
        { status: 403 }
      )
    }

    // Validazione 6: Check if can sell physically (non RESERVED, non SOLD, etc.)
    if (!canSellPhysically(item.status)) {
      return NextResponse.json(
        { error: `Item cannot be sold physically. Current status: ${item.status}` },
        { status: 400 }
      )
    }

    // Validate transition
    const transition = canTransitionItemStatus(item.status, 'SOLD')
    if (!transition.valid) {
      return NextResponse.json(
        { error: transition.reason },
        { status: 400 }
      )
    }

    // SECURITY #7: Validazione prezzo vendita
    // Usa priceFinal se disponibile, altrimenti 0 (nessun valore stimato)
    const estimatedValue = item.priceFinal || 0

    // Verifica che prezzo sia ragionevole rispetto al valore stimato
    if (estimatedValue > 0) {
      const priceRatio = soldPrice / estimatedValue
      
      // Alert admin se prezzo > 200% del valore stimato
      if (priceRatio > 2.0) {
        await prisma.adminNotification.create({
          data: {
            type: 'URGENT_ACTION',
            referenceType: 'VAULT_SALE',
            referenceId: data.itemId,
            title: '⚠️ Vendita Vault: Prezzo anomalo',
            message: `Vendita Vault con prezzo sospetto: €${soldPrice.toFixed(2)} (valore stimato: €${estimatedValue.toFixed(2)}, rapporto: ${(priceRatio * 100).toFixed(0)}%). Item ID: ${data.itemId}. Merchant: ${user.email}`,
            targetRoles: ['ADMIN'],
            priority: 'HIGH',
          },
        })

        // Log security event
        await logSecurityEvent({
          eventType: 'VAULT_ACCESS_UNAUTHORIZED',
          attemptedById: user.id,
          endpoint: '/api/vault/merchant/sales',
          method: 'POST',
          resourceId: data.itemId,
          resourceType: 'VAULT_ITEM',
          request,
          wasBlocked: false, // Non bloccato, ma alertato
          reason: `Price anomaly: soldPrice (€${soldPrice}) is ${(priceRatio * 100).toFixed(0)}% of estimated value (€${estimatedValue})`,
          severity: 'HIGH',
          metadata: {
            soldPrice,
            estimatedValue,
            priceRatio,
            itemId: data.itemId,
          },
        })
      }
    }

    // SECURITY #7: Richiedere conferma per vendite > €500
    if (soldPrice > 500 && !data.requiresConfirmation) {
      return NextResponse.json(
        { 
          error: 'Vendite superiori a €500 richiedono conferma esplicita',
          requiresConfirmation: true,
          soldPrice,
        },
        { status: 400 }
      )
    }

    // Calculate split
    const split = calculateSplit(soldPrice)

    // Create sale and update item in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create sale (usa soldPrice arrotondato)
      const sale = await tx.vaultSale.create({
        data: {
          itemId: data.itemId,
          shopId: shop.id,
          soldPrice: soldPrice, // Prezzo arrotondato a 2 decimali
          proofImage: data.proofImage,
          createdByMerchantUserId: user.id,
        },
      })

      // Update item
      const updatedItem = await tx.vaultItem.update({
        where: { id: data.itemId },
        data: { status: 'SOLD' },
      })

      // Free slot if item was in slot
      if (item.slotId) {
        await tx.vaultCaseSlot.update({
          where: { id: item.slotId },
          data: { status: 'FREE' },
        })
      }

      // Create split (usa soldPrice arrotondato)
      const splitRecord = await tx.vaultSplit.create({
        data: {
          sourceType: 'SALE',
          sourceId: sale.id,
          itemId: data.itemId,
          ownerUserId: item.ownerUserId,
          shopId: shop.id,
          grossAmount: soldPrice, // Prezzo arrotondato a 2 decimali
          ownerAmount: split.ownerAmount,
          merchantAmount: split.merchantAmount,
          platformAmount: split.platformAmount,
          status: 'ELIGIBLE', // Physical sales are immediately eligible
          eligibleAt: new Date(),
        },
      })

      return { sale, updatedItem, split: splitRecord }
    })

    // Audit log
    await createVaultAuditLog({
      actionType: 'SALE_CREATED',
      performedBy: user,
      itemId: data.itemId,
      saleId: result.sale.id,
      oldValue: { status: item.status },
      newValue: { status: 'SOLD', soldPrice: soldPrice },
    })

    await createVaultAuditLog({
      actionType: 'SPLIT_GENERATED',
      performedBy: user,
      itemId: data.itemId,
      saleId: result.sale.id,
      newValue: {
        ownerAmount: split.ownerAmount,
        merchantAmount: split.merchantAmount,
        platformAmount: split.platformAmount,
      },
    })

    // Notify owner and merchant
    await notifySaleComplete(result.sale.id)

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[POST /api/vault/merchant/sales] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/vault/merchant/sales
 * Get merchant's sales list - MERCHANT only
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Get merchant's shop
    const shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // Filter by split status (optional)
    const game = searchParams.get('game') // Filter by game (optional)
    const startDate = searchParams.get('startDate') // Filter by date range (optional)
    const endDate = searchParams.get('endDate') // Filter by date range (optional)

    // Build where clause
    const where: any = {
      shopId: shop.id,
    }

    // Get sales with related data
    const sales = await prisma.vaultSale.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            game: true,
            set: true,
            photos: true,
            owner: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { soldAt: 'desc' },
    })

    // Get splits for all sales
    const saleIds = sales.map((s) => s.id)
    const splits = await prisma.vaultSplit.findMany({
      where: {
        sourceType: 'SALE',
        sourceId: { in: saleIds },
      },
      select: {
        id: true,
        sourceId: true,
        grossAmount: true,
        ownerAmount: true,
        merchantAmount: true,
        platformAmount: true,
        status: true,
        eligibleAt: true,
      },
    })

    // Map splits to sales
    const salesWithSplits = sales.map((sale) => ({
      ...sale,
      splits: splits.filter((split) => split.sourceId === sale.id),
    }))

    // Filter by date range if provided
    let filteredSales = salesWithSplits
    if (startDate || endDate) {
      filteredSales = salesWithSplits.filter((sale) => {
        const saleDate = new Date(sale.soldAt)
        if (startDate && saleDate < new Date(startDate)) return false
        if (endDate && saleDate > new Date(endDate)) return false
        return true
      })
    }

    // Filter by game if provided
    if (game) {
      filteredSales = filteredSales.filter((sale) => sale.item.game === game)
    }

    // Filter by split status if provided
    if (status) {
      filteredSales = filteredSales.filter((sale) => {
        const latestSplit = sale.splits[sale.splits.length - 1]
        return latestSplit?.status === status
      })
    }

    // Calculate statistics
    const stats = {
      totalSales: filteredSales.length,
      totalRevenue: filteredSales.reduce((sum, sale) => sum + sale.soldPrice, 0),
      totalOwnerAmount: filteredSales.reduce(
        (sum, sale) => sum + (sale.splits[sale.splits.length - 1]?.ownerAmount || 0),
        0
      ),
      totalMerchantAmount: filteredSales.reduce(
        (sum, sale) => sum + (sale.splits[sale.splits.length - 1]?.merchantAmount || 0),
        0
      ),
      totalPlatformAmount: filteredSales.reduce(
        (sum, sale) => sum + (sale.splits[sale.splits.length - 1]?.platformAmount || 0),
        0
      ),
    }

    return NextResponse.json(
      {
        data: filteredSales,
        stats,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[GET /api/vault/merchant/sales] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

