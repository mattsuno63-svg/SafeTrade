import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { canTransitionItemStatus } from '@/lib/vault/state-machine'
import { moveItemBetweenSlotsAtomic, removeItemFromSlotAtomic, assignItemToSlotAtomic } from '@/lib/vault/transactions'
import { z } from 'zod'
import { handleApiError } from '@/lib/api-error'

/**
 * POST /api/vault/merchant/items/[id]/move-slot
 * Move item to slot (or remove from slot) - MERCHANT only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = 'then' in params ? await params : params
    const { id: itemId } = resolvedParams

    // Get merchant's shop
    const shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const body = await request.json()
    const schema = z.object({
      slotId: z.string().nullable(), // null = remove from slot
    })

    const { slotId } = schema.parse(body)

    // Get item
    const item = await prisma.vaultItem.findUnique({
      where: { id: itemId },
      include: {
        slot: true,
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (item.shopIdCurrent !== shop.id) {
      return NextResponse.json(
        { error: 'Item is not assigned to your shop' },
        { status: 403 }
      )
    }

    // If removing from slot
    if (!slotId) {
      if (!item.slotId) {
        return NextResponse.json(
          { error: 'Item is not in a slot' },
          { status: 400 }
        )
      }

      // Rimozione atomica con lock pessimistico
      const result = await prisma.$transaction(async (tx) => {
        return await removeItemFromSlotAtomic(tx, {
          itemId,
          slotId: item.slotId!,
          shopId: shop.id,
        })
      })

      await createVaultAuditLog({
        actionType: 'SLOT_FREED',
        performedBy: user,
        itemId: itemId,
        slotId: item.slotId,
        oldValue: { slotId: item.slotId, status: item.status },
        newValue: { slotId: null, status: 'ASSIGNED_TO_SHOP' },
      })

      return NextResponse.json({ data: result.item }, { status: 200 })
    }

    // If moving to slot
    const slot = await prisma.vaultCaseSlot.findUnique({
      where: { id: slotId },
      include: {
        case: true,
        item: true,
      },
    })

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    }

    if (slot.case.authorizedShopId !== shop.id) {
      return NextResponse.json(
        { error: 'Slot does not belong to your authorized case' },
        { status: 403 }
      )
    }

    if (slot.status !== 'FREE') {
      return NextResponse.json(
        { error: 'Slot is already occupied' },
        { status: 400 }
      )
    }

    // Validate transition (pre-check) - only if status is actually changing
    const newStatus = 'IN_CASE'
    if (item.status !== newStatus) {
      // Status is changing (e.g. ASSIGNED_TO_SHOP → IN_CASE)
      const transition = canTransitionItemStatus(item.status, newStatus)
      if (!transition.valid) {
        return NextResponse.json(
          { error: transition.reason },
          { status: 400 }
        )
      }
    } else if (item.status !== 'IN_CASE') {
      // Item must be IN_CASE or ASSIGNED_TO_SHOP to be moved to a slot
      return NextResponse.json(
        { error: `La carta non può essere spostata. Stato corrente: ${item.status}` },
        { status: 400 }
      )
    }

    // Spostamento atomico con lock pessimistico
    // Se item è già in uno slot, usa moveItemBetweenSlotsAtomic
    // Altrimenti usa assignItemToSlotAtomic
    const result = await prisma.$transaction(async (tx) => {
      if (item.slotId && item.slotId !== slotId) {
        // Spostamento tra slot diversi
        return await moveItemBetweenSlotsAtomic(tx, {
          itemId,
          fromSlotId: item.slotId,
          toSlotId: slotId,
          shopId: shop.id,
        })
      } else {
        // Assegnazione a nuovo slot (o stesso slot, ma non dovrebbe succedere)
        return await assignItemToSlotAtomic(tx, {
          itemId,
          slotId,
          shopId: shop.id,
        })
      }
    })

    await createVaultAuditLog({
      actionType: 'ITEM_MOVED_TO_SLOT',
      performedBy: user,
      itemId: itemId,
      caseId: slot.caseId,
      slotId: slotId,
      oldValue: { slotId: item.slotId, status: item.status },
      newValue: { slotId: slotId, status: newStatus },
    })

    return NextResponse.json({ data: result.item }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[POST /api/vault/merchant/items/[id]/move-slot] Error:', error)
    return handleApiError(error, 'vault-merchant-items-id-move-slot')
  }
}

