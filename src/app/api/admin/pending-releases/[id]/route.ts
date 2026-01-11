import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/pending-releases/[id]
 * Dettagli di una singola richiesta di rilascio
 */
export async function GET(
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
        { error: 'Accesso negato. Solo Admin e Moderator.' },
        { status: 403 }
      )
    }

    const { id } = params

    const pendingRelease = await prisma.pendingRelease.findUnique({
      where: { id },
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
          include: {
            userA: {
              select: { id: true, name: true, email: true },
            },
            userB: {
              select: { id: true, name: true, email: true },
            },
            hub: {
              select: { id: true, name: true, city: true },
            },
            shop: {
              select: { id: true, name: true, city: true },
            },
            escrowPayment: true,
          },
        },
        dispute: {
          include: {
            messages: {
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        rejectedBy: {
          select: { id: true, name: true, email: true },
        },
        auditLog: true,
      },
    })

    if (!pendingRelease) {
      return NextResponse.json(
        { error: 'Richiesta di rilascio non trovata' },
        { status: 404 }
      )
    }

    return NextResponse.json(pendingRelease)
  } catch (error) {
    console.error('Error fetching pending release:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero della richiesta' },
      { status: 500 }
    )
  }
}

