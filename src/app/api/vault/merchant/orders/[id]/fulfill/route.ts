import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { canTransitionOrderStatus } from '@/lib/vault/state-machine'
import { notifyTrackingAdded } from '@/lib/vault/notifications'
import { z } from 'zod'
import { handleApiError } from '@/lib/api-error'

/**
 * POST /api/vault/merchant/orders/[id]/fulfill
 * Update order fulfillment (tracking, status) - MERCHANT only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = 'then' in params ? await params : params
    const { id: orderId } = resolvedParams

    // Get merchant's shop
    const shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const body = await request.json()
    const schema = z.object({
      status: z.enum(['FULFILLING', 'SHIPPED', 'DELIVERED']),
      carrier: z.string().optional(),
      trackingCode: z.string().optional(),
    })

    const data = schema.parse(body)

    // Get order
    const order = await prisma.vaultOrder.findUnique({
      where: { id: orderId },
      include: {
        fulfillment: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.shopIdFulfillment !== shop.id) {
      return NextResponse.json(
        { error: 'Order is not assigned to your shop' },
        { status: 403 }
      )
    }

    // Validate transition
    const transition = canTransitionOrderStatus(order.status, data.status)
    if (!transition.valid) {
      return NextResponse.json(
        { error: transition.reason },
        { status: 400 }
      )
    }

    // Update order and fulfillment
    const result = await prisma.$transaction(async (tx) => {
      // Update order
      const updatedOrder = await tx.vaultOrder.update({
        where: { id: orderId },
        data: { status: data.status },
      })

      // Update or create fulfillment
      if (order.fulfillment) {
        await tx.vaultFulfillment.update({
          where: { id: order.fulfillment.id },
          data: {
            status: data.status === 'SHIPPED' ? 'SHIPPED' : data.status === 'DELIVERED' ? 'DELIVERED' : 'PACKED',
            carrier: data.carrier || order.fulfillment.carrier,
            trackingCode: data.trackingCode || order.fulfillment.trackingCode,
          },
        })
      } else {
        await tx.vaultFulfillment.create({
          data: {
            orderId: orderId,
            carrier: data.carrier,
            trackingCode: data.trackingCode,
            status: data.status === 'SHIPPED' ? 'SHIPPED' : 'PACKED',
          },
        })
      }

      // If delivered, generate split after hold period (7 days)
      if (data.status === 'DELIVERED') {
        const item = await tx.vaultItem.findUnique({
          where: { id: order.itemId },
        })

        if (item && item.status === 'RESERVED') {
          // Update item to SOLD
          await tx.vaultItem.update({
            where: { id: order.itemId },
            data: { status: 'SOLD' },
          })

          // Free slot if exists
          if (item.slotId) {
            await tx.vaultCaseSlot.update({
              where: { id: item.slotId },
              data: { status: 'FREE' },
            })
          }

          // Calculate split (get price from item or order totals)
          const totals = order.totals as any
          const grossAmount = totals?.total || item.priceFinal || 0

          if (grossAmount > 0) {
            const { calculateSplit } = await import('@/lib/vault/split-calculator')
            const split = calculateSplit(grossAmount)

            // Create split with 7-day hold
            const eligibleAt = new Date()
            eligibleAt.setDate(eligibleAt.getDate() + 7)

            await tx.vaultSplit.create({
              data: {
                sourceType: 'ORDER',
                sourceId: orderId,
                itemId: order.itemId,
                ownerUserId: item.ownerUserId,
                shopId: shop.id,
                grossAmount,
                ownerAmount: split.ownerAmount,
                merchantAmount: split.merchantAmount,
                platformAmount: split.platformAmount,
                status: 'PENDING',
                eligibleAt,
              },
            })
          }
        }
      }

      return updatedOrder
    })

    await createVaultAuditLog({
      actionType: data.status === 'SHIPPED' ? 'ORDER_SHIPPED' : data.status === 'DELIVERED' ? 'ORDER_DELIVERED' : 'ORDER_FULFILLING',
      performedBy: user,
      orderId: orderId,
      oldValue: { status: order.status },
      newValue: { status: data.status },
    })

    // Notify buyer if tracking added
    if (data.status === 'SHIPPED' && data.trackingCode) {
      await notifyTrackingAdded(orderId)
    }

    return NextResponse.json({ data: result }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[POST /api/vault/merchant/orders/[id]/fulfill] Error:', error)
    return handleApiError(error, 'vault-merchant-orders-id-fulfill')
  }
}

