import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { HubPackageStatus, PendingReleaseType, AdminNotificationType, NotificationPriority } from '@prisma/client'

export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'portelli.mattiaa@gmail.com'

/**
 * GET /api/admin/hub/packages/[id]
 * Dettagli di un pacco specifico
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

    if (user.role !== 'ADMIN' && user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Accesso negato. Solo Admin.' },
        { status: 403 }
      )
    }

    const { id } = await params

    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id },
      include: {
        hub: true,
        userA: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        userB: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        proposal: {
          include: {
            listing: true,
          },
        },
        escrowPayment: true,
        disputes: true,
        pendingReleases: true,
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error fetching package:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero del pacco' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/hub/packages/[id]
 * Aggiorna lo stato di un pacco (ricezione, verifica, spedizione)
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

    if (user.role !== 'ADMIN' && user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Accesso negato. Solo Admin.' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const {
      action, // 'receive' | 'verify' | 'ship' | 'deliver'
      trackingNumber,
      returnTrackingNumber,
      verificationPhotos,
      notes,
    } = body

    // Trova la transazione
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id },
      include: {
        hub: true,
        escrowPayment: true,
        userA: { select: { id: true, name: true, email: true } },
        userB: { select: { id: true, name: true, email: true } },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // Verifica che sia una transazione Hub gestita dall'admin
    if (!transaction.hub || transaction.hub.providerId !== user.id) {
      return NextResponse.json(
        { error: 'Non sei autorizzato a gestire questo pacco' },
        { status: 403 }
      )
    }

    const now = new Date()
    let updateData: Record<string, unknown> = {}
    let notificationMessage = ''
    let notificationTitle = ''

    switch (action) {
      case 'receive':
        // Pacco ricevuto all'hub
        updateData = {
          packageStatus: 'RECEIVED_AT_HUB',
          packageReceivedAt: now,
        }
        notificationTitle = 'Pacco ricevuto all\'Hub! 📦'
        notificationMessage = 'Il tuo pacco è stato ricevuto dall\'Hub SafeTrade ed è in attesa di verifica.'
        break

      case 'verify':
        // Verifica contenuti pacco
        if (!verificationPhotos || verificationPhotos.length === 0) {
          return NextResponse.json(
            { error: 'È necessario caricare almeno una foto di verifica' },
            { status: 400 }
          )
        }
        updateData = {
          packageStatus: 'VERIFICATION_PASSED',
          packageVerifiedAt: now,
          verificationPhotos: verificationPhotos,
        }
        notificationTitle = 'Pacco verificato! ✅'
        notificationMessage = 'I contenuti del tuo pacco sono stati verificati. Procediamo alla spedizione.'
        
        // Crea PendingRelease per rilascio fondi al venditore
        // (richiede approvazione manuale!)
        if (transaction.escrowPayment && transaction.escrowPayment.status === 'HELD') {
          await prisma.pendingRelease.create({
            data: {
              orderId: transaction.id,
              type: 'RELEASE_TO_SELLER' as PendingReleaseType,
              amount: transaction.escrowPayment.amount,
              recipientId: transaction.userBId,
              recipientType: 'SELLER',
              status: 'PENDING',
              triggeredBy: 'HUB_VERIFIED',
              reason: notes || 'Verifica pacco completata dall\'Hub',
            },
          })

          // Notifica admin per approvazione
          await prisma.adminNotification.create({
            data: {
              type: 'PENDING_RELEASE' as AdminNotificationType,
              referenceType: 'PENDING_RELEASE',
              referenceId: transaction.id,
              title: '💰 Rilascio fondi in attesa',
              message: `Pacco verificato per transazione ${transaction.id}. €${transaction.escrowPayment.amount.toFixed(2)} da rilasciare al venditore.`,
              targetRoles: ['ADMIN', 'MODERATOR'],
              priority: 'HIGH' as NotificationPriority,
            },
          })
        }
        break

      case 'ship':
        // Pacco spedito al destinatario
        if (!returnTrackingNumber) {
          return NextResponse.json(
            { error: 'È necessario inserire il tracking della spedizione' },
            { status: 400 }
          )
        }
        updateData = {
          packageStatus: 'SHIPPED_TO_BUYER',
          packageShippedAt: now,
          returnTrackingNumber: returnTrackingNumber,
        }
        notificationTitle = 'Pacco spedito! 🚚'
        notificationMessage = `Il tuo pacco è stato spedito! Tracking: ${returnTrackingNumber}`
        break

      case 'deliver':
        // Conferma consegna finale
        updateData = {
          packageStatus: 'DELIVERED_TO_BUYER',
          packageDeliveredAt: now,
          status: 'COMPLETED',
          completedAt: now,
        }
        notificationTitle = 'Pacco consegnato! 🎉'
        notificationMessage = 'Il tuo pacco è stato consegnato con successo!'
        break

      default:
        return NextResponse.json(
          { error: 'Azione non valida. Usa: receive, verify, ship, deliver' },
          { status: 400 }
        )
    }

    // Aggiorna tracking se fornito
    if (trackingNumber && action === 'receive') {
      updateData.trackingNumber = trackingNumber
    }

    // Esegui update
    const updatedTransaction = await prisma.safeTradeTransaction.update({
      where: { id },
      data: updateData,
      include: {
        hub: true,
        userA: { select: { id: true, name: true, email: true } },
        userB: { select: { id: true, name: true, email: true } },
        escrowPayment: true,
      },
    })

    // Invia notifiche agli utenti coinvolti
    const notifyUserIds = [transaction.userAId, transaction.userBId]
    for (const userId of notifyUserIds) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'PACKAGE_UPDATE',
          title: notificationTitle,
          message: notificationMessage,
          link: `/transactions/${transaction.id}`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
      message: `Pacco ${action === 'receive' ? 'ricevuto' : action === 'verify' ? 'verificato' : action === 'ship' ? 'spedito' : 'consegnato'} con successo!`,
    })
  } catch (error) {
    console.error('Error updating package:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento del pacco' },
      { status: 500 }
    )
  }
}

