import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/cron/notify-pending-timeout
 * 
 * Worker/Cron Job che notifica admin per pending_release in attesa da >24h.
 * 
 * Chiamare con: Authorization: Bearer <CRON_SECRET> (da env)
 * 
 * Esegue ogni 6 ore (cron schedule: 0 0,6,12,18 * * *)
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
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Trova pending_release in PENDING da più di 24 ore
    const stalePendingReleases = await prisma.pendingRelease.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lte: twentyFourHoursAgo,
        },
      },
      include: {
        order: {
          include: {
            userB: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Le più vecchie prima
      },
    })

    const notified = []
    const errors = []

    for (const pendingRelease of stalePendingReleases) {
      try {
        // Verifica se esiste già una notifica URGENT per questo pending release
        const existingNotification = await prisma.adminNotification.findFirst({
          where: {
            type: 'PENDING_RELEASE',
            referenceType: 'PENDING_RELEASE',
            referenceId: pendingRelease.id,
            priority: 'URGENT',
            createdAt: {
              gte: new Date(now.getTime() - 6 * 60 * 60 * 1000), // Negli ultimi 6h
            },
          },
        })

        if (existingNotification) {
          continue // Già notificato di recente
        }

        // Calcola ore in attesa
        const hoursWaiting = Math.floor((now.getTime() - pendingRelease.createdAt.getTime()) / (60 * 60 * 1000))

        // Crea notifica URGENT
        await prisma.adminNotification.create({
          data: {
            type: 'PENDING_RELEASE',
            referenceType: 'PENDING_RELEASE',
            referenceId: pendingRelease.id,
            title: `⚠️ Rilascio fondi in attesa da ${hoursWaiting}h - Ordine #${pendingRelease.orderId?.slice(0, 8) || 'N/A'}`,
            message: `€${pendingRelease.amount.toFixed(2)} in attesa di approvazione da ${hoursWaiting} ore. Destinatario: ${pendingRelease.recipient.name || pendingRelease.recipient.email}`,
            priority: 'URGENT',
            targetRoles: ['ADMIN', 'MODERATOR'],
          },
        })

        notified.push({
          pendingReleaseId: pendingRelease.id,
          hoursWaiting,
          amount: pendingRelease.amount,
        })
      } catch (error: any) {
        console.error(`Error notifying for pending release ${pendingRelease.id}:`, error)
        errors.push({
          pendingReleaseId: pendingRelease.id,
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      found: stalePendingReleases.length,
      notified: notified.length,
      errors: errors.length,
      details: {
        notified,
        errors: errors.length > 0 ? errors : undefined,
      },
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Error in notify-pending-timeout cron:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/cron/notify-pending-timeout
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

