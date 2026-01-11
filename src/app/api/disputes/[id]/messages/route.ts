import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/disputes/[id]/messages
 * Ottieni tutti i messaggi di una disputa
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

    const { id: disputeId } = await params

    // Verifica disputa esiste e utente autorizzato
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        transaction: {
          select: {
            userAId: true,
            userBId: true,
            hub: { select: { providerId: true } },
          },
        },
      },
    })

    if (!dispute) {
      return NextResponse.json(
        { error: 'Disputa non trovata' },
        { status: 404 }
      )
    }

    // Verifica autorizzazione
    const isInvolved = 
      dispute.openedById === user.id ||
      dispute.transaction.userAId === user.id || 
      dispute.transaction.userBId === user.id ||
      dispute.transaction.hub?.providerId === user.id ||
      user.role === 'ADMIN' ||
      user.role === 'MODERATOR'

    if (!isInvolved) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      )
    }

    // Query messaggi (nasconde interni se non admin)
    const isAdmin = user.role === 'ADMIN' || user.role === 'MODERATOR'
    
    const messages = await prisma.disputeMessage.findMany({
      where: {
        disputeId,
        ...(isAdmin ? {} : { isInternal: false }),
      },
      include: {
        sender: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            avatar: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ 
      messages,
      count: messages.length,
    })

  } catch (error) {
    console.error('Error fetching dispute messages:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dei messaggi' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/disputes/[id]/messages
 * Aggiungi un messaggio a una disputa
 * 
 * Body:
 * - content: string (testo messaggio)
 * - photos: string[] (URL foto allegate, opzionale)
 * - isInternal: boolean (solo admin, messaggio interno)
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

    const { id: disputeId } = await params
    const body = await request.json()
    const { content, photos = [], isInternal = false } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Il contenuto del messaggio è richiesto' },
        { status: 400 }
      )
    }

    // Verifica disputa esiste
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        transaction: {
          select: {
            userAId: true,
            userBId: true,
            hub: { select: { providerId: true } },
          },
        },
      },
    })

    if (!dispute) {
      return NextResponse.json(
        { error: 'Disputa non trovata' },
        { status: 404 }
      )
    }

    // Verifica autorizzazione
    const isBuyer = dispute.transaction.userAId === user.id
    const isSeller = dispute.transaction.userBId === user.id
    const isHub = dispute.transaction.hub?.providerId === user.id
    const isAdmin = user.role === 'ADMIN' || user.role === 'MODERATOR'

    if (!isBuyer && !isSeller && !isHub && !isAdmin) {
      return NextResponse.json(
        { error: 'Non autorizzato a inviare messaggi in questa disputa' },
        { status: 403 }
      )
    }

    // Solo admin può inviare messaggi interni
    if (isInternal && !isAdmin) {
      return NextResponse.json(
        { error: 'Solo admin/moderator possono inviare messaggi interni' },
        { status: 403 }
      )
    }

    // Verifica che la disputa non sia chiusa
    if (['RESOLVED', 'CLOSED'].includes(dispute.status)) {
      return NextResponse.json(
        { error: 'Non puoi inviare messaggi in una disputa chiusa' },
        { status: 400 }
      )
    }

    // Crea messaggio
    const message = await prisma.disputeMessage.create({
      data: {
        disputeId,
        senderId: user.id,
        content: content.trim(),
        photos: photos || [],
        isInternal: isInternal && isAdmin,
      },
      include: {
        sender: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            avatar: true,
            role: true,
          },
        },
      },
    })

    // Notifica le altre parti (se non messaggio interno)
    if (!isInternal) {
      const usersToNotify = new Set<string>()
      
      // Aggiungi buyer e seller (escluso chi ha inviato)
      if (dispute.transaction.userAId !== user.id) {
        usersToNotify.add(dispute.transaction.userAId)
      }
      if (dispute.transaction.userBId !== user.id) {
        usersToNotify.add(dispute.transaction.userBId)
      }
      // Se c'è un hub e non è chi ha inviato
      if (dispute.transaction.hub?.providerId && dispute.transaction.hub.providerId !== user.id) {
        usersToNotify.add(dispute.transaction.hub.providerId)
      }
      // Se c'è un mediatore assegnato
      if (dispute.mediatorId && dispute.mediatorId !== user.id) {
        usersToNotify.add(dispute.mediatorId)
      }

      // Crea notifiche
      for (const userId of usersToNotify) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'DISPUTE_MESSAGE',
            title: '💬 Nuovo messaggio disputa',
            message: `${user.name || 'Utente'} ha inviato un messaggio nella disputa.`,
            link: `/disputes/${disputeId}`,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message,
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating dispute message:', error)
    return NextResponse.json(
      { error: 'Errore nell\'invio del messaggio' },
      { status: 500 }
    )
  }
}

