import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { canTransitionItemStatus } from '@/lib/vault/state-machine'
import { notifyNewOrder } from '@/lib/vault/notifications'
import { z } from 'zod'

/**
 * POST /api/vault/orders
 * Create order (checkout) - USER only
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const schema = z.object({
      itemId: z.string(),
      shippingAddress: z.object({
        name: z.string(),
        address: z.string(),
        city: z.string(),
        postalCode: z.string(),
        country: z.string().default('IT'),
      }),
      totals: z.object({
        subtotal: z.number(),
        shipping: z.number(),
        tax: z.number().optional(),
        total: z.number(),
      }),
    })

    const data = schema.parse(body)

    // Get item
    const item = await prisma.vaultItem.findUnique({
      where: { id: data.itemId },
      include: {
        shop: {
          select: { id: true, name: true, merchantId: true },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (item.status !== 'LISTED_ONLINE') {
      return NextResponse.json(
        { error: `Item is not available for online purchase. Status: ${item.status}` },
        { status: 400 }
      )
    }

    if (!item.shopIdCurrent) {
      return NextResponse.json(
        { error: 'Item is not assigned to a shop' },
        { status: 400 }
      )
    }

    // Create order and reserve item in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.vaultOrder.create({
        data: {
          itemId: data.itemId,
          buyerUserId: user.id,
          shopIdFulfillment: item.shopIdCurrent,
          status: 'PENDING_PAYMENT',
          shippingAddress: data.shippingAddress as any,
          totals: data.totals as any,
        },
      })

      // Reserve item
      const transition = canTransitionItemStatus(item.status, 'RESERVED')
      if (!transition.valid) {
        throw new Error(transition.reason)
      }

      await tx.vaultItem.update({
        where: { id: data.itemId },
        data: { status: 'RESERVED' },
      })

      return order
    })

    await createVaultAuditLog({
      actionType: 'ORDER_CREATED',
      performedBy: user,
      itemId: data.itemId,
      orderId: result.id,
      oldValue: { status: item.status },
      newValue: { status: 'RESERVED' },
    })

    // Notify merchant (after payment is confirmed, but order created is also important)
    // Will be notified again when order is paid

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[POST /api/vault/orders] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

