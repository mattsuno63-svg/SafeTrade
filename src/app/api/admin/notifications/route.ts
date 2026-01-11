import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/notifications
 * Lista notifiche per Admin/Moderator
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      return NextResponse.json(
        { error: 'Accesso negato. Solo Admin e Moderator.' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const unreadOnly = searchParams.get('unread') === 'true'
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Costruisci query
    const where: Record<string, unknown> = {
      targetRoles: { has: user.role },
    }

    if (unreadOnly) {
      where.NOT = {
        readByIds: { has: user.id },
      }
    }

    if (type) {
      where.type = type
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.adminNotification.findMany({
        where,
        orderBy: [
          { priority: 'desc' }, // URGENT first
          { createdAt: 'desc' },
        ],
        take: limit,
        include: {
          actionedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.adminNotification.count({ where }),
      prisma.adminNotification.count({
        where: {
          targetRoles: { has: user.role },
          NOT: { readByIds: { has: user.id } },
        },
      }),
    ])

    // Aggiungi flag isRead per ogni notifica
    const notificationsWithReadStatus = notifications.map((n) => ({
      ...n,
      isRead: n.readByIds.includes(user.id),
    }))

    return NextResponse.json({
      items: notificationsWithReadStatus,
      total,
      unreadCount,
    })
  } catch (error) {
    console.error('Error fetching admin notifications:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero delle notifiche' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/notifications
 * Crea una nuova notifica admin (per uso interno/worker)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    // Solo ADMIN può creare notifiche
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo Admin può creare notifiche.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { type, referenceType, referenceId, title, message, priority, targetRoles } = body

    if (!type || !referenceType || !referenceId || !title || !message) {
      return NextResponse.json(
        { error: 'Campi obbligatori: type, referenceType, referenceId, title, message' },
        { status: 400 }
      )
    }

    const notification = await prisma.adminNotification.create({
      data: {
        type,
        referenceType,
        referenceId,
        title,
        message,
        priority: priority || 'NORMAL',
        targetRoles: targetRoles || ['ADMIN', 'MODERATOR'],
      },
    })

    return NextResponse.json({
      success: true,
      notification,
    })
  } catch (error) {
    console.error('Error creating admin notification:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione della notifica' },
      { status: 500 }
    )
  }
}

