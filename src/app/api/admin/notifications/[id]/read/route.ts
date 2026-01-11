import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/notifications/[id]/read
 * Marca una notifica come letta
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      return NextResponse.json(
        { error: 'Accesso negato.' },
        { status: 403 }
      )
    }

    const { id } = params

    const notification = await prisma.adminNotification.findUnique({
      where: { id },
    })

    if (!notification) {
      return NextResponse.json(
        { error: 'Notifica non trovata' },
        { status: 404 }
      )
    }

    // Aggiungi user ID alla lista dei lettori se non già presente
    if (!notification.readByIds.includes(user.id)) {
      await prisma.adminNotification.update({
        where: { id },
        data: {
          readByIds: { push: user.id },
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Notifica marcata come letta',
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { error: 'Errore' },
      { status: 500 }
    )
  }
}

