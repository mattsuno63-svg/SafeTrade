import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/alerts - Get user's price alerts
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const alerts = await prisma.priceAlert.findMany({
      where: { userId: user.id },
      include: {
        triggers: {
          orderBy: { triggeredAt: 'desc' },
          take: 5,
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                price: true,
                images: true,
                isSold: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get user's subscription to check alert limits
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId: user.id },
      include: { plan: true },
    })

    const maxAlerts = subscription?.plan?.maxAlerts || 3
    const canAddMore = maxAlerts === -1 || alerts.filter(a => a.isActive).length < maxAlerts

    return NextResponse.json({
      alerts,
      maxAlerts: maxAlerts === -1 ? 'unlimited' : maxAlerts,
      activeCount: alerts.filter(a => a.isActive).length,
      canAddMore,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching alerts:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

// POST /api/alerts - Create a new price alert
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { cardName, cardSet, game, maxPrice, minPrice, rarity, condition, notifyEmail, notifyPush } = body

    // Check subscription limits
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId: user.id },
      include: { plan: true },
    })

    const maxAlerts = subscription?.plan?.maxAlerts || 3
    const currentAlertCount = await prisma.priceAlert.count({
      where: { userId: user.id, isActive: true },
    })

    if (maxAlerts !== -1 && currentAlertCount >= maxAlerts) {
      return NextResponse.json({
        error: `Hai raggiunto il limite di ${maxAlerts} alert. Passa a Premium per avere più alert!`,
        limitReached: true,
      }, { status: 403 })
    }

    // Check if user can use push notifications
    const canUsePush = subscription?.plan?.instantNotifications || false
    if (notifyPush && !canUsePush) {
      return NextResponse.json({
        error: 'Le notifiche push istantanee sono disponibili solo per membri Premium',
        premiumRequired: true,
      }, { status: 403 })
    }

    // At least one condition must be set
    if (!cardName && !cardSet && !game && !maxPrice && !rarity) {
      return NextResponse.json({
        error: 'Devi specificare almeno una condizione per l\'alert',
      }, { status: 400 })
    }

    const alert = await prisma.priceAlert.create({
      data: {
        userId: user.id,
        cardName,
        cardSet,
        game: game || undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        rarity,
        condition: condition || undefined,
        notifyEmail: notifyEmail ?? true,
        notifyPush: notifyPush && canUsePush,
      },
    })

    return NextResponse.json({
      alert,
      message: 'Alert creato! Riceverai una notifica quando troveremo carte corrispondenti.',
    }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating alert:', error)
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }
}

// PATCH /api/alerts - Update an alert
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { alertId, isActive, ...updates } = body

    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID required' }, { status: 400 })
    }

    // Verify ownership
    const alert = await prisma.priceAlert.findUnique({
      where: { id: alertId },
    })

    if (!alert || alert.userId !== user.id) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    const updatedAlert = await prisma.priceAlert.update({
      where: { id: alertId },
      data: {
        isActive: isActive ?? alert.isActive,
        ...updates,
      },
    })

    return NextResponse.json({
      alert: updatedAlert,
      message: isActive === false ? 'Alert disattivato' : 'Alert aggiornato',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating alert:', error)
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}

// DELETE /api/alerts - Delete an alert
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const alertId = request.nextUrl.searchParams.get('id')

    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID required' }, { status: 400 })
    }

    // Verify ownership
    const alert = await prisma.priceAlert.findUnique({
      where: { id: alertId },
    })

    if (!alert || alert.userId !== user.id) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    await prisma.priceAlert.delete({
      where: { id: alertId },
    })

    return NextResponse.json({
      success: true,
      message: 'Alert eliminato',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting alert:', error)
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 })
  }
}

