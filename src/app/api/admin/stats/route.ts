import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (dbUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get stats
    const [
      usersCount,
      listingsCount,
      transactionsCount,
      shopsCount,
      pendingApplicationsCount,
      pendingListingsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.listingP2P.count(),
      prisma.safeTradeTransaction.count(),
      prisma.shop.count(),
      prisma.merchantApplication.count({
        where: { status: 'PENDING' },
      }),
      prisma.listingP2P.count({
        where: { isApproved: false, isActive: true },
      }),
    ])

    return NextResponse.json({
      users: usersCount,
      listings: listingsCount,
      transactions: transactionsCount,
      shops: shopsCount,
      pendingApplications: pendingApplicationsCount,
      pendingListings: pendingListingsCount,
    })
  } catch (error: any) {
    console.error('Error fetching admin stats:', error)
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


