import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/subscriptions/my - Ottieni abbonamento corrente dell'utente
export async function GET() {
  try {
    const user = await requireAuth()

    const subscription = await prisma.userSubscription.findUnique({
      where: { userId: user.id },
      include: {
        plan: true,
      },
    })

    // Se non ha subscription, restituisci info piano FREE
    if (!subscription) {
      const freePlan = await prisma.subscriptionPlan.findFirst({
        where: { name: 'FREE' },
      })
      
      return NextResponse.json({
        subscription: null,
        currentPlan: freePlan,
        tier: 'FREE',
        features: {
          earlyAccessHours: freePlan?.earlyAccessHours || 0,
          maxAlerts: freePlan?.maxAlerts || 3,
          prioritySafeTrade: false,
          instantNotifications: false,
          premiumCommunity: false,
          bulkListingTools: false,
          priorityMonthlyLimit: 0,
        },
      })
    }

    // Verifica se subscription è scaduta
    if (subscription.endDate && subscription.endDate < new Date()) {
      // Subscription scaduta, aggiorna status
      await prisma.userSubscription.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRED' },
      })
      
      const freePlan = await prisma.subscriptionPlan.findFirst({
        where: { name: 'FREE' },
      })
      
      return NextResponse.json({
        subscription: { ...subscription, status: 'EXPIRED' },
        currentPlan: freePlan,
        tier: 'FREE',
        features: {
          earlyAccessHours: 0,
          maxAlerts: 3,
          prioritySafeTrade: false,
          instantNotifications: false,
          premiumCommunity: false,
          bulkListingTools: false,
          priorityMonthlyLimit: 0,
        },
      })
    }

    return NextResponse.json({
      subscription,
      currentPlan: subscription.plan,
      tier: subscription.plan.tier,
      features: {
        earlyAccessHours: subscription.plan.earlyAccessHours,
        maxAlerts: subscription.plan.maxAlerts,
        prioritySafeTrade: subscription.plan.prioritySafeTrade,
        instantNotifications: subscription.plan.instantNotifications,
        premiumCommunity: subscription.plan.premiumCommunity,
        bulkListingTools: subscription.plan.bulkListingTools,
        priorityMonthlyLimit: subscription.plan.priorityMonthlyLimit,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching user subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}


