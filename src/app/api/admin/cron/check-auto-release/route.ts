import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SafeTradeStatus, HubPackageStatus } from '@prisma/client'

/**
 * POST /api/admin/cron/check-auto-release
 * Cron job per auto-release fondi dopo 72h dalla consegna
 * Eseguire ogni ora
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify this is called from cron (add secret token in production)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000) // 72 hours ago

    // Find transactions that:
    // - Are VERIFIED escrow
    // - Status is DELIVERED_TO_BUYER
    // - packageDeliveredAt is older than 72 hours
    // - Not already confirmed or released
    const transactionsToAutoRelease = await prisma.safeTradeTransaction.findMany({
      where: {
        escrowType: 'VERIFIED',
        status: SafeTradeStatus.DELIVERED_TO_BUYER,
        packageDeliveredAt: {
          lte: seventyTwoHoursAgo,
        },
        confirmedReceivedAt: null, // Not manually confirmed
      },
      include: {
        escrowPayment: true,
        pendingReleases: {
          where: {
            type: 'RELEASE_TO_SELLER',
            status: { in: ['PENDING', 'APPROVED'] },
          },
        },
      },
    })

    const results = {
      checked: transactionsToAutoRelease.length,
      autoReleased: 0,
      errors: [] as string[],
    }

    for (const transaction of transactionsToAutoRelease) {
      try {
        // Skip if pending release already exists
        if (transaction.pendingReleases.length > 0) {
          continue
        }

        // Skip if no payment or payment not HELD
        if (!transaction.escrowPayment || transaction.escrowPayment.status !== 'HELD') {
          continue
        }

        // Create PendingRelease
        const pendingRelease = await prisma.pendingRelease.create({
          data: {
            orderId: transaction.id,
            type: 'RELEASE_TO_SELLER',
            amount: transaction.escrowPayment.amount,
            recipientId: transaction.userBId, // Seller
            recipientType: 'SELLER',
            reason: `Auto-release dopo 72h dalla consegna. L'acquirente non ha confermato manualmente la ricezione.`,
            triggeredBy: 'AUTO_RELEASE_72H',
            triggeredAt: now,
          },
        })

        // Update transaction status
        await prisma.safeTradeTransaction.update({
          where: { id: transaction.id },
          data: {
            status: SafeTradeStatus.RELEASE_REQUESTED,
            autoReleaseAt: now,
          },
        })

        // Create admin notification
        await prisma.adminNotification.create({
          data: {
            type: 'PENDING_RELEASE',
            referenceType: 'PENDING_RELEASE',
            referenceId: pendingRelease.id,
            title: `Auto-Release Richiesto - 72h Scadute`,
            message: `Auto-release di €${transaction.escrowPayment.amount.toFixed(2)} al venditore per transazione ${transaction.id.slice(0, 8)}. 72h dalla consegna sono passate senza conferma manuale.`,
            priority: 'NORMAL',
            targetRoles: ['ADMIN', 'MODERATOR'],
          },
        })

        // Create notifications
        await Promise.all([
          prisma.notification.create({
            data: {
              userId: transaction.userBId, // Seller
              type: 'TRANSACTION_UPDATED',
              title: '⏰ Auto-Release Richiesto',
              message: `Sono passate 72h dalla consegna. Il rilascio dei fondi è stato richiesto automaticamente.`,
              link: `/transaction/${transaction.id}/status`,
            },
          }),
          prisma.notification.create({
            data: {
              userId: transaction.userAId, // Buyer
              type: 'TRANSACTION_UPDATED',
              title: '⏰ Auto-Release Richiesto',
              message: `Sono passate 72h dalla consegna. Il rilascio dei fondi al venditore è stato richiesto automaticamente.`,
              link: `/transaction/${transaction.id}/status`,
            },
          }),
        ])

        results.autoReleased++
      } catch (error: any) {
        console.error(`Error auto-releasing transaction ${transaction.id}:`, error)
        results.errors.push(`Transaction ${transaction.id}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: now.toISOString(),
    })
  } catch (error: any) {
    console.error('Error in auto-release cron:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}


