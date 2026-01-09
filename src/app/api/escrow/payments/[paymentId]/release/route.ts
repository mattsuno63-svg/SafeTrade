import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// POST - Release funds to seller (called when transaction is verified)
export async function POST(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const user = await requireAuth()
    const { paymentId } = params

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

    // Only merchant can release funds (after verification)
    if (payment.transaction.shop.merchantId !== user.id) {
      return NextResponse.json(
        { error: 'Only the merchant can release funds' },
        { status: 403 }
      )
    }

    if (payment.status !== 'HELD') {
      return NextResponse.json(
        { error: `Payment cannot be released. Current status: ${payment.status}` },
        { status: 400 }
      )
    }

    // Verify transaction is completed
    if (payment.transaction.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Transaction must be completed before releasing funds' },
        { status: 400 }
      )
    }

    // Update payment status
    const updatedPayment = await prisma.escrowPayment.update({
      where: { id: paymentId },
      data: {
        status: 'RELEASED',
        paymentReleasedAt: new Date(),
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
          content: `Funds of €${payment.amount.toFixed(2)} have been released to the seller. Transaction completed successfully.`,
          isSystem: true,
        },
      })

      // Update session status
      await prisma.escrowSession.update({
        where: { id: session.id },
        data: { status: 'COMPLETED' },
      })
    }

    // Notify buyer and seller
    await prisma.notification.createMany({
      data: [
        {
          userId: payment.transaction.userAId,
          type: 'ESCROW_PAYMENT_RELEASED',
          title: 'Payment Released',
          message: `Funds of €${payment.amount.toFixed(2)} have been released to the seller.`,
          link: `/escrow/sessions/${session?.id || payment.transactionId}`,
        },
        {
          userId: payment.transaction.userBId,
          type: 'ESCROW_PAYMENT_RELEASED',
          title: 'Payment Received',
          message: `You have received €${payment.amount.toFixed(2)} from the transaction.`,
          link: `/escrow/sessions/${session?.id || payment.transactionId}`,
        },
      ],
    })

    return NextResponse.json(updatedPayment)
  } catch (error: any) {
    console.error('Error releasing payment:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

