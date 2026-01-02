import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      )
    }

    // Get the transaction
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id },
      include: {
        shop: true,
        userA: true,
        userB: true,
        proposal: {
          include: {
            listing: true,
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Verify that the user is the shop owner
    if (transaction.shop.merchantId !== user.id) {
      return NextResponse.json(
        { error: 'Only the shop owner can verify transactions' },
        { status: 403 }
      )
    }

    // Verify the code
    if (transaction.verificationCode !== code.toUpperCase()) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Check if transaction is in correct state
    if (transaction.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: `Transaction cannot be completed. Current status: ${transaction.status}` },
        { status: 400 }
      )
    }

    // Update transaction to completed
    const updatedTransaction = await prisma.safeTradeTransaction.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    // Auto-release escrow payment if exists
    const payment = await prisma.escrowPayment.findUnique({
      where: { transactionId: id },
    })

    if (payment && payment.status === 'HELD') {
      await prisma.escrowPayment.update({
        where: { id: payment.id },
        data: {
          status: 'RELEASED',
          paymentReleasedAt: new Date(),
        },
      })

      // Update escrow session
      const session = await prisma.escrowSession.findUnique({
        where: { transactionId: id },
      })

      if (session) {
        await prisma.escrowSession.update({
          where: { id: session.id },
          data: { status: 'COMPLETED' },
        })

        await prisma.escrowMessage.create({
          data: {
            sessionId: session.id,
            senderId: user.id,
            content: `Transaction verified! Funds of €${payment.amount.toFixed(2)} have been automatically released to the seller.`,
            isSystem: true,
          },
        })
      }
    }

    // Mark listing as sold and deactivate
    if (transaction.proposal?.listing) {
      await prisma.listingP2P.update({
        where: { id: transaction.proposal.listing.id },
        data: { 
          isActive: false,
          isSold: true,
        },
      })
    }

    // Create notifications for both users
    const notificationData = [
      {
        userId: transaction.userAId,
        type: 'TRANSACTION_COMPLETED' as const,
        title: 'SafeTrade Completed!',
        message: `Your SafeTrade at ${transaction.shop.name} has been successfully completed.`,
        data: JSON.stringify({
          transactionId: id,
          shopId: transaction.shopId,
        }),
      },
      {
        userId: transaction.userBId,
        type: 'TRANSACTION_COMPLETED' as const,
        title: 'SafeTrade Completed!',
        message: `Your SafeTrade at ${transaction.shop.name} has been successfully completed.`,
        data: JSON.stringify({
          transactionId: id,
          shopId: transaction.shopId,
        }),
      },
    ]

    await prisma.notification.createMany({
      data: notificationData,
    })

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
    })
  } catch (error: any) {
    console.error('Error verifying transaction:', error)
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
