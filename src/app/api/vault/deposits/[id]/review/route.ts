import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { canTransitionItemStatus } from '@/lib/vault/state-machine'
import { notifyDepositReviewed } from '@/lib/vault/notifications'
import { z } from 'zod'

/**
 * POST /api/vault/deposits/[id]/review
 * Review deposit items (accept/reject with pricing) - HUB_STAFF/ADMIN only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireRole('ADMIN')

    const resolvedParams = 'then' in params ? await params : params
    const { id } = resolvedParams
    const body = await request.json()

    const schema = z.object({
      items: z.array(
        z.object({
          itemId: z.string(),
          action: z.enum(['ACCEPT', 'REJECT']),
          conditionVerified: z.enum(['MINT', 'NEAR_MINT', 'EXCELLENT', 'GOOD', 'PLAYED', 'POOR']).optional(),
          priceFinal: z.number().positive().optional(),
        })
      ),
    })

    const data = schema.parse(body)

    // Get deposit
    const deposit = await prisma.vaultDeposit.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
    }

    if (deposit.status !== 'RECEIVED' && deposit.status !== 'IN_REVIEW') {
      return NextResponse.json(
        { error: `Deposit must be RECEIVED or IN_REVIEW, current: ${deposit.status}` },
        { status: 400 }
      )
    }

    // Update items
    const results = await Promise.all(
      data.items.map(async ({ itemId, action, conditionVerified, priceFinal }) => {
        const item = deposit.items.find((i) => i.id === itemId)
        if (!item) {
          throw new Error(`Item ${itemId} not found in deposit`)
        }

        if (item.status !== 'PENDING_REVIEW') {
          throw new Error(`Item ${itemId} is not in PENDING_REVIEW status`)
        }

        const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'

        // Validate transition
        const transition = canTransitionItemStatus(item.status, newStatus)
        if (!transition.valid) {
          throw new Error(transition.reason)
        }

        // Update item
        const updated = await prisma.vaultItem.update({
          where: { id: itemId },
          data: {
            status: newStatus,
            conditionVerified: conditionVerified || item.conditionDeclared,
            priceFinal: priceFinal || null,
          },
        })

        // Audit log
        await createVaultAuditLog({
          actionType: action === 'ACCEPT' ? 'ITEM_ACCEPTED' : 'ITEM_REJECTED',
          performedBy: user,
          depositId: id,
          itemId: itemId,
          oldValue: { status: item.status },
          newValue: {
            status: newStatus,
            conditionVerified: conditionVerified || item.conditionDeclared,
            priceFinal: priceFinal || null,
          },
        })

        return { itemId, action, updated }
      })
    )

    // Re-fetch ALL items in deposit to calculate correct overall status
    const allItems = await prisma.vaultItem.findMany({
      where: { depositId: id },
      select: { id: true, status: true },
    })

    const totalItems = allItems.length
    const totalAccepted = allItems.filter((i) => i.status === 'ACCEPTED').length
    const totalRejected = allItems.filter((i) => i.status === 'REJECTED').length
    const totalPending = allItems.filter((i) => i.status === 'PENDING_REVIEW').length

    let depositStatus: string
    if (totalPending > 0) {
      // Still have items pending review
      depositStatus = 'IN_REVIEW'
    } else if (totalAccepted === totalItems) {
      depositStatus = 'ACCEPTED'
    } else if (totalRejected === totalItems) {
      depositStatus = 'REJECTED'
    } else {
      depositStatus = 'PARTIAL'
    }

    const updatedDeposit = await prisma.vaultDeposit.update({
      where: { id },
      data: {
        status: depositStatus as any,
        reviewedAt: new Date(),
      },
    })

    await createVaultAuditLog({
      actionType: 'DEPOSIT_REVIEWED',
      performedBy: user,
      depositId: id,
      oldValue: { status: deposit.status },
      newValue: { status: depositStatus },
    })

    // Notify depositor
    await notifyDepositReviewed(id)

    return NextResponse.json(
      {
        data: {
          deposit: updatedDeposit,
          items: results,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[POST /api/vault/deposits/[id]/review] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

