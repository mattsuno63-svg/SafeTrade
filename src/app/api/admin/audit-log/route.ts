import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/audit-log
 * Lista audit log delle azioni finanziarie
 * Solo ADMIN può vedere l'audit log completo
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    // Solo ADMIN può vedere l'audit log completo
    // MODERATOR può vedere solo le proprie azioni
    if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      return NextResponse.json(
        { error: 'Accesso negato.' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const actionType = searchParams.get('action_type')
    const performedById = searchParams.get('performed_by')
    const orderId = searchParams.get('order_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Costruisci filtri
    const where: Record<string, unknown> = {}

    // MODERATOR può vedere solo le proprie azioni
    if (user.role === 'MODERATOR') {
      where.performedById = user.id
    } else if (performedById) {
      where.performedById = performedById
    }

    if (actionType) {
      where.actionType = { contains: actionType }
    }

    if (orderId) {
      where.orderId = orderId
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        (where.createdAt as Record<string, Date>).gte = new Date(dateFrom)
      }
      if (dateTo) {
        (where.createdAt as Record<string, Date>).lte = new Date(dateTo)
      }
    }

    const [auditLogs, total] = await Promise.all([
      prisma.financialAuditLog.findMany({
        where,
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          pendingRelease: {
            select: {
              id: true,
              type: true,
              amount: true,
              status: true,
              recipient: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.financialAuditLog.count({ where }),
    ])

    // Statistiche (solo per ADMIN)
    let stats = null
    if (user.role === 'ADMIN') {
      const [totalApproved, totalRejected, totalAmount] = await Promise.all([
        prisma.financialAuditLog.count({
          where: { actionType: { contains: 'APPROVED' } },
        }),
        prisma.financialAuditLog.count({
          where: { actionType: { contains: 'REJECTED' } },
        }),
        prisma.financialAuditLog.aggregate({
          where: { actionType: { contains: 'APPROVED' } },
          _sum: { amount: true },
        }),
      ])

      stats = {
        totalApproved,
        totalRejected,
        totalAmountReleased: totalAmount._sum.amount || 0,
      }
    }

    return NextResponse.json({
      items: auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    })
  } catch (error) {
    console.error('Error fetching audit log:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dell\'audit log' },
      { status: 500 }
    )
  }
}

