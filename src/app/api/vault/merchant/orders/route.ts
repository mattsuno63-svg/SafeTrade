import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/vault/merchant/orders
 * Get merchant's vault orders (to fulfill)
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
    const status = searchParams.get('status')

    const orders = await prisma.vaultOrder.findMany({
      where: {
        shopIdFulfillment: shop.id,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        item: {
          include: {
            owner: {
              select: { id: true, name: true },
            },
            case: {
              select: { id: true, label: true },
            },
            slot: {
              select: { id: true, slotCode: true },
            },
          },
        },
        buyer: {
          select: { id: true, name: true, email: true },
        },
        fulfillment: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: orders }, { status: 200 })
  } catch (error: any) {
    console.error('[GET /api/vault/merchant/orders] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

