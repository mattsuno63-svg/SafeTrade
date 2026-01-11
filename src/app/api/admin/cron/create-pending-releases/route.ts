import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/cron/create-pending-releases
 * 
 * Worker/Cron Job che crea PendingRelease per ordini pronti per rilascio.
 * NON rilascia automaticamente! Crea solo richieste pendenti.
 * 
 * Chiamare con: Authorization: Bearer <CRON_SECRET> (da env)
 * 
 * Esegue ogni ora (cron: 0 * * * *)
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica secret per sicurezza (opzionale ma consigliato)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Trova ordini COMPLETATI con pacchi DELIVERED da almeno 7 giorni
    // che NON hanno dispute aperte e NON hanno già una pending_release
    const eligibleTransactions = await prisma.safeTradeTransaction.findMany({
      where: {
        status: 'COMPLETED',
        packageStatus: 'DELIVERED',
        packageDeliveredAt: {
          lte: sevenDaysAgo,
        },
        escrowPayment: {
          status: 'HELD', // Fondi ancora in escrow
        },
        disputes: {
          none: {
            status: {
              in: ['OPEN', 'SELLER_RESPONSE', 'IN_MEDIATION', 'ESCALATED'],
            },
          },
        },
        pendingReleases: {
          none: {
            status: 'PENDING',
            type: 'RELEASE_TO_SELLER',
          },
        },
      },
      include: {
        escrowPayment: true,
        userB: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        disputes: {
          where: {
            status: {
              in: ['OPEN', 'SELLER_RESPONSE', 'IN_MEDIATION', 'ESCALATED'],
            },
          },
          take: 1,
        },
      },
    })

    const created = []
    const errors = []

    for (const transaction of eligibleTransactions) {
      try {
        // Doppio controllo: verifica che non esista già una pending_release
        const existing = await prisma.pendingRelease.findFirst({
          where: {
            orderId: transaction.id,
            type: 'RELEASE_TO_SELLER',
            status: 'PENDING',
          },
        })

        if (existing) {
          continue // Salta se già esiste
        }

        if (!transaction.escrowPayment) {
          continue // Salta se non c'è pagamento
        }

        // Crea PendingRelease
        const pendingRelease = await prisma.pendingRelease.create({
          data: {
            orderId: transaction.id,
            type: 'RELEASE_TO_SELLER',
            amount: transaction.escrowPayment.amount,
            recipientId: transaction.userBId, // Seller
            recipientType: 'SELLER',
            reason: `Ordine #${transaction.id.slice(0, 8)} consegnato da 7+ giorni, nessuna dispute aperta`,
            triggeredBy: 'DELIVERY_CONFIRMED_TIMEOUT',
            triggeredAt: now,
          },
        })

        // Crea notifica admin/moderator
        await prisma.adminNotification.create({
          data: {
            type: 'PENDING_RELEASE',
            referenceType: 'PENDING_RELEASE',
            referenceId: pendingRelease.id,
            title: `Rilascio fondi in attesa - Ordine #${transaction.id.slice(0, 8)}`,
            message: `€${transaction.escrowPayment.amount.toFixed(2)} pronti per rilascio a ${transaction.userB.name || transaction.userB.email}. Ordine consegnato da 7+ giorni.`,
            priority: 'NORMAL',
            targetRoles: ['ADMIN', 'MODERATOR'],
          },
        })

        created.push({
          transactionId: transaction.id,
          pendingReleaseId: pendingRelease.id,
          amount: transaction.escrowPayment.amount,
        })
      } catch (error: any) {
        console.error(`Error creating pending release for transaction ${transaction.id}:`, error)
        errors.push({
          transactionId: transaction.id,
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: eligibleTransactions.length,
      created: created.length,
      errors: errors.length,
      details: {
        created,
        errors: errors.length > 0 ? errors : undefined,
      },
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Error in create-pending-releases cron:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/cron/create-pending-releases
 * Endpoint per test manuale (solo in development)
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Method not allowed in production' },
      { status: 405 }
    )
  }

  // In development, permette chiamata GET per test
  return POST(request)
}

