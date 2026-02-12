import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SafeTradeStatus, PriorityTier, EscrowType } from '@prisma/client'

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
    // SECURITY: Parse and validate request body
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    const {
      proposalId,
      shopId,
      hubId, // For VERIFIED escrow
      escrowType = 'LOCAL', // 'LOCAL' or 'VERIFIED'
      scheduledDate,
      scheduledTime,
      totalAmount, // Prezzo concordato
      feePercentage = 5.0, // Default 5%
      feePaidBy = 'SELLER', // Default: fee pagata dal venditore
    } = body

    // Verify authentication
    const { requireEmailVerified } = await import('@/lib/auth')
    const user = await requireEmailVerified()

    // Rate limiting for transaction creation
    const { checkRateLimit, getRateLimitKey, RATE_LIMITS } = await import('@/lib/rate-limit')
    const rateLimitKey = getRateLimitKey(user.id, 'PAYMENT_CREATE') // Use PAYMENT_CREATE limit (10/hour)
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.PAYMENT_CREATE)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Troppe richieste. Limite di 10 transazioni per ora raggiunto.',
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

    // SECURITY #10: Validazione feePercentage (deve essere nei limiti ragionevoli)
    if (feePercentage !== undefined) {
      if (feePercentage < 0 || feePercentage > 20) {
        return NextResponse.json(
          { error: 'feePercentage deve essere tra 0 e 20%' },
          { status: 400 }
        )
      }
    }

    // SECURITY #10: Validazione feePaidBy (deve essere uno dei valori validi)
    const validFeePaidBy = ['SELLER', 'BUYER', 'SPLIT']
    if (feePaidBy && !validFeePaidBy.includes(feePaidBy)) {
      return NextResponse.json(
        { error: `feePaidBy deve essere uno di: ${validFeePaidBy.join(', ')}` },
        { status: 400 }
      )
    }

    // If proposalId provided, get proposal details
    let userAId: string
    let userBId: string

    // SECURITY: Get proposal with listing data
    let proposalData: any = null
    if (proposalId) {
      proposalData = await prisma.proposal.findUnique({
        where: { id: proposalId },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              price: true,
              userId: true, // Owner of listing
            },
          },
        },
      })

      if (!proposalData) {
        return NextResponse.json(
          { error: 'Proposal not found' },
          { status: 404 }
        )
      }

      // SECURITY: Verify proposal status is ACCEPTED (only accepted proposals can create transactions)
      if (proposalData.status !== 'ACCEPTED') {
        return NextResponse.json(
          { error: `Proposal must be ACCEPTED to create transaction. Current status: ${proposalData.status}` },
          { status: 400 }
        )
      }

      // SECURITY: Verify user is the receiver (seller) - only seller can create transaction
      if (proposalData.receiverId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: Solo il venditore può creare la transazione' },
          { status: 403 }
        )
      }

      // SECURITY: Verify proposal hasn't already been used for a transaction
      const existingTransaction = await prisma.safeTradeTransaction.findUnique({
        where: { proposalId },
      })

      if (existingTransaction) {
        return NextResponse.json(
          { error: 'Questa proposta è già stata utilizzata per creare una transazione' },
          { status: 400 }
        )
      }

      userAId = proposalData.proposerId // Buyer
      userBId = proposalData.receiverId // Seller
    } else {
      return NextResponse.json(
        { error: 'proposalId is required' },
        { status: 400 }
      )
    }

    // Validate escrowType
    if (escrowType !== 'LOCAL' && escrowType !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'escrowType deve essere LOCAL o VERIFIED' },
        { status: 400 }
      )
    }

    // For LOCAL escrow, shopId is required
    if (escrowType === 'LOCAL' && !shopId) {
      return NextResponse.json(
        { error: 'shopId è richiesto per escrow locale' },
        { status: 400 }
      )
    }

    // For VERIFIED escrow, shopId is not needed (uses central hub)
    if (escrowType === 'VERIFIED') {
      // Set initial status for VERIFIED escrow
      // Status will be ESCROW_ACTIVE after seller inserts tracking
    }

    // Verify shop exists (only for LOCAL)
    let shop: any = null
    if (escrowType === 'LOCAL' && shopId) {
      shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { merchantId: true },
      })

      if (!shop) {
        return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
      }
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

    // Determine initial status based on escrowType
    let initialStatus: SafeTradeStatus
    if (escrowType === 'VERIFIED') {
      initialStatus = SafeTradeStatus.PENDING_ESCROW_SETUP
    } else {
      initialStatus = SafeTradeStatus.PENDING
    }

    const transaction = await prisma.safeTradeTransaction.create({
      data: {
        proposalId,
        userAId,
        userBId,
        escrowType: escrowType as any, // Cast to EscrowType enum
        shopId: escrowType === 'LOCAL' ? shopId : null,
        hubId: escrowType === 'VERIFIED' ? null : hubId, // For now, VERIFIED uses central hub (no hubId needed)
        scheduledDate: escrowType === 'LOCAL' && scheduledDate ? new Date(scheduledDate) : null,
        scheduledTime: escrowType === 'LOCAL' ? scheduledTime : null,
        status: initialStatus,
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

    // SECURITY: Calculate fee and amounts server-side (usa feePaidBy dalla proposta se disponibile)
    const { calculateEscrowFee } = await import('@/lib/escrow-fee')
    const actualFeePaidBy = proposalData?.feePaidBy || feePaidBy || 'SELLER'
    
    // SECURITY: Get amount from proposal - prioritize offerPrice, fallback to listing price
    // For SALE: use offerPrice if exists, otherwise listing price
    // For TRADE: use listing price (tradeItems is description, not value)
    let actualTotalAmount = 0
    if (proposalData.type === 'SALE') {
      actualTotalAmount = totalAmount || proposalData.offerPrice || proposalData.listing?.price || 0
    } else {
      // For TRADE, use listing price as reference value
      actualTotalAmount = proposalData.listing?.price || 0
    }
    
    // SECURITY: Validate amount is valid and > 0
    if (!actualTotalAmount || actualTotalAmount <= 0) {
      return NextResponse.json(
        { error: 'Importo non valido. La proposta deve avere un prezzo valido.' },
        { status: 400 }
      )
    }

    // SECURITY: Validate amount is reasonable (max 100,000 EUR)
    if (actualTotalAmount > 100000) {
      return NextResponse.json(
        { error: 'Importo troppo elevato. Massimo €100,000 per transazione.' },
        { status: 400 }
      )
    }
    
    // SECURITY: Usa feePercentage dalla proposta se disponibile, altrimenti default 5%
    const actualFeePercentage = proposalData?.feePercentage || feePercentage || 5.0
    
    // SECURITY: Validate feePercentage is in valid range
    if (actualFeePercentage < 0 || actualFeePercentage > 20) {
      return NextResponse.json(
        { error: 'feePercentage deve essere tra 0 e 20%' },
        { status: 400 }
      )
    }
    
    // SECURITY: Ricalcola fee server-side per sicurezza (ignora eventuali modifiche client-side)
    const feeCalculation = calculateEscrowFee(
      actualTotalAmount,
      actualFeePercentage,
      actualFeePaidBy as 'SELLER' | 'BUYER' | 'SPLIT'
    )

    // SECURITY: Verifica che fee calcolata sia valida
    if (feeCalculation.feeAmount < 0 || feeCalculation.feeAmount > actualTotalAmount) {
      return NextResponse.json(
        { error: 'Errore nel calcolo delle fee. Riprova.' },
        { status: 500 }
      )
    }

    // SECURITY: Verify finalAmount is positive
    if (feeCalculation.finalAmount <= 0) {
      return NextResponse.json(
        { error: 'Importo finale non valido dopo il calcolo delle fee.' },
        { status: 500 }
      )
    }

    // Generate unique QR code with crypto randomness for extra security (deprecated, kept for compatibility)
    const crypto = require('crypto')
    const randomSuffix = crypto.randomBytes(4).toString('hex') // 8 caratteri random
    const qrCode = `ST-${transaction.id}-${Date.now()}-${randomSuffix}`

    // Generate secure QR token for check-in (new format)
    const { generateUniqueQRToken } = await import('@/lib/escrow/session-utils')
    const qrToken = await generateUniqueQRToken()

    // Set QR token expiration (7 days from creation)
    const qrTokenExpiresAt = new Date()
    qrTokenExpiresAt.setDate(qrTokenExpiresAt.getDate() + 7) // 7 days from now

    // BUG #6 FIX: Set QR code expiration (7 days from creation) - deprecated
    const qrCodeExpiresAt = new Date()
    qrCodeExpiresAt.setDate(qrCodeExpiresAt.getDate() + 7) // 7 days from now

    // Set appointment slot and expiredAt if scheduled
    let appointmentSlot: Date | null = null
    let expiredAt: Date | null = null
    if (scheduledDate && scheduledTime) {
      const [startHour, startMinute] = scheduledTime.split('-')[0].split(':').map(Number)
      appointmentSlot = new Date(scheduledDate)
      appointmentSlot.setHours(startHour, startMinute, 0, 0)
      
      // expiredAt = appointmentSlot + 1 hour
      expiredAt = new Date(appointmentSlot)
      expiredAt.setHours(expiredAt.getHours() + 1)
    }

    // Create escrow session only for LOCAL escrow
    let escrowSession = null
    if (escrowType === 'LOCAL' && shop) {
      escrowSession = await prisma.escrowSession.create({
        data: {
          transactionId: transaction.id,
          buyerId: userAId,
          sellerId: userBId,
          merchantId: shop.merchantId,
          status: scheduledDate ? 'BOOKED' : 'CREATED', // BOOKED if slot scheduled, CREATED otherwise
          totalAmount: feeCalculation.totalAmount,
          feePercentage: feeCalculation.feePercentage,
          feePaidBy: feeCalculation.feePaidBy,
          feeAmount: feeCalculation.feeAmount,
          finalAmount: feeCalculation.finalAmount,
          paymentMethod: 'CASH', // Solo contanti per ora
          // New QR token system
          qrToken: qrToken,
          qrTokenExpiresAt: qrTokenExpiresAt,
          // Deprecated QR code (kept for backward compatibility)
          qrCode: qrCode,
          qrCodeExpiresAt: qrCodeExpiresAt,
          // Appointment and timeout
          appointmentSlot: appointmentSlot,
          expiredAt: expiredAt,
        },
      })
    }

    // SECURITY: Create EscrowPayment automatically
    // For VERIFIED escrow: payment is HELD immediately (funds held in escrow account)
    // For LOCAL escrow: payment is PENDING until merchant confirms cash payment at store
    const paymentStatus = escrowType === 'VERIFIED' ? 'HELD' : 'PENDING'
    
    // SECURITY: Payment method - CASH for LOCAL, ONLINE for VERIFIED (future: will be actual online payment)
    // For now, both use CASH but status differs
    const escrowPaymentData: any = {
      transactionId: transaction.id,
      amount: feeCalculation.totalAmount, // Total amount buyer needs to pay
      currency: 'EUR',
      paymentMethod: 'CASH', // For now, both use CASH (future: ONLINE for VERIFIED)
      status: paymentStatus,
      paymentInitiatedAt: new Date(),
    }

    // For VERIFIED escrow, funds are held immediately
    if (escrowType === 'VERIFIED') {
      escrowPaymentData.paymentHeldAt = new Date()
    }

    const escrowPayment = await prisma.escrowPayment.create({
      data: escrowPaymentData,
    })

    // Create system messages only for LOCAL escrow (escrowSession exists)
    if (escrowType === 'LOCAL' && escrowSession) {
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
    }

    // Create notifications based on escrowType
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago

    // userAId = buyer (proposer), userBId = seller (receiver)
    const notificationData: any[] = []

    if (escrowType === 'LOCAL') {
      // LOCAL escrow notifications
      const appointmentDate = scheduledDate
        ? new Date(scheduledDate).toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })
        : 'Data da confermare'

      const priorityMessages: Record<string, string> = {
        FAST_TRACK: '⚡ FAST TRACK - Verifica in 30 minuti!',
        PRIORITY: '🌟 PRIORITY - Coda prioritaria!',
        STANDARD: '',
      }
      const priorityNote = priorityMessages[priorityTier] ? `\n${priorityMessages[priorityTier]}` : ''

      notificationData.push(
        {
          userId: userAId, // Buyer - gets welcome page
          type: 'TRANSACTION_CREATED',
          title: '🎉 Transazione Creata!',
          message: `Il venditore ha selezionato il negozio! La tua transazione per "${proposalData?.listing?.title || 'la carta'}" è stata creata. Visualizza i dettagli e il QR code.`,
          link: `/transaction/${transaction.id}/welcome`,
        },
        {
          userId: userBId, // Seller - direct link to transaction
          type: 'TRANSACTION_CREATED',
          title: '🎉 Appuntamento Confermato!',
          message: `Il tuo appuntamento SafeTrade è stato confermato per ${appointmentDate} alle ${scheduledTime}. Riceverai un QR code univoco.${priorityNote}`,
          link: `/transaction/${transaction.id}/status`,
        },
        {
          userId: shop!.merchantId,
          type: 'ESCROW_SESSION_CREATED',
          title: priorityTier !== 'STANDARD' ? `🔔 Nuovo Appuntamento SafeTrade ${priorityMessages[priorityTier]}` : '🔔 Nuovo Appuntamento SafeTrade',
          message: `Un nuovo appuntamento SafeTrade ${priorityTier !== 'STANDARD' ? `(${priorityTier}) ` : ''}è stato programmato per ${appointmentDate} alle ${scheduledTime} presso il tuo negozio.`,
          link: `/merchant/orders`,
        }
      )
    } else {
      // VERIFIED escrow notifications
      notificationData.push(
        {
          userId: userAId, // Buyer
          type: 'TRANSACTION_CREATED',
          title: '🎉 Transazione Verified Escrow Creata!',
          message: `Il venditore ha scelto Verified Escrow! La tua transazione per "${proposalData?.listing?.title || 'la carta'}" è stata creata. Il venditore spedirà la carta al nostro hub per la verifica professionale.`,
          link: `/transaction/${transaction.id}/status`,
        },
        {
          userId: userBId, // Seller
          type: 'TRANSACTION_CREATED',
          title: '🎉 Verified Escrow Attivato!',
          message: `Hai scelto Verified Escrow! Genera l'etichetta di spedizione quando sei pronto a spedire la carta al nostro hub centrale. Il nostro team verificherà la carta prima di rispedirla all'acquirente.`,
          link: `/transaction/${transaction.id}/verified-escrow/generate-label`,
        }
      )

      // SECURITY: Create AdminNotification for VERIFIED escrow transactions
      // Admin needs to know about new Verified Escrow transactions to organize shipping
      await prisma.adminNotification.create({
        data: {
          type: 'URGENT_ACTION',
          referenceType: 'TRANSACTION',
          referenceId: transaction.id,
          title: `📦 Nuova Transazione Verified Escrow - Ordine #${transaction.id.slice(0, 8)}`,
          message: `Nuova transazione Verified Escrow creata. Seller: ${transaction.userB.name || transaction.userB.email}, Buyer: ${transaction.userA.name || transaction.userA.email}, Importo: €${feeCalculation.totalAmount.toFixed(2)}. Il seller inserirà il tracking number a breve - organizzare ricezione pacchi.`,
          priority: 'NORMAL',
          targetRoles: ['ADMIN', 'HUB_STAFF'],
        },
      })
    }

    // Check for duplicates and create only new notifications
    const notificationsToCreate = await Promise.all(
      notificationData.map(async (notif) => {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: notif.userId,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            createdAt: {
              gte: fiveMinutesAgo, // Created in last 5 minutes
            },
          },
        })
        return existing ? null : notif
      })
    )

    // Filter out nulls (duplicates) and create notifications
    const newNotifications = notificationsToCreate.filter((n): n is typeof notificationData[0] => n !== null)
    
    if (newNotifications.length > 0) {
      await prisma.notification.createMany({
        data: newNotifications,
      })
    }

    return NextResponse.json(
      {
        ...transaction,
        escrowSessionId: escrowSession?.id || null,
        escrowPaymentId: escrowPayment.id,
      },
      { status: 201 }
    )
  } catch (error: any) {
    // SECURITY: Log detailed error for debugging (server-side only)
    console.error('[TRANSACTION_CREATE_ERROR]', {
      error: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 500), // Limit stack trace length
      timestamp: new Date().toISOString(),
    })

    // SECURITY: Handle specific error types
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }
    if (error.message === 'Email not verified') {
      return NextResponse.json(
        { error: 'Email non verificata. Verifica la tua email per creare transazioni.' },
        { status: 403 }
      )
    }

    // SECURITY: Handle Prisma errors
    if (error.code === 'P2002') {
      // Unique constraint violation
      return NextResponse.json(
        { error: 'Transazione già esistente per questa proposta' },
        { status: 409 }
      )
    }

    if (error.code === 'P2003') {
      // Foreign key constraint violation
      return NextResponse.json(
        { error: 'Riferimento non valido nella transazione' },
        { status: 400 }
      )
    }

    // SECURITY: Generic error (don't expose internal details to prevent information leakage)
    return NextResponse.json(
      { error: 'Errore nella creazione della transazione. Riprova più tardi.' },
      { status: 500 }
    )
  }
}


