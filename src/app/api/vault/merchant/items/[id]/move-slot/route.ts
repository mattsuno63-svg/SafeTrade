import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { canTransitionItemStatus } from '@/lib/vault/state-machine'
import { z } from 'zod'

/**
 * POST /api/vault/merchant/items/[id]/move-slot
 * Move item to slot (or remove from slot) - MERCHANT only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id: itemId } = params

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

      // Free the slot
      await prisma.vaultCaseSlot.update({
        where: { id: item.slotId },
        data: { status: 'FREE' },
      })

      // Update item
      const updated = await prisma.vaultItem.update({
        where: { id: itemId },
        data: {
          status: 'ASSIGNED_TO_SHOP',
          slotId: null,
          caseId: null,
        },
      })

      await createVaultAuditLog({
        actionType: 'SLOT_FREED',
        performedBy: user,
        itemId: itemId,
        slotId: item.slotId,
        oldValue: { slotId: item.slotId, status: item.status },
        newValue: { slotId: null, status: 'ASSIGNED_TO_SHOP' },
      })

      return NextResponse.json({ data: updated }, { status: 200 })
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

    // Validate transition
    const newStatus = 'IN_CASE'
    const transition = canTransitionItemStatus(item.status, newStatus)
    if (!transition.valid) {
      return NextResponse.json(
        { error: transition.reason },
        { status: 400 }
      )
    }

    // Free old slot if exists
    if (item.slotId) {
      await prisma.vaultCaseSlot.update({
        where: { id: item.slotId },
        data: { status: 'FREE' },
      })
    }

    // Update item
    const updated = await prisma.vaultItem.update({
      where: { id: itemId },
      data: {
        status: newStatus,
        caseId: slot.caseId,
        slotId: slotId,
      },
    })

    // Mark slot as occupied
    await prisma.vaultCaseSlot.update({
      where: { id: slotId },
      data: { status: 'OCCUPIED' },
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

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[POST /api/vault/merchant/items/[id]/move-slot] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

