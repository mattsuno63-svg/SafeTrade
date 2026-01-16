import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { validateAmountPositive, validateAmountLimit } from '@/lib/security/amount-validation'

export const dynamic = 'force-dynamic'

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
    // For shop-based escrow
    if (!payment.transaction.shop) {
      return NextResponse.json(
        { error: 'This transaction is not shop-based' },
        { status: 400 }
      )
    }

    if (payment.transaction.shop.merchantId !== user.id) {
      return NextResponse.json(
        { error: 'Only the merchant can release funds' },
        { status: 403 }
      )
    }

    // BUG #8 FIX: Rate limiting for payment release
    const rateLimitKey = getRateLimitKey(user.id, 'PAYMENT_RELEASE')
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.PAYMENT_RELEASE)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Troppe richieste. Limite di 10 operazioni release per ora raggiunto.',
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

    if (payment.status !== 'HELD') {
      return NextResponse.json(
        { error: `Payment cannot be released. Current status: ${payment.status}` },
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

    // SECURITY #9: Verify transaction is completed and not cancelled
    if (payment.transaction.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Transaction has been cancelled. Funds cannot be released.' },
        { status: 400 }
      )
    }

    if (payment.transaction.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Transaction must be completed before releasing funds' },
        { status: 400 }
      )
    }

    // SECURITY #9: Payment status already verified as 'HELD' above (line 74)
    // No need to check for 'RELEASED' as TypeScript knows it's 'HELD' at this point

    // Verifica se esiste già una pending release per questo pagamento
    const existingPendingRelease = await prisma.pendingRelease.findFirst({
      where: {
        orderId: payment.transactionId,
        type: 'RELEASE_TO_SELLER',
        status: 'PENDING',
      },
    })

    if (existingPendingRelease) {
      return NextResponse.json(
        { 
          error: 'Una richiesta di rilascio è già in attesa di approvazione',
          pendingReleaseId: existingPendingRelease.id,
        },
        { status: 400 }
      )
    }

    // Crea PendingRelease invece di rilasciare direttamente
    const pendingRelease = await prisma.pendingRelease.create({
      data: {
        orderId: payment.transactionId,
        type: 'RELEASE_TO_SELLER',
        amount: payment.amount,
        recipientId: payment.transaction.userBId, // Seller
        recipientType: 'SELLER',
        reason: `Rilascio fondi richiesto dal merchant dopo verifica transazione`,
        triggeredBy: 'MERCHANT_RELEASE_REQUEST',
        triggeredAt: new Date(),
      },
      include: {
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Crea notifica admin/moderator
    await prisma.adminNotification.create({
      data: {
        type: 'PENDING_RELEASE',
        referenceType: 'PENDING_RELEASE',
        referenceId: pendingRelease.id,
        title: `Rilascio fondi in attesa - Ordine #${payment.transactionId.slice(0, 8)}`,
        message: `Richiesta di rilascio di €${payment.amount.toFixed(2)} al venditore ${payment.transaction.userB.name || payment.transaction.userB.email}`,
        priority: 'NORMAL',
        targetRoles: ['ADMIN', 'MODERATOR'],
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
          content: `Richiesta di rilascio fondi di €${payment.amount.toFixed(2)} inviata. In attesa di approvazione Admin/Moderator.`,
          isSystem: true,
        },
      })
    }

    // Notify buyer and seller
    await prisma.notification.createMany({
      data: [
        {
          userId: payment.transaction.userAId,
          type: 'ESCROW_PAYMENT_RELEASED',
          title: 'Richiesta Rilascio Fondi',
          message: `Richiesta di rilascio di €${payment.amount.toFixed(2)} al venditore. In attesa di approvazione.`,
          link: `/escrow/sessions/${session?.id || payment.transactionId}`,
        },
        {
          userId: payment.transaction.userBId,
          type: 'ESCROW_PAYMENT_RELEASED',
          title: 'Richiesta Rilascio Fondi',
          message: `Richiesta di rilascio di €${payment.amount.toFixed(2)} inviata. In attesa di approvazione Admin/Moderator.`,
          link: `/escrow/sessions/${session?.id || payment.transactionId}`,
        },
      ],
    })

    return NextResponse.json({
      success: true,
      message: 'Richiesta di rilascio fondi creata. In attesa di approvazione Admin/Moderator.',
      pendingRelease: {
        id: pendingRelease.id,
        amount: pendingRelease.amount,
        status: pendingRelease.status,
      },
    })
  } catch (error: any) {
    console.error('Error releasing payment:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

