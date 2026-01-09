import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SafeTradeStatus, PriorityTier } from '@prisma/client'

// Helper to get user's priority tier based on subscription
async function getUserPriorityTier(userId: string): Promise<{ tier: PriorityTier; isPaid: boolean }> {
  const subscription = await prisma.userSubscription.findUnique({
    where: { userId },
    include: { plan: true },
  })

  // No subscription or inactive = STANDARD
  if (!subscription || subscription.status !== 'ACTIVE') {
    return { tier: 'STANDARD', isPaid: false }
  }

  // Expired = STANDARD
  if (subscription.endDate && subscription.endDate < new Date()) {
    return { tier: 'STANDARD', isPaid: false }
  }

  // PRO = FAST_TRACK (unlimited priority)
  if (subscription.plan.tier === 'PRO') {
    return { tier: 'FAST_TRACK', isPaid: false }
  }

  // PREMIUM = PRIORITY (check monthly limit)
  if (subscription.plan.tier === 'PREMIUM') {
    const monthlyLimit = subscription.plan.priorityMonthlyLimit
    
    // Unlimited (-1)
    if (monthlyLimit === -1) {
      return { tier: 'PRIORITY', isPaid: false }
    }

    // Check if user has used all free priority this month
    if (subscription.priorityUsedThisMonth < monthlyLimit) {
      return { tier: 'PRIORITY', isPaid: false }
    }
    
    // Limit reached, fallback to STANDARD
    return { tier: 'STANDARD', isPaid: false }
  }

  return { tier: 'STANDARD', isPaid: false }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const shopId = searchParams.get('shopId')
    const status = searchParams.get('status') as SafeTradeStatus | null

    if (!userId && !shopId) {
      return NextResponse.json(
        { error: 'User ID or Shop ID required' },
        { status: 400 }
      )
    }

    const where: any = {}
    if (userId) {
      where.OR = [
        { userAId: userId },
        { userBId: userId },
      ]
    }
    if (shopId) where.shopId = shopId
    if (status) where.status = status

    const transactions = await prisma.safeTradeTransaction.findMany({
      where,
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        proposal: {
          include: {
            listing: {
              select: {
                title: true,
                images: true,
              },
            },
          },
        },
      },
      // Order by priority tier first, then by date
      orderBy: [
        { priorityTier: 'desc' }, // FAST_TRACK > PRIORITY > STANDARD
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      proposalId,
      shopId,
      scheduledDate,
      scheduledTime,
      totalAmount, // Prezzo concordato
      feePercentage = 5.0, // Default 5%
      feePaidBy = 'SELLER', // Default: fee pagata dal venditore
    } = body

    // Verify authentication
    const { requireAuth } = await import('@/lib/auth')
    const user = await requireAuth()

    // If proposalId provided, get proposal details
    let userAId: string
    let userBId: string

    let proposalData: any = null
    if (proposalId) {
      proposalData = await prisma.proposal.findUnique({
        where: { id: proposalId },
      })

      if (!proposalData) {
        return NextResponse.json(
          { error: 'Proposal not found' },
          { status: 404 }
        )
      }

      // Verify user is part of this proposal
      if (proposalData.proposerId !== user.id && proposalData.receiverId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: You are not part of this proposal' },
          { status: 403 }
        )
      }

      userAId = proposalData.proposerId
      userBId = proposalData.receiverId
    } else {
      return NextResponse.json(
        { error: 'proposalId is required' },
        { status: 400 }
      )
    }

    // Verify shop exists and belongs to merchant
    if (shopId) {
      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
      })

      if (!shop) {
        return NextResponse.json(
          { error: 'Shop not found' },
          { status: 404 }
        )
      }
    }

    // Get shop to get merchant ID
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { merchantId: true },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Determine priority tier for the buyer (userA)
    const { tier: priorityTier, isPaid: priorityPaid } = await getUserPriorityTier(userAId)
    
    // If user is using their monthly free priority, increment counter
    if (priorityTier === 'PRIORITY') {
      const subscription = await prisma.userSubscription.findUnique({
        where: { userId: userAId },
      })
      if (subscription) {
        await prisma.userSubscription.update({
          where: { userId: userAId },
          data: { priorityUsedThisMonth: { increment: 1 } },
        })
      }
    }

    const transaction = await prisma.safeTradeTransaction.create({
      data: {
        proposalId,
        userAId,
        userBId,
        shopId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        scheduledTime,
        status: SafeTradeStatus.PENDING,
        priorityTier,
        priorityPaid,
      },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
            merchantId: true,
          },
        },
      },
    })

    // Calculate fee and amounts - usa feePaidBy dalla proposta se disponibile
    const { calculateEscrowFee } = await import('@/lib/escrow-fee')
    const actualFeePaidBy = proposalData?.feePaidBy || feePaidBy
    const actualTotalAmount = totalAmount || proposalData?.offerPrice || 0
    
    const feeCalculation = calculateEscrowFee(
      actualTotalAmount,
      feePercentage,
      actualFeePaidBy as 'SELLER' | 'BUYER' | 'SPLIT'
    )

    // Generate unique QR code with crypto randomness for extra security
    const crypto = require('crypto')
    const randomSuffix = crypto.randomBytes(4).toString('hex') // 8 caratteri random
    const qrCode = `ST-${transaction.id}-${Date.now()}-${randomSuffix}`

    // Create escrow session automatically with fee calculation
    const escrowSession = await prisma.escrowSession.create({
      data: {
        transactionId: transaction.id,
        buyerId: userAId,
        sellerId: userBId,
        merchantId: shop.merchantId,
        status: 'ACTIVE',
        totalAmount: feeCalculation.totalAmount,
        feePercentage: feeCalculation.feePercentage,
        feePaidBy: feeCalculation.feePaidBy,
        feeAmount: feeCalculation.feeAmount,
        finalAmount: feeCalculation.finalAmount,
        paymentMethod: 'CASH', // Solo contanti per ora
        qrCode: qrCode,
      },
    })

    // Create system messages in escrow session with fee info
    const { getFeeDescription, formatEuro } = await import('@/lib/escrow-fee')
    const feeDescriptions = getFeeDescription(feeCalculation)

    await prisma.escrowMessage.create({
      data: {
        sessionId: escrowSession.id,
        senderId: userAId,
        content: `✅ Sessione SafeTrade creata!

📍 Pagamento: SOLO CONTANTI in negozio
${feeDescriptions.merchantMessage}

💰 Compratore: ${feeDescriptions.buyerMessage}
💵 Venditore: ${feeDescriptions.sellerMessage}

🔒 Il merchant verificherà la transazione scannerizzando il QR code univoco quando vi presentate in negozio.`,
        isSystem: true,
      },
    })

    // Create notifications for both users and merchant
    const appointmentDate = scheduledDate
      ? new Date(scheduledDate).toLocaleDateString('it-IT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
      : 'Data da confermare'

    // Priority tier messages
    const priorityMessages: Record<string, string> = {
      FAST_TRACK: '⚡ FAST TRACK - Verifica in 30 minuti!',
      PRIORITY: '🌟 PRIORITY - Coda prioritaria!',
      STANDARD: '',
    }
    const priorityNote = priorityMessages[priorityTier] ? `\n${priorityMessages[priorityTier]}` : ''

    await Promise.all([
      prisma.notification.create({
        data: {
          userId: userAId,
          type: 'TRANSACTION_CREATED',
          title: '🎉 Appuntamento Confermato!',
          message: `Il tuo appuntamento SafeTrade è stato confermato per ${appointmentDate} alle ${scheduledTime}. Riceverai un QR code univoco.${priorityNote}`,
          link: `/transaction/${transaction.id}/status`,
        },
      }),
      prisma.notification.create({
        data: {
          userId: userBId,
          type: 'TRANSACTION_CREATED',
          title: '🎉 Appuntamento Confermato!',
          message: `Il tuo appuntamento SafeTrade è stato confermato per ${appointmentDate} alle ${scheduledTime}. Riceverai un QR code univoco.${priorityNote}`,
          link: `/transaction/${transaction.id}/status`,
        },
      }),
      prisma.notification.create({
        data: {
          userId: shop.merchantId,
          type: 'ESCROW_SESSION_CREATED',
          title: priorityTier !== 'STANDARD' ? `🔔 Nuovo Appuntamento SafeTrade ${priorityMessages[priorityTier]}` : '🔔 Nuovo Appuntamento SafeTrade',
          message: `Un nuovo appuntamento SafeTrade ${priorityTier !== 'STANDARD' ? `(${priorityTier}) ` : ''}è stato programmato per ${appointmentDate} alle ${scheduledTime} presso il tuo negozio.`,
          link: `/merchant/orders`,
        },
      }),
    ])

    return NextResponse.json(
      {
        ...transaction,
        escrowSessionId: escrowSession.id,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating transaction:', error)
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

