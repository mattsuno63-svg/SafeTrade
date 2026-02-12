import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { validateAmountPositive, validateAmountLimit } from '@/lib/security/amount-validation'

export const dynamic = 'force-dynamic'

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

    // BUG #8 FIX: Rate limiting for payment refund
    const rateLimitKey = getRateLimitKey(user.id, 'PAYMENT_REFUND')
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.PAYMENT_REFUND)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Troppe richieste. Limite di 5 operazioni refund per ora raggiunto.',
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

    // SECURITY #9: Verify transaction is not already completed
    if (payment.transaction.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Transaction has already been completed. Refund must be processed through dispute system.' },
        { status: 400 }
      )
    }

    // SECURITY #9: Verify payment status
    if (payment.status === 'RELEASED') {
      return NextResponse.json(
        { error: 'Payment has already been released. Cannot refund.' },
        { status: 400 }
      )
    }

    if (payment.status === 'REFUNDED') {
      return NextResponse.json(
        { error: 'Payment has already been refunded' },
        { status: 400 }
      )
    }

    if (payment.status !== 'HELD' && payment.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Payment cannot be refunded. Current status: ${payment.status}` },
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

    // Verifica se esiste già una pending release per questo rimborso
    const existingPendingRelease = await prisma.pendingRelease.findFirst({
      where: {
        orderId: payment.transactionId,
        type: 'REFUND_FULL',
        status: 'PENDING',
      },
    })

    if (existingPendingRelease) {
      return NextResponse.json(
        { 
          error: 'Una richiesta di rimborso è già in attesa di approvazione',
          pendingReleaseId: existingPendingRelease.id,
        },
        { status: 400 }
      )
    }

    // Crea PendingRelease invece di rimborsare direttamente
    const pendingRelease = await prisma.pendingRelease.create({
      data: {
        orderId: payment.transactionId,
        type: 'REFUND_FULL',
        amount: payment.amount,
        recipientId: payment.transaction.userAId, // Buyer
        recipientType: 'BUYER',
        reason: reason || `Rimborso richiesto da ${isAdmin ? 'Admin' : 'Merchant'}`,
        triggeredBy: isAdmin ? 'ADMIN_REFUND_REQUEST' : 'MERCHANT_REFUND_REQUEST',
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
        title: `Rimborso in attesa - Ordine #${payment.transactionId.slice(0, 8)}`,
        message: `Richiesta di rimborso di €${payment.amount.toFixed(2)} all'acquirente ${payment.transaction.userA.name || payment.transaction.userA.email}.${reason ? ` Motivo: ${reason}` : ''}`,
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
          content: `Richiesta di rimborso di €${payment.amount.toFixed(2)} all'acquirente creata. In attesa di approvazione Admin/Moderator.${reason ? ` Motivo: ${reason}` : ''}`,
          isSystem: true,
        },
      })
    }

    // Notify buyer and seller
    await prisma.notification.createMany({
      data: [
        {
          userId: payment.transaction.userAId,
          type: 'ESCROW_PAYMENT_REFUNDED',
          title: 'Richiesta Rimborso',
          message: `Richiesta di rimborso di €${payment.amount.toFixed(2)} creata. In attesa di approvazione Admin/Moderator.${reason ? ` Motivo: ${reason}` : ''}`,
          link: `/escrow/sessions/${session?.id || payment.transactionId}`,
        },
        {
          userId: payment.transaction.userBId,
          type: 'ESCROW_PAYMENT_REFUNDED',
          title: 'Transazione Cancellata',
          message: `La transazione è stata cancellata. Richiesta di rimborso all'acquirente creata. In attesa di approvazione Admin/Moderator.`,
          link: `/escrow/sessions/${session?.id || payment.transactionId}`,
        },
      ],
    })

    return NextResponse.json({
      success: true,
      message: 'Richiesta di rimborso creata. In attesa di approvazione Admin/Moderator.',
      pendingRelease: {
        id: pendingRelease.id,
        amount: pendingRelease.amount,
        status: pendingRelease.status,
      },
    })
  } catch (error: any) {
    console.error('Error refunding payment:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

