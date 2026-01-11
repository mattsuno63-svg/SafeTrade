import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET - Fetch escrow payments
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const searchParams = request.nextUrl.searchParams
    const transactionId = searchParams.get('transactionId')

    if (transactionId) {
      // Get payment for specific transaction
      const payment = await prisma.escrowPayment.findUnique({
        where: { transactionId },
        include: {
          transaction: {
            include: {
              userA: { select: { id: true, name: true, email: true } },
              userB: { select: { id: true, name: true, email: true } },
              shop: { select: { id: true, name: true, merchantId: true } },
            },
          },
        },
      })

      if (!payment) {
        return NextResponse.json(null) // Return null if no payment exists yet
      }

      // Verify user has access
      const transaction = payment.transaction
      const isParticipant = transaction.userAId === user.id || transaction.userBId === user.id
      const isMerchant = transaction.shop?.merchantId === user.id
      
      if (!isParticipant && !isMerchant) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      return NextResponse.json(payment)
    }

    // Get all payments for user
    const payments = await prisma.escrowPayment.findMany({
      where: {
        OR: [
          { transaction: { userAId: user.id } },
          { transaction: { userBId: user.id } },
          { transaction: { shop: { merchantId: user.id } } },
        ],
      },
      include: {
        transaction: {
          include: {
            userA: { select: { id: true, name: true } },
            userB: { select: { id: true, name: true } },
            shop: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ payments })
  } catch (error: any) {
    console.error('Error fetching escrow payments:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create/Initiate escrow payment
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { transactionId, amount, paymentMethod = 'CASH' } = body

    if (!transactionId || !amount) {
      return NextResponse.json(
        { error: 'transactionId and amount are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
    }

    // Get transaction
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id: transactionId },
      include: {
        userA: true,
        userB: true,
        shop: true,
        proposal: {
          include: {
            listing: true,
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Verify user is buyer (userA)
    if (transaction.userAId !== user.id) {
      return NextResponse.json(
        { error: 'Only the buyer can initiate payment' },
        { status: 403 }
      )
    }

    // Check if payment already exists
    const existingPayment = await prisma.escrowPayment.findUnique({
      where: { transactionId },
    })

    if (existingPayment) {
      return NextResponse.json(existingPayment)
    }

    // Calculate risk score (simple implementation - can be enhanced)
    const riskScore = calculateRiskScore(transaction, user)

    // Create payment
    const payment = await prisma.escrowPayment.create({
      data: {
        transactionId,
        amount,
        paymentMethod,
        status: paymentMethod === 'CASH' ? 'PENDING' : 'PENDING', // For cash, will be HELD when confirmed at store
        riskScore,
        flaggedForReview: riskScore > 70, // Flag high-risk transactions
        paymentInitiatedAt: new Date(),
      },
      include: {
        transaction: {
          include: {
            userA: { select: { id: true, name: true } },
            userB: { select: { id: true, name: true } },
            shop: { select: { id: true, name: true } },
          },
        },
      },
    })

    // Create system message in escrow session
    const session = await prisma.escrowSession.findUnique({
      where: { transactionId },
    })

    if (session) {
      await prisma.escrowMessage.create({
        data: {
          sessionId: session.id,
          senderId: user.id,
          content: `Payment of €${amount.toFixed(2)} initiated. Funds will be held in escrow until transaction is verified.`,
          isSystem: true,
        },
      })
    }

    // Notify seller and merchant (if shop-based)
    const notifications = [
      {
        userId: transaction.userBId,
        type: 'ESCROW_PAYMENT_INITIATED',
        title: 'Payment Initiated',
        message: `Buyer has initiated payment of €${amount.toFixed(2)} for your transaction.`,
        link: `/escrow/sessions/${session?.id || transactionId}`,
      },
    ]

    // Only notify merchant if shop-based escrow
    if (transaction.shop) {
      notifications.push({
        userId: transaction.shop.merchantId,
        type: 'ESCROW_PAYMENT_INITIATED',
        title: 'Payment Initiated',
        message: `Payment of €${amount.toFixed(2)} initiated for SafeTrade transaction.`,
        link: `/escrow/sessions/${session?.id || transactionId}`,
      } as any)
    }

    await prisma.notification.createMany({
      data: notifications,
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error: any) {
    console.error('Error creating escrow payment:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to calculate risk score
function calculateRiskScore(transaction: any, user: any): number {
  let score = 0

  // New user (less than 30 days) = +20 points
  const daysSinceJoin = Math.floor(
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceJoin < 30) score += 20

  // High value transaction (>€500) = +15 points
  const amount = transaction.proposal?.offerPrice || transaction.proposal?.listing?.price || 0
  if (amount > 500) score += 15

  // No previous transactions = +10 points
  // (Would need to check transaction history - simplified for now)

  // Merchant verification = -10 points (more trusted) - only for shop-based
  if (transaction.shop?.isApproved) score -= 10

  return Math.max(0, Math.min(100, score))
}


