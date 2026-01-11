import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { DisputeType, DisputeStatus, AdminNotificationType, NotificationPriority } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/transactions/[id]/dispute
 * Apri una disputa su una transazione
 * 
 * Body:
 * - type: DisputeType (NOT_DELIVERED, DAMAGED_CARDS, WRONG_CONTENT, etc.)
 * - title: string
 * - description: string (dettagli del problema)
 * - photos: string[] (URL foto evidenze)
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

    const { id: transactionId } = await params
    const body = await request.json()
    const { type, title, description, photos = [] } = body

    // Validazione input
    if (!type || !title || !description) {
      return NextResponse.json(
        { error: 'Tipo, titolo e descrizione sono obbligatori' },
        { status: 400 }
      )
    }

    // Verifica che il tipo sia valido
    const validTypes: DisputeType[] = [
      'NOT_DELIVERED', 'DAMAGED_CARDS', 'WRONG_CONTENT', 
      'MISSING_ITEMS', 'CONDITION_MISMATCH', 'DELAY', 'OTHER'
    ]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Tipo non valido. Tipi ammessi: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Trova la transazione
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id: transactionId },
      include: {
        userA: { select: { id: true, name: true, email: true } },
        userB: { select: { id: true, name: true, email: true } },
        escrowPayment: true,
        disputes: {
          where: {
            status: { in: ['OPEN', 'SELLER_RESPONSE', 'IN_MEDIATION', 'ESCALATED'] }
          }
        },
        hub: { select: { id: true, providerId: true, name: true } },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // Verifica che l'utente sia coinvolto nella transazione
    const isBuyer = transaction.userAId === user.id
    const isSeller = transaction.userBId === user.id
    const isHub = transaction.hub?.providerId === user.id
    const isAdmin = user.role === 'ADMIN' || user.role === 'MODERATOR'

    if (!isBuyer && !isSeller && !isHub && !isAdmin) {
      return NextResponse.json(
        { error: 'Non sei autorizzato ad aprire una disputa su questa transazione' },
        { status: 403 }
      )
    }

    // Verifica che non ci siano già dispute aperte
    if (transaction.disputes.length > 0) {
      return NextResponse.json(
        { error: 'Esiste già una disputa aperta per questa transazione' },
        { status: 400 }
      )
    }

    // Verifica che la transazione sia in uno stato valido per aprire disputa
    // (non PENDING, non già CANCELLED o COMPLETED da troppo tempo)
    const validStatuses = ['IN_PROGRESS', 'COMPLETED']
    if (!validStatuses.includes(transaction.status)) {
      return NextResponse.json(
        { error: `Non puoi aprire una disputa su una transazione in stato "${transaction.status}"` },
        { status: 400 }
      )
    }

    // Se completata, verifica che non siano passati più di 14 giorni
    if (transaction.status === 'COMPLETED' && transaction.completedAt) {
      const daysSinceCompletion = Math.floor(
        (Date.now() - transaction.completedAt.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceCompletion > 14) {
        return NextResponse.json(
          { error: 'Non puoi aprire una disputa su una transazione completata da più di 14 giorni' },
          { status: 400 }
        )
      }
    }

    // Calcola deadline per risposta seller (48h)
    const sellerResponseDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000)

    // Crea la disputa
    const dispute = await prisma.dispute.create({
      data: {
        transactionId,
        type: type as DisputeType,
        status: 'OPEN' as DisputeStatus,
        title,
        description,
        openedById: user.id,
        photos: photos || [],
        sellerResponseDeadline,
        openedAt: new Date(),
      },
      include: {
        openedBy: {
          select: { id: true, name: true, email: true },
        },
        transaction: {
          select: {
            id: true,
            userA: { select: { id: true, name: true, email: true } },
            userB: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    // Notifica l'altra parte (se buyer apre, notifica seller e viceversa)
    const notifyUserId = isBuyer ? transaction.userBId : transaction.userAId
    
    await prisma.notification.create({
      data: {
        userId: notifyUserId,
        type: 'DISPUTE_OPENED',
        title: '⚠️ Disputa aperta',
        message: `${user.name || user.email} ha aperto una disputa sulla transazione. Hai 48 ore per rispondere.`,
        link: `/disputes/${dispute.id}`,
      },
    })

    // Notifica admin/moderator
    await prisma.adminNotification.create({
      data: {
        type: 'DISPUTE_OPENED' as AdminNotificationType,
        referenceType: 'DISPUTE',
        referenceId: dispute.id,
        title: '⚠️ Nuova disputa aperta',
        message: `Disputa #${dispute.id.slice(0, 8)} - ${title}. Tipo: ${type}. Aperta da ${user.name || user.email}.`,
        targetRoles: ['ADMIN', 'MODERATOR'],
        priority: 'HIGH' as NotificationPriority,
      },
    })

    // Se c'è un hub, notifica anche lui
    if (transaction.hub && transaction.hub.providerId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: transaction.hub.providerId,
          type: 'DISPUTE_OPENED',
          title: '⚠️ Disputa aperta su transazione Hub',
          message: `È stata aperta una disputa sulla transazione ${transactionId.slice(0, 8)}. Tipo: ${type}`,
          link: `/disputes/${dispute.id}`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      dispute,
      message: 'Disputa aperta con successo. L\'altra parte ha 48 ore per rispondere.',
      sellerResponseDeadline,
    }, { status: 201 })

  } catch (error) {
    console.error('Error opening dispute:', error)
    return NextResponse.json(
      { error: 'Errore nell\'apertura della disputa', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/transactions/[id]/dispute
 * Ottieni dispute attive per questa transazione
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

    const { id: transactionId } = await params

    // Trova la transazione
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id: transactionId },
      select: {
        userAId: true,
        userBId: true,
        hub: { select: { providerId: true } },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // Verifica autorizzazione
    const isInvolved = 
      transaction.userAId === user.id || 
      transaction.userBId === user.id ||
      transaction.hub?.providerId === user.id ||
      user.role === 'ADMIN' ||
      user.role === 'MODERATOR'

    if (!isInvolved) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      )
    }

    // Trova le dispute
    const disputes = await prisma.dispute.findMany({
      where: { transactionId },
      include: {
        openedBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            sender: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { openedAt: 'desc' },
    })

    return NextResponse.json({ disputes })

  } catch (error) {
    console.error('Error fetching disputes:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero delle dispute' },
      { status: 500 }
    )
  }
}

