import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { validateAmountPositive, validateAmountLimit } from '@/lib/security/amount-validation'

export const dynamic = 'force-dynamic'

// POST - Hold funds in escrow (called when payment is confirmed at store)
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

    // Only merchant can hold funds (when confirming payment at store)
    // For shop-based escrow
    if (!payment.transaction.shop) {
      return NextResponse.json(
        { error: 'This transaction is not shop-based' },
        { status: 400 }
      )
    }

    if (payment.transaction.shop.merchantId !== user.id) {
      return NextResponse.json(
        { error: 'Only the merchant can hold funds in escrow' },
        { status: 403 }
      )
    }

    // BUG #8 FIX: Rate limiting for payment hold
    const rateLimitKey = getRateLimitKey(user.id, 'PAYMENT_HOLD')
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.PAYMENT_HOLD)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Troppe richieste. Limite di 10 operazioni hold per ora raggiunto.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Payment cannot be held. Current status: ${payment.status}` },
        { status: 400 }
      )
    }

    // SECURITY #15: Validazione amount del payment
    const positiveCheck = validateAmountPositive(payment.amount)
    if (!positiveCheck.valid) {
      return NextResponse.json({ error: positiveCheck.reason }, { status: 400 })
    }

    const limitCheck = validateAmountLimit(payment.amount)
    if (!limitCheck.valid) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 400 })
    }

    // Update payment status
    const updatedPayment = await prisma.escrowPayment.update({
      where: { id: paymentId },
      data: {
        status: 'HELD',
        paymentHeldAt: new Date(),
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
          content: `Funds of €${payment.amount.toFixed(2)} are now held in escrow. They will be released to the seller upon transaction verification.`,
          isSystem: true,
        },
      })
    }

    // Notify buyer and seller
    await prisma.notification.createMany({
      data: [
        {
          userId: payment.transaction.userAId,
          type: 'ESCROW_PAYMENT_HELD',
          title: 'Funds Held in Escrow',
          message: `Your payment of €${payment.amount.toFixed(2)} has been confirmed and is now held in escrow.`,
          link: `/escrow/sessions/${session?.id || payment.transactionId}`,
        },
        {
          userId: payment.transaction.userBId,
          type: 'ESCROW_PAYMENT_HELD',
          title: 'Funds Held in Escrow',
          message: `Buyer's payment of €${payment.amount.toFixed(2)} is now held in escrow.`,
          link: `/escrow/sessions/${session?.id || payment.transactionId}`,
        },
      ],
    })

    return NextResponse.json(updatedPayment)
  } catch (error: any) {
    console.error('Error holding payment:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

