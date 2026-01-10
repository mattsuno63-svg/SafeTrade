import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { HubPackageStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/transactions/[id]/package/ship
 * Marca pacco come spedito al buyer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id: transactionId } = params
    const body = await request.json()
    const { returnTrackingNumber } = body

    if (!returnTrackingNumber) {
      return NextResponse.json(
        { error: 'Tracking number is required' },
        { status: 400 }
      )
    }

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
        { error: 'Only the hub provider can ship packages' },
        { status: 403 }
      )
    }

    // Verify current status
    if (transaction.packageStatus !== 'VERIFIED') {
      return NextResponse.json(
        { error: `Package must be verified before shipping. Current status: ${transaction.packageStatus}` },
        { status: 400 }
      )
    }

    // Update transaction
    const updatedTransaction = await prisma.safeTradeTransaction.update({
      where: { id: transactionId },
      data: {
        packageStatus: 'SHIPPED',
        packageShippedAt: new Date(),
        returnTrackingNumber: returnTrackingNumber,
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
          type: 'PACKAGE_SHIPPED',
          title: 'Pacco Spedito',
          message: `Il pacco per la transazione #${transactionId} è stato spedito. Tracking: ${returnTrackingNumber}`,
          link: `/transactions/${transactionId}/status`,
        },
        {
          userId: transaction.userBId,
          type: 'PACKAGE_SHIPPED',
          title: 'Pacco Spedito',
          message: `Il pacco per la transazione #${transactionId} è stato spedito. Tracking: ${returnTrackingNumber}`,
          link: `/transactions/${transactionId}/status`,
        },
      ],
    })

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
    })
  } catch (error: any) {
    console.error('Error marking package as shipped:', error)
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

