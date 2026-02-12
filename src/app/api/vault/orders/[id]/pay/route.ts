import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { canTransitionOrderStatus } from '@/lib/vault/state-machine'
import { notifyNewOrder } from '@/lib/vault/notifications'

/**
 * POST /api/vault/orders/[id]/pay
 * Mark order as paid (after payment processing) - USER only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = 'then' in params ? await params : params
    const { id: orderId } = resolvedParams

    const order = await prisma.vaultOrder.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.buyerUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (order.status !== 'PENDING_PAYMENT') {
      return NextResponse.json(
        { error: `Order must be in PENDING_PAYMENT status, current: ${order.status}` },
        { status: 400 }
      )
    }

    // Validate transition
    const transition = canTransitionOrderStatus(order.status, 'PAID')
    if (!transition.valid) {
      return NextResponse.json(
        { error: transition.reason },
        { status: 400 }
      )
    }

    const updated = await prisma.vaultOrder.update({
      where: { id: orderId },
      data: { status: 'PAID' },
    })

    await createVaultAuditLog({
      actionType: 'ORDER_PAID',
      performedBy: user,
      orderId: orderId,
      oldValue: { status: order.status },
      newValue: { status: 'PAID' },
    })

    // Notify merchant of new order
    await notifyNewOrder(orderId)

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (error: any) {
    console.error('[POST /api/vault/orders/[id]/pay] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

