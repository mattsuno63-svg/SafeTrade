import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// POST - Refund funds to buyer (called if transaction fails or is disputed)
export async function POST(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const user = await requireAuth()
    const { paymentId } = params
    const body = await request.json()
    const { reason } = body

    // Get payment
    const payment = await prisma.escrowPayment.findUnique({
      where: { id: paymentId },
      include: {
        transaction: {
          include: {
            shop: true,
            userA: true,
            userB: true,
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Only merchant or admin can refund
    // For shop-based escrow, merchant can refund
    // For hub-based escrow, only admin can refund (or hub provider in future)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    const isMerchant = payment.transaction.shop?.merchantId === user.id
    const isAdmin = dbUser?.role === 'ADMIN'

    if (!isMerchant && !isAdmin) {
      return NextResponse.json(
        { error: 'Only the merchant or admin can refund funds' },
        { status: 403 }
      )
    }

    if (payment.status !== 'HELD' && payment.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Payment cannot be refunded. Current status: ${payment.status}` },
        { status: 400 }
      )
    }

    // Update payment status
    const updatedPayment = await prisma.escrowPayment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        paymentRefundedAt: new Date(),
        reviewNotes: reason
          ? `Refunded: ${reason}`
          : 'Refunded by merchant/admin',
      },
    })

    // Create system message
    const session = await prisma.escrowSession.findUnique({
      where: { transactionId: payment.transactionId },
    })

    if (session) {
      await prisma.escrowMessage.create({
        data: {
          sessionId: session.id,
          senderId: user.id,
          content: `Funds of €${payment.amount.toFixed(2)} have been refunded to the buyer.${reason ? ` Reason: ${reason}` : ''}`,
          isSystem: true,
        },
      })

      // Update session status
      await prisma.escrowSession.update({
        where: { id: session.id },
        data: { status: 'CANCELLED' },
      })
    }

    // Notify buyer and seller
    await prisma.notification.createMany({
      data: [
        {
          userId: payment.transaction.userAId,
          type: 'ESCROW_PAYMENT_REFUNDED',
          title: 'Payment Refunded',
          message: `Your payment of €${payment.amount.toFixed(2)} has been refunded.${reason ? ` Reason: ${reason}` : ''}`,
          link: `/escrow/sessions/${session?.id || payment.transactionId}`,
        },
        {
          userId: payment.transaction.userBId,
          type: 'ESCROW_PAYMENT_REFUNDED',
          title: 'Transaction Cancelled',
          message: `The transaction has been cancelled and funds have been refunded to the buyer.`,
          link: `/escrow/sessions/${session?.id || payment.transactionId}`,
        },
      ],
    })

    return NextResponse.json(updatedPayment)
  } catch (error: any) {
    console.error('Error refunding payment:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

