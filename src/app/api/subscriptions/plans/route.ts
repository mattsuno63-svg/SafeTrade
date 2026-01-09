import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/subscriptions/plans - Lista tutti i piani disponibili
export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { priceMonthly: 'asc' },
    })

    return NextResponse.json(plans)
  } catch (error) {
    console.error('Error fetching subscription plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription plans' },
      { status: 500 }
    )
  }
}


