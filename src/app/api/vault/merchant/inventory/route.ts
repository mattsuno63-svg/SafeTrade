import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/vault/merchant/inventory
 * Get merchant's vault inventory (items assigned to their shop)
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

    if (!shop.vaultEnabled) {
      return NextResponse.json(
        { error: 'Shop is not enrolled in Vault program' },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const caseId = searchParams.get('caseId')

    const items = await prisma.vaultItem.findMany({
      where: {
        shopIdCurrent: shop.id,
        ...(status ? { status: status as any } : {}),
        ...(caseId ? { caseId } : {}),
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        case: {
          select: { id: true, label: true },
        },
        slot: {
          select: { id: true, slotCode: true },
        },
        order: {
          select: {
            id: true,
            status: true,
            buyer: {
              select: { id: true, name: true },
            },
          },
        },
        sale: {
          select: {
            id: true,
            soldPrice: true,
            soldAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: items }, { status: 200 })
  } catch (error: any) {
    console.error('[GET /api/vault/merchant/inventory] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

