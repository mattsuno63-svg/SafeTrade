import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { HubPackageStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/transactions/[id]/package/verify
 * Verifica contenuti pacco (con foto)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id: transactionId } = params
    const body = await request.json()
    const { verificationPhotos, notes } = body

    // Get transaction
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id: transactionId },
      include: {
        hub: true,
        escrowPayment: true,
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Verify it's a hub-based transaction
    if (!transaction.hubId || !transaction.hub) {
      return NextResponse.json(
        { error: 'This transaction is not hub-based' },
        { status: 400 }
      )
    }

    // Verify user is the hub provider
    if (transaction.hub.providerId !== user.id) {
      return NextResponse.json(
        { error: 'Only the hub provider can verify packages' },
        { status: 403 }
      )
    }

    // Verify current status
    if (transaction.packageStatus !== 'RECEIVED_AT_HUB') {
      return NextResponse.json(
        { error: `Package must be received before verification. Current status: ${transaction.packageStatus}` },
        { status: 400 }
      )
    }

    // Validate photos
    if (!verificationPhotos || !Array.isArray(verificationPhotos) || verificationPhotos.length === 0) {
      return NextResponse.json(
        { error: 'At least one verification photo is required' },
        { status: 400 }
      )
    }

    // Update transaction
    const updatedTransaction = await prisma.safeTradeTransaction.update({
      where: { id: transactionId },
      data: {
        packageStatus: 'VERIFICATION_PASSED',
        packageVerifiedAt: new Date(),
        verificationPhotos: verificationPhotos,
        notes: notes || transaction.notes,
      },
      include: {
        hub: true,
        userA: true,
        userB: true,
      },
    })

    // Crea PendingRelease invece di rilasciare automaticamente i fondi
    if (transaction.escrowPayment && transaction.escrowPayment.status === 'HELD') {
      // Verifica se esiste già una pending release per questo pagamento
      const existingPendingRelease = await prisma.pendingRelease.findFirst({
        where: {
          orderId: transactionId,
          type: 'RELEASE_TO_SELLER',
          status: 'PENDING',
        },
      })

      if (!existingPendingRelease) {
        // Crea PendingRelease invece di rilasciare direttamente
        const pendingRelease = await prisma.pendingRelease.create({
          data: {
            orderId: transactionId,
            type: 'RELEASE_TO_SELLER',
            amount: transaction.escrowPayment.amount,
            recipientId: transaction.userBId, // Seller
            recipientType: 'SELLER',
            reason: `Rilascio fondi dopo verifica pacco completata da Hub`,
            triggeredBy: 'HUB_VERIFIED',
            triggeredAt: new Date(),
          },
        })

        // Crea notifica admin/moderator
        await prisma.adminNotification.create({
          data: {
            type: 'PENDING_RELEASE',
            referenceType: 'PENDING_RELEASE',
            referenceId: pendingRelease.id,
            title: `Rilascio fondi in attesa - Ordine #${transactionId.slice(0, 8)}`,
            message: `Richiesta di rilascio di €${transaction.escrowPayment.amount.toFixed(2)} al venditore dopo verifica pacco da Hub`,
            priority: 'NORMAL',
            targetRoles: ['ADMIN', 'MODERATOR'],
          },
        })
      }

      // Update escrow session
      const session = await prisma.escrowSession.findUnique({
        where: { transactionId },
      })

      if (session) {
        await prisma.escrowMessage.create({
          data: {
            sessionId: session.id,
            senderId: user.id,
            content: `Pacco verificato! Richiesta di rilascio di €${transaction.escrowPayment.amount.toFixed(2)} al venditore creata. In attesa di approvazione Admin/Moderator.`,
            isSystem: true,
          },
        })
      }
    }

    // Create notifications
    await prisma.notification.createMany({
      data: [
        {
          userId: transaction.userAId,
          type: 'PACKAGE_VERIFIED',
          title: 'Pacco Verificato',
          message: `Il tuo pacco per la transazione #${transactionId} è stato verificato.`,
          link: `/transactions/${transactionId}/status`,
        },
        {
          userId: transaction.userBId,
          type: 'PACKAGE_VERIFIED',
          title: 'Pacco Verificato',
          message: `Il pacco per la transazione #${transactionId} è stato verificato.`,
          link: `/transactions/${transactionId}/status`,
        },
      ],
    })

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
    })
  } catch (error: any) {
    console.error('Error verifying package:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


