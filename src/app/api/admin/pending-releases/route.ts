import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/pending-releases
 * Lista tutte le richieste di rilascio fondi in attesa di approvazione
 * Solo ADMIN e MODERATOR possono accedere
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    // Solo ADMIN e MODERATOR possono vedere pending releases
    if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      return NextResponse.json(
        { error: 'Accesso negato. Solo Admin e Moderator possono approvare rilasci.' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'PENDING'
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Costruisci filtri
    const where: Record<string, unknown> = {}
    
    if (status && status !== 'ALL') {
      where.status = status
    }
    
    if (type) {
      where.type = type
    }

    // Query pending releases con relazioni
    const [pendingReleases, total] = await Promise.all([
      prisma.pendingRelease.findMany({
        where,
        include: {
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          order: {
            select: {
              id: true,
              status: true,
              scheduledDate: true,
              completedAt: true,
              packageStatus: true,
              userA: {
                select: { id: true, name: true, email: true },
              },
              userB: {
                select: { id: true, name: true, email: true },
              },
              hub: {
                select: { id: true, name: true },
              },
              shop: {
                select: { id: true, name: true },
              },
            },
          },
          dispute: {
            select: {
              id: true,
              type: true,
              status: true,
              title: true,
            },
          },
          approvedBy: {
            select: { id: true, name: true, email: true },
          },
          rejectedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [
          { status: 'asc' }, // PENDING first
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.pendingRelease.count({ where }),
    ])

    // Conta per tipo e status per statistiche
    const stats = await prisma.pendingRelease.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const statsMap = stats.reduce((acc, s) => {
      acc[s.status] = s._count.id
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      items: pendingReleases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        pending: statsMap['PENDING'] || 0,
        approved: statsMap['APPROVED'] || 0,
        rejected: statsMap['REJECTED'] || 0,
        expired: statsMap['EXPIRED'] || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching pending releases:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero delle richieste pendenti' },
      { status: 500 }
    )
  }
}

