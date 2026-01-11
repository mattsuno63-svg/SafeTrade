import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { 
  DisputeStatus, 
  DisputeResolution, 
  PendingReleaseType,
  AdminNotificationType, 
  NotificationPriority 
} from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/disputes/[id]
 * Ottieni dettagli di una disputa
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

    const { id } = await params

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        openedBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        transaction: {
          include: {
            userA: { select: { id: true, name: true, email: true, avatar: true } },
            userB: { select: { id: true, name: true, email: true, avatar: true } },
            proposal: {
              include: {
                listing: {
                  select: { id: true, title: true, price: true, images: true },
                },
              },
            },
            escrowPayment: true,
            hub: { select: { id: true, providerId: true, name: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, email: true, avatar: true, role: true },
            },
          },
        },
        pendingReleases: {
          orderBy: { createdAt: 'desc' },
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
        { error: 'Non autorizzato a visualizzare questa disputa' },
        { status: 403 }
      )
    }

    // Calcola info aggiuntive
    const now = new Date()
    const isDeadlinePassed = dispute.sellerResponseDeadline 
      ? now > dispute.sellerResponseDeadline 
      : false
    const hoursUntilDeadline = dispute.sellerResponseDeadline
      ? Math.max(0, Math.floor((dispute.sellerResponseDeadline.getTime() - now.getTime()) / (1000 * 60 * 60)))
      : null

    return NextResponse.json({
      dispute,
      meta: {
        isDeadlinePassed,
        hoursUntilDeadline,
        canRespond: dispute.status === 'OPEN' && !isDeadlinePassed,
        canEscalate: dispute.status === 'SELLER_RESPONSE' || isDeadlinePassed,
        canResolve: user.role === 'ADMIN' || user.role === 'MODERATOR',
      },
    })

  } catch (error) {
    console.error('Error fetching dispute:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero della disputa' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/disputes/[id]
 * Aggiorna stato/risoluzione di una disputa
 * 
 * Azioni possibili:
 * - respond: Venditore risponde alla disputa
 * - escalate: Acquirente escala ad admin
 * - mediate: Admin prende in carico la mediazione
 * - resolve: Admin risolve la disputa
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, message, resolution, resolutionAmount, photos = [] } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Azione richiesta' },
        { status: 400 }
      )
    }

    // Trova la disputa
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        transaction: {
          include: {
            userA: { select: { id: true, name: true, email: true } },
            userB: { select: { id: true, name: true, email: true } },
            escrowPayment: true,
            hub: { select: { providerId: true } },
          },
        },
        openedBy: { select: { id: true, name: true, email: true } },
      },
    })

    if (!dispute) {
      return NextResponse.json(
        { error: 'Disputa non trovata' },
        { status: 404 }
      )
    }

    const isBuyer = dispute.transaction.userAId === user.id
    const isSeller = dispute.transaction.userBId === user.id
    const isAdmin = user.role === 'ADMIN' || user.role === 'MODERATOR'
    const isHub = dispute.transaction.hub?.providerId === user.id

    let updateData: Record<string, unknown> = {}
    let notificationData: { userId: string; title: string; message: string }[] = []

    switch (action) {
      case 'respond':
        // Solo il seller può rispondere
        if (!isSeller) {
          return NextResponse.json(
            { error: 'Solo il venditore può rispondere alla disputa' },
            { status: 403 }
          )
        }
        if (dispute.status !== 'OPEN') {
          return NextResponse.json(
            { error: 'La disputa non è in stato OPEN' },
            { status: 400 }
          )
        }
        if (!message) {
          return NextResponse.json(
            { error: 'Messaggio di risposta richiesto' },
            { status: 400 }
          )
        }

        // Crea messaggio di risposta
        await prisma.disputeMessage.create({
          data: {
            disputeId: id,
            senderId: user.id,
            content: message,
            photos: photos,
          },
        })

        updateData = {
          status: 'SELLER_RESPONSE' as DisputeStatus,
        }

        // Notifica buyer
        notificationData.push({
          userId: dispute.transaction.userAId,
          title: '💬 Risposta dal venditore',
          message: `Il venditore ha risposto alla tua disputa. Controlla i dettagli.`,
        })
        break

      case 'escalate':
        // Buyer o seller possono escalare
        if (!isBuyer && !isSeller) {
          return NextResponse.json(
            { error: 'Solo le parti coinvolte possono escalare' },
            { status: 403 }
          )
        }
        if (!['OPEN', 'SELLER_RESPONSE'].includes(dispute.status)) {
          return NextResponse.json(
            { error: 'La disputa non può essere escalata in questo stato' },
            { status: 400 }
          )
        }

        updateData = {
          status: 'ESCALATED' as DisputeStatus,
        }

        // Notifica admin
        await prisma.adminNotification.create({
          data: {
            type: 'DISPUTE_ESCALATED' as AdminNotificationType,
            referenceType: 'DISPUTE',
            referenceId: id,
            title: '🚨 Disputa escalata',
            message: `La disputa #${id.slice(0, 8)} è stata escalata e richiede intervento immediato.`,
            targetRoles: ['ADMIN', 'MODERATOR'],
            priority: 'URGENT' as NotificationPriority,
          },
        })
        break

      case 'mediate':
        // Solo admin può prendere in carico
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Solo admin/moderator possono mediare' },
            { status: 403 }
          )
        }

        updateData = {
          status: 'IN_MEDIATION' as DisputeStatus,
          mediatorId: user.id,
          mediationDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72h
        }

        // Notifica entrambe le parti
        notificationData.push(
          {
            userId: dispute.transaction.userAId,
            title: '👤 Mediatore assegnato',
            message: `Un mediatore ha preso in carico la tua disputa.`,
          },
          {
            userId: dispute.transaction.userBId,
            title: '👤 Mediatore assegnato',
            message: `Un mediatore ha preso in carico la disputa.`,
          }
        )
        break

      case 'resolve':
        // Solo admin può risolvere
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Solo admin/moderator possono risolvere dispute' },
            { status: 403 }
          )
        }
        if (!resolution) {
          return NextResponse.json(
            { error: 'Risoluzione richiesta' },
            { status: 400 }
          )
        }

        // Valida resolution
        const validResolutions: DisputeResolution[] = [
          'REFUND_FULL', 'REFUND_PARTIAL', 'REPLACEMENT',
          'RETURN_REQUIRED', 'REJECTED', 'IN_FAVOR_BUYER', 'IN_FAVOR_SELLER'
        ]
        if (!validResolutions.includes(resolution)) {
          return NextResponse.json(
            { error: `Risoluzione non valida. Opzioni: ${validResolutions.join(', ')}` },
            { status: 400 }
          )
        }

        // Se rimborso parziale, serve amount
        if (resolution === 'REFUND_PARTIAL' && !resolutionAmount) {
          return NextResponse.json(
            { error: 'Importo rimborso richiesto per rimborso parziale' },
            { status: 400 }
          )
        }

        const now = new Date()
        updateData = {
          status: 'RESOLVED' as DisputeStatus,
          resolution: resolution as DisputeResolution,
          resolutionNotes: message || null,
          resolutionAmount: resolutionAmount || null,
          resolvedById: user.id,
          resolvedAt: now,
          closedAt: now,
        }

        // Crea PendingRelease per rimborso se necessario
        if (['REFUND_FULL', 'REFUND_PARTIAL', 'IN_FAVOR_BUYER'].includes(resolution)) {
          const refundAmount = resolution === 'REFUND_PARTIAL' 
            ? resolutionAmount 
            : dispute.transaction.escrowPayment?.amount || 0

          if (refundAmount > 0) {
            await prisma.pendingRelease.create({
              data: {
                orderId: dispute.transactionId,
                disputeId: id,
                type: resolution === 'REFUND_PARTIAL' ? 'REFUND_PARTIAL' : 'REFUND_FULL' as PendingReleaseType,
                amount: refundAmount,
                recipientId: dispute.transaction.userAId, // Buyer
                recipientType: 'BUYER',
                status: 'PENDING',
                triggeredBy: 'DISPUTE_RESOLVED',
                reason: `Rimborso da disputa: ${resolution}. ${message || ''}`,
              },
            })

            // Notifica admin per approvazione rimborso
            await prisma.adminNotification.create({
              data: {
                type: 'PENDING_RELEASE' as AdminNotificationType,
                referenceType: 'PENDING_RELEASE',
                referenceId: id,
                title: '💰 Rimborso disputa in attesa',
                message: `Rimborso €${refundAmount.toFixed(2)} da approvare per disputa #${id.slice(0, 8)}.`,
                targetRoles: ['ADMIN', 'MODERATOR'],
                priority: 'HIGH' as NotificationPriority,
              },
            })
          }
        }

        // Se a favore seller, rilascia fondi
        if (resolution === 'IN_FAVOR_SELLER') {
          const releaseAmount = dispute.transaction.escrowPayment?.amount || 0
          if (releaseAmount > 0) {
            await prisma.pendingRelease.create({
              data: {
                orderId: dispute.transactionId,
                disputeId: id,
                type: 'RELEASE_TO_SELLER' as PendingReleaseType,
                amount: releaseAmount,
                recipientId: dispute.transaction.userBId, // Seller
                recipientType: 'SELLER',
                status: 'PENDING',
                triggeredBy: 'DISPUTE_RESOLVED',
                reason: `Disputa risolta a favore del venditore. ${message || ''}`,
              },
            })
          }
        }

        // Notifica entrambe le parti
        const resolutionText = getResolutionText(resolution as DisputeResolution)
        notificationData.push(
          {
            userId: dispute.transaction.userAId,
            title: '✅ Disputa risolta',
            message: `La disputa è stata risolta: ${resolutionText}.`,
          },
          {
            userId: dispute.transaction.userBId,
            title: '✅ Disputa risolta',
            message: `La disputa è stata risolta: ${resolutionText}.`,
          }
        )
        break

      default:
        return NextResponse.json(
          { error: `Azione non valida: ${action}. Azioni: respond, escalate, mediate, resolve` },
          { status: 400 }
        )
    }

    // Aggiorna disputa
    const updatedDispute = await prisma.dispute.update({
      where: { id },
      data: updateData,
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
        transaction: {
          include: {
            userA: { select: { id: true, name: true, email: true } },
            userB: { select: { id: true, name: true, email: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    // Invia notifiche
    for (const notif of notificationData) {
      await prisma.notification.create({
        data: {
          userId: notif.userId,
          type: 'DISPUTE_UPDATE',
          title: notif.title,
          message: notif.message,
          link: `/disputes/${id}`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      dispute: updatedDispute,
      action,
    })

  } catch (error) {
    console.error('Error updating dispute:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento della disputa' },
      { status: 500 }
    )
  }
}

// Helper per testo risoluzione
function getResolutionText(resolution: DisputeResolution): string {
  const texts: Record<DisputeResolution, string> = {
    REFUND_FULL: 'Rimborso totale all\'acquirente',
    REFUND_PARTIAL: 'Rimborso parziale all\'acquirente',
    REPLACEMENT: 'Sostituzione del prodotto',
    RETURN_REQUIRED: 'Reso richiesto',
    REJECTED: 'Disputa rifiutata',
    IN_FAVOR_BUYER: 'A favore dell\'acquirente',
    IN_FAVOR_SELLER: 'A favore del venditore',
  }
  return texts[resolution] || resolution
}

