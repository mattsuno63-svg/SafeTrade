import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { HubPackageStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/transactions/[id]/package/received
 * Marca pacco come ricevuto all'hub
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id: transactionId } = params
    const body = await request.json()
    const { trackingNumber } = body

    // Get transaction
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id: transactionId },
      include: {
        hub: true,
        userA: true,
        userB: true,
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
        { error: 'Only the hub provider can mark packages as received' },
        { status: 403 }
      )
    }

    // Verify current status
    if (transaction.packageStatus && transaction.packageStatus !== 'IN_TRANSIT_TO_HUB' && transaction.packageStatus !== 'PENDING') {
      return NextResponse.json(
        { error: `Package cannot be marked as received. Current status: ${transaction.packageStatus}` },
        { status: 400 }
      )
    }

    // Update transaction
    const updatedTransaction = await prisma.safeTradeTransaction.update({
      where: { id: transactionId },
      data: {
        packageStatus: 'RECEIVED_AT_HUB',
        packageReceivedAt: new Date(),
        trackingNumber: trackingNumber || transaction.trackingNumber,
      },
      include: {
        hub: true,
        userA: true,
        userB: true,
      },
    })

    // Create notifications
    await prisma.notification.createMany({
      data: [
        {
          userId: transaction.userAId,
          type: 'PACKAGE_RECEIVED',
          title: 'Pacco Ricevuto all\'Hub',
          message: `Il tuo pacco per la transazione #${transactionId} è stato ricevuto all'hub.`,
          link: `/transactions/${transactionId}/status`,
        },
        {
          userId: transaction.userBId,
          type: 'PACKAGE_RECEIVED',
          title: 'Pacco Ricevuto all\'Hub',
          message: `Il pacco per la transazione #${transactionId} è stato ricevuto all'hub.`,
          link: `/transactions/${transactionId}/status`,
        },
      ],
    })

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
    })
  } catch (error: any) {
    console.error('Error marking package as received:', error)
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


