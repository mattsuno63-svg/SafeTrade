import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { SafeTradeStatus, HubPackageStatus } from '@prisma/client'

/**
 * POST /api/transactions/[id]/package/confirm-received
 * Buyer conferma ricezione pacco
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = await Promise.resolve(params)

    // Get transaction
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id },
      include: {
        escrowPayment: true,
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // SECURITY: Only buyer can confirm receipt
    if (transaction.userAId !== user.id) {
      return NextResponse.json(
        { error: 'Solo l\'acquirente può confermare la ricezione' },
        { status: 403 }
      )
    }

    // SECURITY: Verify escrowType is VERIFIED
    if (transaction.escrowType !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'Questa transazione non è Verified Escrow' },
        { status: 400 }
      )
    }

    // SECURITY: Verify packageStatus allows confirmation
    const allowedPackageStatuses: HubPackageStatus[] = [
      HubPackageStatus.DELIVERED_TO_BUYER,
      HubPackageStatus.IN_TRANSIT_TO_BUYER,
      HubPackageStatus.SHIPPED_TO_BUYER,
    ]
    
    if (!transaction.packageStatus || !allowedPackageStatuses.includes(transaction.packageStatus)) {
      return NextResponse.json(
        { error: `Stato pacco non valido per conferma. Stato attuale: ${transaction.packageStatus ?? 'N/A'}` },
        { status: 400 }
      )
    }

    // SECURITY: Check if already confirmed
    if (transaction.packageStatus === HubPackageStatus.CONFIRMED_BY_BUYER) {
      return NextResponse.json(
        { error: 'Ricezione già confermata' },
        { status: 400 }
      )
    }

    const now = new Date()

    // Update transaction
    const updatedTransaction = await prisma.safeTradeTransaction.update({
      where: { id },
      data: {
        packageStatus: HubPackageStatus.CONFIRMED_BY_BUYER,
        status: SafeTradeStatus.CONFIRMED_BY_BUYER,
        confirmedReceivedAt: now,
        packageDeliveredAt: transaction.packageDeliveredAt || now,
      },
    })

    // Create PendingRelease for admin approval
    if (transaction.escrowPayment && transaction.escrowPayment.status === 'HELD') {
      const pendingRelease = await prisma.pendingRelease.create({
        data: {
          orderId: id,
          type: 'RELEASE_TO_SELLER',
          amount: transaction.escrowPayment.amount,
          recipientId: transaction.userBId, // Seller
          recipientType: 'SELLER',
          reason: `Rilascio fondi dopo conferma ricezione da parte dell'acquirente. Verifica carta: OK.`,
          triggeredBy: 'BUYER_CONFIRMED',
          triggeredAt: now,
        },
      })

      // Create admin notification
      await prisma.adminNotification.create({
        data: {
          type: 'PENDING_RELEASE',
          referenceType: 'PENDING_RELEASE',
          referenceId: pendingRelease.id,
          title: `Rilascio fondi in attesa - Ordine #${id.slice(0, 8)}`,
          message: `Richiesta di rilascio di €${transaction.escrowPayment.amount.toFixed(2)} al venditore dopo conferma ricezione da parte dell'acquirente.`,
          priority: 'NORMAL',
          targetRoles: ['ADMIN', 'MODERATOR'],
        },
      })

      // Create notifications
      await Promise.all([
        prisma.notification.create({
          data: {
            userId: transaction.userBId, // Seller
            type: 'TRANSACTION_UPDATED',
            title: '✅ Ricezione Confermata',
            message: `L'acquirente ha confermato la ricezione. Il rilascio dei fondi è in attesa di approvazione.`,
            link: `/transaction/${id}/status`,
          },
        }),
        prisma.notification.create({
          data: {
            userId: user.id, // Buyer
            type: 'TRANSACTION_UPDATED',
            title: '✅ Conferma Ricezione',
            message: `Hai confermato la ricezione. I fondi verranno rilasciati al venditore dopo l'approvazione.`,
            link: `/transaction/${id}/status`,
          },
        }),
      ])
    }

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
    })
  } catch (error: any) {
    console.error('Error confirming receipt:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}


