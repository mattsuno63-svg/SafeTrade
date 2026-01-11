import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/disputes
 * Lista dispute (admin vede tutte, utenti vedono le proprie)
 * 
 * Query params:
 * - status: filtra per stato (OPEN, SELLER_RESPONSE, IN_MEDIATION, ESCALATED, RESOLVED, CLOSED)
 * - type: filtra per tipo
 * - page: pagina (default 1)
 * - limit: elementi per pagina (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const isAdmin = user.role === 'ADMIN' || user.role === 'MODERATOR'

    // Build query
    const where: Record<string, unknown> = {}

    // Admin vede tutte, utenti solo le proprie
    if (!isAdmin) {
      where.OR = [
        { openedById: user.id },
        { transaction: { userAId: user.id } },
        { transaction: { userBId: user.id } },
        { transaction: { hub: { providerId: user.id } } },
      ]
    }

    // Filtri
    if (status) {
      where.status = status
    }
    if (type) {
      where.type = type
    }

    const [disputes, total, stats] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          openedBy: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          transaction: {
            select: {
              id: true,
              status: true,
              userA: { select: { id: true, name: true, avatar: true } },
              userB: { select: { id: true, name: true, avatar: true } },
              proposal: {
                select: {
                  listing: {
                    select: { title: true, images: true },
                  },
                },
              },
              escrowPayment: {
                select: { amount: true, status: true },
              },
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: [
          { status: 'asc' }, // OPEN/ESCALATED first
          { openedAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.dispute.count({ where }),
      // Stats per status
      prisma.dispute.groupBy({
        by: ['status'],
        where: isAdmin ? {} : where,
        _count: { id: true },
      }),
    ])

    // Formatta stats
    const statsMap = stats.reduce((acc, s) => {
      acc[s.status] = s._count.id
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      disputes,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
      stats: {
        OPEN: statsMap.OPEN || 0,
        SELLER_RESPONSE: statsMap.SELLER_RESPONSE || 0,
        IN_MEDIATION: statsMap.IN_MEDIATION || 0,
        ESCALATED: statsMap.ESCALATED || 0,
        RESOLVED: statsMap.RESOLVED || 0,
        CLOSED: statsMap.CLOSED || 0,
        total,
      },
    })

  } catch (error) {
    console.error('Error fetching disputes:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero delle dispute' },
      { status: 500 }
    )
  }
}

