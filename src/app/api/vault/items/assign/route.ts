import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { canTransitionItemStatus } from '@/lib/vault/state-machine'
import { notifyItemsAssigned } from '@/lib/vault/notifications'
import { z } from 'zod'

/**
 * POST /api/vault/items/assign
 * Assign items to shop (optionally to case and slot) - HUB_STAFF/ADMIN only
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('ADMIN')

    const body = await request.json()
    const schema = z.object({
      itemIds: z.array(z.string()).min(1),
      shopId: z.string(),
      caseId: z.string().optional(),
      slotId: z.string().optional(),
    })

    const data = schema.parse(body)

    // Verify shop exists and is vault-enabled
    const shop = await prisma.shop.findUnique({
      where: { id: data.shopId },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    if (!shop.vaultEnabled) {
      return NextResponse.json(
        { error: 'Shop is not enrolled in Vault program' },
        { status: 400 }
      )
    }

    // If caseId or slotId provided, verify they exist and are valid
    if (data.caseId || data.slotId) {
      if (data.slotId) {
        const slot = await prisma.vaultCaseSlot.findUnique({
          where: { id: data.slotId },
          include: { case: true },
        })

        if (!slot) {
          return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
        }

        if (slot.status !== 'FREE') {
          return NextResponse.json({ error: 'Slot is not free' }, { status: 400 })
        }

        if (slot.case.shopId !== data.shopId) {
          return NextResponse.json(
            { error: 'Slot does not belong to specified shop' },
            { status: 400 }
          )
        }

        if (data.caseId && slot.caseId !== data.caseId) {
          return NextResponse.json(
            { error: 'Slot does not belong to specified case' },
            { status: 400 }
          )
        }
      } else if (data.caseId) {
        const case_ = await prisma.vaultCase.findUnique({
          where: { id: data.caseId },
        })

        if (!case_) {
          return NextResponse.json({ error: 'Case not found' }, { status: 404 })
        }

        if (case_.shopId !== data.shopId) {
          return NextResponse.json(
            { error: 'Case does not belong to specified shop' },
            { status: 400 }
          )
        }
      }
    }

    // Assign items
    const results = await Promise.all(
      data.itemIds.map(async (itemId) => {
        const item = await prisma.vaultItem.findUnique({
          where: { id: itemId },
        })

        if (!item) {
          throw new Error(`Item ${itemId} not found`)
        }

        if (item.status !== 'ACCEPTED') {
          throw new Error(`Item ${itemId} must be ACCEPTED, current: ${item.status}`)
        }

        const newStatus = data.slotId ? 'IN_CASE' : 'ASSIGNED_TO_SHOP'

        // Validate transition
        const transition = canTransitionItemStatus(item.status, newStatus)
        if (!transition.valid) {
          throw new Error(transition.reason)
        }

        // Update item
        const updateData: any = {
          status: newStatus,
          shopIdCurrent: data.shopId,
        }

        if (data.caseId) {
          updateData.caseId = data.caseId
        }

        if (data.slotId) {
          updateData.slotId = data.slotId
        }

        const updated = await prisma.vaultItem.update({
          where: { id: itemId },
          data: updateData,
        })

        // If slot assigned, mark as occupied
        if (data.slotId) {
          await prisma.vaultCaseSlot.update({
            where: { id: data.slotId },
            data: { status: 'OCCUPIED' },
          })

          await createVaultAuditLog({
            actionType: 'SLOT_OCCUPIED',
            performedBy: user,
            itemId: itemId,
            caseId: data.caseId,
            slotId: data.slotId,
          })
        }

        // Audit log
        await createVaultAuditLog({
          actionType: 'ITEM_ASSIGNED_TO_SHOP',
          performedBy: user,
          itemId: itemId,
          oldValue: { status: item.status, shopIdCurrent: item.shopIdCurrent },
          newValue: {
            status: newStatus,
            shopIdCurrent: data.shopId,
            caseId: data.caseId,
            slotId: data.slotId,
          },
        })

        return { itemId, updated }
      })
    )

    // Notify merchant
    await notifyItemsAssigned(data.shopId, data.itemIds)

    return NextResponse.json({ data: results }, { status: 200 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[POST /api/vault/items/assign] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

