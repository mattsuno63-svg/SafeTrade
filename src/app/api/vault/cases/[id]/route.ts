import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

/**
 * GET /api/vault/cases/[id]
 * Get case details with slots
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = 'then' in params ? await params : params
    const { id } = resolvedParams

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
                set: true,
                status: true,
                priceFinal: true,
                photos: true,
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
  } catch (error) {
    console.error('[GET /api/vault/cases/[id]] Error:', error)
    return handleApiError(error, 'vault-cases-id')
  }
}

