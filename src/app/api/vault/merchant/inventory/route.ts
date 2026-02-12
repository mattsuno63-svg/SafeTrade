import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/vault/merchant/inventory
 * Get merchant's vault inventory (items assigned to their shop)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Verifica se l'utente è ADMIN o HUB_STAFF
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    const isAdmin = dbUser?.role === 'ADMIN' || dbUser?.role === 'HUB_STAFF'

    let shopId: string | null = null

    if (!isAdmin) {
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

      shopId = shop.id
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const caseId = searchParams.get('caseId')

    // Validate status against enum values
    const validStatuses = [
      'PENDING_REVIEW', 'ACCEPTED', 'REJECTED', 'ASSIGNED_TO_SHOP',
      'IN_CASE', 'LISTED_ONLINE', 'RESERVED', 'SOLD', 'RETURNED',
    ]
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Valid values: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const items = await prisma.vaultItem.findMany({
      where: {
        // Se admin, mostra tutti gli item. Altrimenti solo quelli del negozio
        ...(shopId ? { shopIdCurrent: shopId } : {}),
        ...(status ? { status: status as 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'ASSIGNED_TO_SHOP' | 'IN_CASE' | 'LISTED_ONLINE' | 'RESERVED' | 'SOLD' | 'RETURNED' } : {}),
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

