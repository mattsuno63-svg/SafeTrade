import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ownerId = searchParams.get('ownerId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Users can only see their own items
    if (ownerId && ownerId !== user.id && user.role !== 'ADMIN' && user.role !== 'HUB_STAFF') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const where: any = {}
    
    if (ownerId) {
      where.ownerUserId = ownerId
    } else if (user.role !== 'ADMIN' && user.role !== 'HUB_STAFF') {
      // Regular users see only their items
      where.ownerUserId = user.id
    }

    if (status) {
      where.status = status
    }

    const items = await prisma.vaultItem.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        case: {
          select: {
            id: true,
            label: true,
          },
        },
        slot: {
          select: {
            id: true,
            slotCode: true,
          },
        },
        deposit: {
          select: {
            id: true,
            trackingIn: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return NextResponse.json({
      data: items,
      pagination: {
        limit,
        offset,
        total: await prisma.vaultItem.count({ where }),
      },
    })
  } catch (error: any) {
    console.error('Error fetching vault items:', error)
    return NextResponse.json(
      { error: 'Errore nel caricamento degli items' },
      { status: 500 }
    )
  }
}

