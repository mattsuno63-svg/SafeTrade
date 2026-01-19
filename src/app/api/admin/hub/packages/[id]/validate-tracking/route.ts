import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { SafeTradeStatus, HubPackageStatus } from '@prisma/client'

/**
 * POST /api/admin/hub/packages/[id]/validate-tracking
 * Admin valida tracking number inserito dal seller
 * Dopo validazione, status diventa AWAITING_HUB_RECEIPT
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = await Promise.resolve(params)
    const body = await request.json()
    const { validated, rejectionReason } = body

    // SECURITY: Only ADMIN and HUB_STAFF can validate tracking
    if (user.role !== 'ADMIN' && user.role !== 'HUB_STAFF') {
      return NextResponse.json(
        { error: 'Solo ADMIN e HUB_STAFF possono validare i tracking number' },
        { status: 403 }
      )
    }

    // SECURITY: Validate validated parameter
    if (typeof validated !== 'boolean') {
      return NextResponse.json(
        { error: 'validated deve essere true o false' },
        { status: 400 }
      )
    }

    // Get transaction
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id },
      include: {
        userA: { select: { id: true, name: true, email: true } },
        userB: { select: { id: true, name: true, email: true } },
        escrowPayment: { select: { id: true, amount: true, status: true } },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // SECURITY: Verify escrowType is VERIFIED
    if (transaction.escrowType !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'Questa transazione non è Verified Escrow' },
        { status: 400 }
      )
    }

    // SECURITY: Verify status is PENDING_ESCROW_SETUP (tracking inserito ma non ancora validato)
    if (transaction.status !== SafeTradeStatus.PENDING_ESCROW_SETUP) {
      return NextResponse.json(
        { error: `Stato transazione non valido per validazione tracking. Stato attuale: ${transaction.status}. Stato richiesto: PENDING_ESCROW_SETUP` },
        { status: 400 }
      )
    }

    // SECURITY: Verify tracking number exists
    if (!transaction.trackingNumber) {
      return NextResponse.json(
        { error: 'Nessun tracking number inserito per questa transazione' },
        { status: 400 }
      )
    }

    const now = new Date()

    if (validated) {
      // Tracking VALIDATO - procedi con flusso normale
      const updatedTransaction = await prisma.safeTradeTransaction.update({
        where: { id },
        data: {
          packageStatus: HubPackageStatus.IN_TRANSIT_TO_HUB,
          status: SafeTradeStatus.AWAITING_HUB_RECEIPT,
          notes: `Tracking number "${transaction.trackingNumber}" validato da ${user.role} ${user.id} (${now.toISOString()}). Pacco in transito verso hub.`,
        },
      })

      // Create notifications
      await Promise.all([
        prisma.notification.create({
          data: {
            userId: transaction.userBId, // Seller
            type: 'TRANSACTION_UPDATED',
            title: '✅ Tracking Validato',
            message: `Il tracking number "${transaction.trackingNumber}" è stato validato. Il pacco è ora tracciato in transito verso l'hub SafeTrade.`,
            link: `/transaction/${id}/status`,
          },
        }),
        prisma.notification.create({
          data: {
            userId: transaction.userAId, // Buyer
            type: 'TRANSACTION_UPDATED',
            title: '📦 Pacco in Transito',
            message: `Il tracking number è stato validato. Il pacco è in transito verso l'hub SafeTrade per la verifica. Tracking: ${transaction.trackingNumber}`,
            link: `/transaction/${id}/status`,
          },
        }),
      ])

      return NextResponse.json({
        success: true,
        message: 'Tracking number validato con successo',
        transaction: updatedTransaction,
      })
    } else {
      // Tracking RIFIUTATO - richiedi nuovo tracking
      const updatedTransaction = await prisma.safeTradeTransaction.update({
        where: { id },
        data: {
          trackingNumber: null, // Rimuovi tracking rifiutato
          notes: `Tracking number rifiutato da ${user.role} ${user.id} (${now.toISOString()}). Motivo: ${rejectionReason || 'Non specificato'}. Seller deve inserire nuovo tracking.`,
        },
      })

      // Create notifications
      await Promise.all([
        prisma.notification.create({
          data: {
            userId: transaction.userBId, // Seller
            type: 'TRANSACTION_UPDATED',
            title: '❌ Tracking Rifiutato',
            message: `Il tracking number inserito è stato rifiutato. Motivo: ${rejectionReason || 'Non specificato'}. Inserisci un nuovo tracking number valido.`,
            link: `/transaction/${id}/verified-escrow/generate-label`,
          },
        }),
      ])

      return NextResponse.json({
        success: true,
        message: 'Tracking number rifiutato. Seller riceverà notifica per inserire nuovo tracking.',
        transaction: updatedTransaction,
      })
    }
  } catch (error: any) {
    console.error('Error validating tracking:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

