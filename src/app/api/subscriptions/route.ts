import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// POST /api/subscriptions - Crea o aggiorna subscription (upgrade/downgrade)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { planName, billingPeriod = 'MONTHLY' } = body

    // Trova il piano richiesto
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { name: planName },
    })

    if (!plan) {
      return NextResponse.json(
        { error: 'Piano non trovato' },
        { status: 404 }
      )
    }

    // Calcola end date (1 mese o 1 anno)
    const startDate = new Date()
    let endDate: Date | null = null
    
    if (plan.tier !== 'FREE') {
      endDate = new Date(startDate)
      if (billingPeriod === 'YEARLY') {
        endDate.setFullYear(endDate.getFullYear() + 1)
      } else {
        endDate.setMonth(endDate.getMonth() + 1)
      }
    }

    // Crea o aggiorna subscription
    const subscription = await prisma.userSubscription.upsert({
      where: { userId: user.id },
      update: {
        planId: plan.id,
        billingPeriod,
        status: 'ACTIVE',
        startDate,
        endDate,
        cancelledAt: null,
        priorityUsedThisMonth: 0,
      },
      create: {
        userId: user.id,
        planId: plan.id,
        billingPeriod,
        status: 'ACTIVE',
        startDate,
        endDate,
        priorityUsedThisMonth: 0,
      },
      include: {
        plan: true,
      },
    })

    // Assegna badge in base al tier
    if (plan.tier === 'PREMIUM') {
      const premiumBadge = await prisma.badge.findFirst({
        where: { name: 'Premium Member' },
      })
      if (premiumBadge) {
        await prisma.userBadge.upsert({
          where: {
            userId_badgeId: {
              userId: user.id,
              badgeId: premiumBadge.id,
            },
          },
          update: {},
          create: {
            userId: user.id,
            badgeId: premiumBadge.id,
          },
        })
      }
    } else if (plan.tier === 'PRO') {
      const proBadge = await prisma.badge.findFirst({
        where: { name: 'PRO Member' },
      })
      if (proBadge) {
        await prisma.userBadge.upsert({
          where: {
            userId_badgeId: {
              userId: user.id,
              badgeId: proBadge.id,
            },
          },
          update: {},
          create: {
            userId: user.id,
            badgeId: proBadge.id,
          },
        })
      }
    }

    // Crea notifica
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'subscription_updated',
        title: `Benvenuto in SafeTrade ${plan.name}!`,
        message: `Il tuo abbonamento ${plan.name} è ora attivo. Goditi tutte le features premium!`,
        link: '/dashboard/subscription',
      },
    })

    return NextResponse.json({
      success: true,
      subscription,
      message: `Abbonamento ${plan.name} attivato con successo!`,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    )
  }
}

// DELETE /api/subscriptions - Cancella subscription
export async function DELETE() {
  try {
    const user = await requireAuth()

    const subscription = await prisma.userSubscription.findUnique({
      where: { userId: user.id },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'Nessun abbonamento attivo' },
        { status: 404 }
      )
    }

    // Marca come cancellato (resta attivo fino a endDate)
    await prisma.userSubscription.update({
      where: { userId: user.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    })

    // Crea notifica
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'subscription_cancelled',
        title: 'Abbonamento cancellato',
        message: `Il tuo abbonamento rimarrà attivo fino al ${subscription.endDate?.toLocaleDateString('it-IT')}`,
        link: '/pricing',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Abbonamento cancellato. Resterà attivo fino alla scadenza.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error cancelling subscription:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}


