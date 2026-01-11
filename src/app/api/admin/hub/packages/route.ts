import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'portelli.mattiaa@gmail.com'

/**
 * GET /api/admin/hub/packages
 * Lista tutti i pacchi gestiti dall'Hub admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Accesso negato. Solo Admin.' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Trova l'hub dell'admin
    const hub = await prisma.escrowHub.findUnique({
      where: { providerId: user.id },
    })

    if (!hub) {
      return NextResponse.json({
        packages: [],
        pagination: { total: 0, pages: 0, page, limit },
        stats: {},
        message: 'Hub non ancora creato. Vai a /api/admin/hub per crearlo.',
      })
    }

    // Query filtri
    const where: Record<string, unknown> = {
      hubId: hub.id,
    }

    if (status && status !== 'ALL') {
      where.packageStatus = status
    }

    const [packages, total, stats] = await Promise.all([
      prisma.safeTradeTransaction.findMany({
        where,
        include: {
          userA: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          userB: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          proposal: {
            include: {
              listing: {
                select: { id: true, title: true, price: true, images: true },
              },
            },
          },
          escrowPayment: true,
        },
        orderBy: [
          { packageStatus: 'asc' }, // PENDING/IN_TRANSIT first
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.safeTradeTransaction.count({ where }),
      prisma.safeTradeTransaction.groupBy({
        by: ['packageStatus'],
        where: { hubId: hub.id },
        _count: { id: true },
      }),
    ])

    const statsMap = stats.reduce((acc, s) => {
      if (s.packageStatus) {
        acc[s.packageStatus] = s._count.id
      }
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      packages,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
      stats: {
        PENDING: statsMap['PENDING'] || 0,
        IN_TRANSIT: statsMap['IN_TRANSIT'] || 0,
        RECEIVED: statsMap['RECEIVED'] || 0,
        VERIFIED: statsMap['VERIFIED'] || 0,
        SHIPPED: statsMap['SHIPPED'] || 0,
        DELIVERED: statsMap['DELIVERED'] || 0,
        RETURNED: statsMap['RETURNED'] || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching hub packages:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dei pacchi' },
      { status: 500 }
    )
  }
}

