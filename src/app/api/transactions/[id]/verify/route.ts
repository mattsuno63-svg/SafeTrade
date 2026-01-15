import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params
    const body = await request.json()
    const { code, verified, notes } = body

    // Support both code-based verification and manual verification
    if (!code && verified === undefined) {
      return NextResponse.json(
        { error: 'Verification code or verified status is required' },
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

    // BUG #8 FIX: Rate limiting for transaction verification
    const rateLimitKey = getRateLimitKey(user.id, 'TRANSACTION_VERIFY')
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.TRANSACTION_VERIFY)
    
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

    // Code-based verification
    if (code) {
      if (transaction.verificationCode !== code.toUpperCase()) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
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

    // Check if transaction is in correct state for completion
    if (transaction.status !== 'CONFIRMED' && transaction.status !== 'PENDING') {
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

    // Crea PendingRelease invece di rilasciare automaticamente i fondi
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
      // Verifica se esiste già una pending release per questo pagamento
      const existingPendingRelease = await prisma.pendingRelease.findFirst({
        where: {
          orderId: id,
          type: 'RELEASE_TO_SELLER',
          status: 'PENDING',
        },
      })

      if (!existingPendingRelease) {
        // Crea PendingRelease invece di rilasciare direttamente
        const pendingRelease = await prisma.pendingRelease.create({
          data: {
            orderId: id,
            type: 'RELEASE_TO_SELLER',
            amount: payment.amount,
            recipientId: payment.transaction.userBId, // Seller
            recipientType: 'SELLER',
            reason: `Rilascio fondi dopo verifica transazione completata`,
            triggeredBy: 'TRANSACTION_VERIFIED',
            triggeredAt: new Date(),
          },
        })

        // Crea notifica admin/moderator
        await prisma.adminNotification.create({
          data: {
            type: 'PENDING_RELEASE',
            referenceType: 'PENDING_RELEASE',
            referenceId: pendingRelease.id,
            title: `Rilascio fondi in attesa - Ordine #${id.slice(0, 8)}`,
            message: `Richiesta di rilascio di €${payment.amount.toFixed(2)} al venditore dopo verifica transazione`,
            priority: 'NORMAL',
            targetRoles: ['ADMIN', 'MODERATOR'],
          },
        })
      }

      // Update escrow session
      const session = await prisma.escrowSession.findUnique({
        where: { transactionId: id },
      })

      if (session) {
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

    // BUG #7 FIX: Check for duplicate notifications before creating
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    const notificationData = [
      {
        userId: transaction.userAId,
        type: 'TRANSACTION_COMPLETED' as const,
        title: 'SafeTrade Completed!',
        message: `Your SafeTrade at ${transaction.shop.name} has been successfully completed.`,
        data: {
          transactionId: id,
          shopId: transaction.shopId,
        },
      },
      {
        userId: transaction.userBId,
        type: 'TRANSACTION_COMPLETED' as const,
        title: 'SafeTrade Completed!',
        message: `Your SafeTrade at ${transaction.shop.name} has been successfully completed.`,
        data: {
          transactionId: id,
          shopId: transaction.shopId,
        },
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
