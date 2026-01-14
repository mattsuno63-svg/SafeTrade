import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/vault/merchant/available-items
 * Lista carte disponibili per assegnazione a slot (ASSIGNED_TO_SHOP, non ancora in teca)
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

    if (!shop.vaultCaseAuthorized) {
      return NextResponse.json(
        { error: 'Il tuo negozio non è autorizzato ad utilizzare le teche Vault' },
        { status: 403 }
      )
    }

    // Get carte disponibili (ASSIGNED_TO_SHOP, non in slot)
    const items = await prisma.vaultItem.findMany({
      where: {
        shopIdCurrent: shop.id,
        status: 'ASSIGNED_TO_SHOP',
        slotId: null, // Non già in uno slot
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        deposit: {
          select: {
            id: true,
            depositor: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      data: items.map((item) => ({
        id: item.id,
        name: item.name,
        game: item.game,
        set: item.set,
        conditionDeclared: item.conditionDeclared,
        conditionVerified: item.conditionVerified,
        priceFinal: item.priceFinal,
        photos: item.photos,
        owner: item.owner,
        deposit: item.deposit,
        createdAt: item.createdAt,
      })),
    }, { status: 200 })
  } catch (error: any) {
    console.error('[GET /api/vault/merchant/available-items] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

