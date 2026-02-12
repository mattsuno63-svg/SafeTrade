import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = 'then' in params ? await params : params
    const { id } = resolvedParams
    const body = await request.json()
    const { code, verified, notes } = body

    // Support both code-based verification and manual verification
    if (!code && verified === undefined) {
      return NextResponse.json(
        { error: 'Verification code or verified status is required' },
        { status: 400 }
      )
    }

    // Get the transaction with full escrow session details
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id },
      include: {
        shop: true,
        userA: true,
        userB: true,
        escrowSession: {
          select: {
            id: true,
            qrCode: true,
            qrToken: true,
            status: true,
            buyerPresent: true,
            sellerPresent: true,
            checkInAt: true,
          },
        },
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

    // Verify that the user is the shop owner or admin (only for shop-based transactions)
    if (!transaction.shop) {
      return NextResponse.json(
        { error: 'This transaction is not shop-based' },
        { status: 400 }
      )
    }

    const isShopOwner = transaction.shop.merchantId === user.id
    const isAdmin = user.role === 'ADMIN'
    
    if (!isShopOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Only the shop owner or admin can verify transactions' },
        { status: 403 }
      )
    }

    // Rate limiting for transaction verification
    const rateLimitKey = getRateLimitKey(user.id, 'TRANSACTION_VERIFY')
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.TRANSACTION_VERIFY)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Troppe richieste. Limite di 20 verifiche per ora raggiunto.',
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

    // BUG #3 FIX: Check if transaction is already completed or cancelled
    if (transaction.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Transaction has already been completed and cannot be modified' },
        { status: 400 }
      )
    }

    if (transaction.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Transaction has been cancelled and cannot be verified' },
        { status: 400 }
      )
    }

    // BUG #3 FIX: Check if there's already a PendingRelease for this transaction
    const existingPendingRelease = await prisma.pendingRelease.findFirst({
      where: {
        orderId: id,
        status: 'PENDING',
      },
    })

    if (existingPendingRelease) {
      return NextResponse.json(
        { 
          error: 'A pending release is already in progress for this transaction. Please wait for admin approval.',
          pendingReleaseId: existingPendingRelease.id,
        },
        { status: 400 }
      )
    }

    // SECURITY: Require escrow session for verification
    if (!transaction.escrowSession) {
      return NextResponse.json(
        { error: 'Sessione escrow non trovata. Impossibile verificare la transazione.' },
        { status: 400 }
      )
    }

    const session = transaction.escrowSession

    // SECURITY: Double-check system - Require CHECKED_IN status (both buyer and seller present)
    if (session.status !== 'CHECKED_IN') {
      return NextResponse.json(
        { 
          error: 'Check-in richiesto prima della verifica',
          requiresCheckIn: true,
          sessionStatus: session.status,
          message: 'Entrambi buyer e seller devono essere presenti e confermati prima di procedere con la verifica.',
        },
        { status: 400 }
      )
    }

    // SECURITY: Verify both parties are present
    if (!session.buyerPresent || !session.sellerPresent) {
      return NextResponse.json(
        { 
          error: 'Presenza non confermata',
          requiresCheckIn: true,
          buyerPresent: session.buyerPresent,
          sellerPresent: session.sellerPresent,
          message: 'Entrambi buyer e seller devono essere presenti. Esegui il check-in prima di procedere.',
        },
        { status: 400 }
      )
    }

    // Code-based verification (optional - for manual entry)
    // Accept both transaction.verificationCode and escrowSession.qrCode
    if (code) {
      const normalizedCode = code.trim().toUpperCase()
      const isValidCode = 
        transaction.verificationCode?.toUpperCase() === normalizedCode ||
        (session.qrCode && session.qrCode.toUpperCase() === normalizedCode)
      
      if (!isValidCode) {
        return NextResponse.json(
          { error: 'Codice di verifica non valido' },
          { status: 400 }
        )
      }
    }

    // Manual verification - merchant can reject
    if (verified === false) {
      // Cancel the transaction
      const cancelledTransaction = await prisma.safeTradeTransaction.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: notes || 'Rejected by merchant during verification',
        },
      })

      // Refund escrow if exists - Create PendingRelease instead of direct refund
      const payment = await prisma.escrowPayment.findUnique({
        where: { transactionId: id },
        include: {
          transaction: {
            include: {
              userA: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      })

      if (payment && (payment.status === 'HELD' || payment.status === 'PENDING')) {
        // Verifica se esiste già una pending release per questo rimborso
        const existingPendingRelease = await prisma.pendingRelease.findFirst({
          where: {
            orderId: id,
            type: 'REFUND_FULL',
            status: 'PENDING',
          },
        })

        if (!existingPendingRelease) {
          // Crea PendingRelease invece di rimborsare direttamente
          const pendingRelease = await prisma.pendingRelease.create({
            data: {
              orderId: id,
              type: 'REFUND_FULL',
              amount: payment.amount,
              recipientId: payment.transaction.userAId, // Buyer
              recipientType: 'BUYER',
              reason: notes || `Rimborso richiesto da Merchant - Transazione rifiutata durante verifica`,
              triggeredBy: 'MERCHANT_REJECT',
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
              title: `Rimborso in attesa - Ordine #${id.slice(0, 8)}`,
              message: `Richiesta di rimborso di €${payment.amount.toFixed(2)} all'acquirente ${payment.transaction.userA.name || payment.transaction.userA.email}. Motivo: Transazione rifiutata dal merchant.${notes ? ` Note: ${notes}` : ''}`,
              priority: 'NORMAL',
              targetRoles: ['ADMIN', 'MODERATOR'],
            },
          })

          // Create system message in escrow session if exists
          const session = await prisma.escrowSession.findUnique({
            where: { transactionId: id },
          })

          if (session) {
            await prisma.escrowMessage.create({
              data: {
                sessionId: session.id,
                senderId: user.id,
                content: `Transazione rifiutata. Richiesta di rimborso di €${payment.amount.toFixed(2)} all'acquirente creata. In attesa di approvazione Admin/Moderator.${notes ? ` Motivo: ${notes}` : ''}`,
                isSystem: true,
              },
            })
          }
        }
      }

      // Re-activate listing
      if (transaction.proposal?.listing) {
        await prisma.listingP2P.update({
          where: { id: transaction.proposal.listing.id },
          data: {
            isActive: true,
            isSold: false,
          },
        })
      }

      // BUG #7 FIX: Check for duplicate notifications before creating
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      const notificationData = [
        {
          userId: transaction.userAId,
          type: 'TRANSACTION_CANCELLED',
          title: 'Transazione Annullata',
          message: `La transazione è stata annullata durante la verifica. ${notes ? `Motivo: ${notes}` : ''}`,
        },
        {
          userId: transaction.userBId,
          type: 'TRANSACTION_CANCELLED',
          title: 'Transazione Annullata',
          message: `La transazione è stata annullata durante la verifica. ${notes ? `Motivo: ${notes}` : ''}`,
        },
      ]

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

      return NextResponse.json({
        success: true,
        cancelled: true,
        transaction: cancelledTransaction,
      })
    }

    // SECURITY: Follow state machine - Update escrow session status instead of completing directly
    // Import state machine utilities
    const { transitionSessionStatus, createAuditEvent, parseUserRole } = await import('@/lib/escrow/session-utils')
    
    // Determine what to do based on current session status
    let newSessionStatus: string
    let action: 'VERIFY' | 'COMPLETE' = 'VERIFY'
    
    if (session.status === 'CHECKED_IN') {
      // Start verification process
      newSessionStatus = 'VERIFICATION_IN_PROGRESS'
    } else if (session.status === 'VERIFICATION_IN_PROGRESS') {
      // Complete verification (card verified successfully)
      newSessionStatus = 'VERIFICATION_PASSED'
    } else if (session.status === 'VERIFICATION_PASSED') {
      // Request release (but don't complete transaction yet - requires admin approval)
      newSessionStatus = 'RELEASE_REQUESTED'
      action = 'COMPLETE'
    } else {
      return NextResponse.json(
        { 
          error: `Stato sessione non valido per la verifica: ${session.status}`,
          currentStatus: session.status,
          requiredStatus: 'CHECKED_IN',
        },
        { status: 400 }
      )
    }

    // Transition session status
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined
    const userRole = parseUserRole(user.role) || 'MERCHANT'

    const transitionResult = await transitionSessionStatus(
      session.id,
      newSessionStatus as any,
      user.id,
      userRole,
      {
        ipAddress,
        userAgent,
      }
    )

    if (!transitionResult.success) {
      return NextResponse.json(
        { error: transitionResult.error || 'Errore nella transizione di stato' },
        { status: 400 }
      )
    }

    // Update session with verification details
    await prisma.escrowSession.update({
      where: { id: session.id },
      data: {
        lastActivity: new Date(),
      },
    })

    // Update transaction status based on session status
    if (newSessionStatus === 'VERIFICATION_IN_PROGRESS' || newSessionStatus === 'VERIFICATION_PASSED') {
      // Verification in progress or passed - update transaction to CONFIRMED
      await prisma.safeTradeTransaction.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
        },
      })
    } else if (newSessionStatus === 'RELEASE_REQUESTED') {
      // Release requested - create pending release for admin approval (don't complete transaction yet)
      const payment = await prisma.escrowPayment.findUnique({
        where: { transactionId: id },
        include: {
          transaction: {
            include: {
              userB: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      })

      if (payment && payment.status === 'HELD') {
        // Check if pending release already exists
        const existingPendingRelease = await prisma.pendingRelease.findFirst({
          where: {
            orderId: id,
            type: 'RELEASE_TO_SELLER',
            status: 'PENDING',
          },
        })

        if (!existingPendingRelease) {
          // Create PendingRelease for admin approval
          const pendingRelease = await prisma.pendingRelease.create({
            data: {
              orderId: id,
              type: 'RELEASE_TO_SELLER',
              amount: payment.amount,
              recipientId: payment.transaction.userBId, // Seller
              recipientType: 'SELLER',
              reason: `Rilascio fondi dopo verifica transazione completata. Verifica carta: OK.`,
              triggeredBy: 'TRANSACTION_VERIFIED',
              triggeredAt: new Date(),
            },
          })

          // Create admin notification
          await prisma.adminNotification.create({
            data: {
              type: 'PENDING_RELEASE',
              referenceType: 'PENDING_RELEASE',
              referenceId: pendingRelease.id,
              title: `Rilascio fondi in attesa - Ordine #${id.slice(0, 8)}`,
              message: `Richiesta di rilascio di €${payment.amount.toFixed(2)} al venditore dopo verifica transazione completata.`,
              priority: 'NORMAL',
              targetRoles: ['ADMIN', 'MODERATOR'],
            },
          })

          // Create system message in escrow session
          await prisma.escrowMessage.create({
            data: {
              sessionId: session.id,
              senderId: user.id,
              content: `Transazione verificata! Richiesta di rilascio di €${payment.amount.toFixed(2)} al venditore creata. In attesa di approvazione Admin/Moderator.`,
              isSystem: true,
            },
          })
        }
      }
      
      // Don't update transaction to COMPLETED - wait for admin approval
    }

    // Get updated session status
    const updatedSession = await prisma.escrowSession.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        status: true,
        buyerPresent: true,
        sellerPresent: true,
      },
    })

    return NextResponse.json({
      success: true,
      sessionStatus: updatedSession?.status,
      message: newSessionStatus === 'VERIFICATION_PASSED' 
        ? 'Verifica completata. Richiesta di rilascio fondi inviata per approvazione.'
        : newSessionStatus === 'RELEASE_REQUESTED'
        ? 'Richiesta di rilascio fondi inviata. In attesa di approvazione admin.'
        : 'Verifica in corso.',
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
