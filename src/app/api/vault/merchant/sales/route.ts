import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { canTransitionItemStatus, canSellPhysically } from '@/lib/vault/state-machine'
import { calculateSplit } from '@/lib/vault/split-calculator'
import { notifySaleComplete } from '@/lib/vault/notifications'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

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
    const schema = z.object({
      itemId: z.string(),
      soldPrice: z.number().positive(),
      proofImage: z.string().optional(),
    })

    const data = schema.parse(body)

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

    // Calculate split
    const split = calculateSplit(data.soldPrice)

    // Create sale and update item in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create sale
      const sale = await tx.vaultSale.create({
        data: {
          itemId: data.itemId,
          shopId: shop.id,
          soldPrice: data.soldPrice,
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

      // Create split
      const splitRecord = await tx.vaultSplit.create({
        data: {
          sourceType: 'SALE',
          sourceId: sale.id,
          itemId: data.itemId,
          ownerUserId: item.ownerUserId,
          shopId: shop.id,
          grossAmount: data.soldPrice,
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
      newValue: { status: 'SOLD', soldPrice: data.soldPrice },
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

