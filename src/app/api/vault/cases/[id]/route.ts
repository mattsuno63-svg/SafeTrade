import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/vault/cases/[id]
 * Get case details with slots
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params

    const case_ = await prisma.vaultCase.findUnique({
      where: { id },
      include: {
        shop: {
          select: { id: true, name: true, merchantId: true },
        },
        authorizedShop: {
          select: { id: true, name: true, merchantId: true },
        },
        slots: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                game: true,
                status: true,
                owner: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { slotCode: 'asc' },
        },
      },
    })

    if (!case_) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Check permissions
    if (user.role !== 'ADMIN' && user.role !== 'HUB_STAFF') {
      if (case_.authorizedShopId) {
        // Merchant can see their own authorized cases
        const shop = await prisma.shop.findUnique({
          where: { id: case_.authorizedShopId },
        })
        if (shop?.merchantId !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({ data: case_ }, { status: 200 })
  } catch (error: any) {
    console.error('[GET /api/vault/cases/[id]] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

