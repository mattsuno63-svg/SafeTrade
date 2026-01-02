import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Get merchant's shop
    const shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found. Please set up your shop first.' },
        { status: 404 }
      )
    }

    // Get all SafeTrade transactions for this shop
    const appointments = await prisma.safeTradeTransaction.findMany({
      where: {
        shopId: shop.id,
      },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        proposal: {
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json(appointments)
  } catch (error: any) {
    console.error('Error fetching appointments:', error)
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

