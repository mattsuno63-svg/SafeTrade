import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/merchant/orders
 * Get all orders for the merchant's shop(s)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'MERCHANT' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'ALL'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Get merchant's shop
    const shop = await prisma.shop.findFirst({
      where: { merchantId: user.id },
    })

    if (!shop) {
      return NextResponse.json({
        orders: [],
        stats: { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 },
        pagination: { total: 0, pages: 0, page, limit },
      })
    }

    // Build where clause
    const where: any = { shopId: shop.id }
    if (status !== 'ALL') {
      where.status = status
    }

    // Get orders (transactions) for this shop
    const [orders, total, stats] = await Promise.all([
      prisma.safeTradeTransaction.findMany({
        where,
        include: {
          userA: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          userB: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          proposal: {
            include: {
              listing: {
                select: {
                  id: true,
                  title: true,
                  price: true,
                  images: true,
                },
              },
            },
          },
          escrowPayment: {
            select: {
              amount: true,
              status: true,
              paymentMethod: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.safeTradeTransaction.count({ where }),
      prisma.safeTradeTransaction.groupBy({
        by: ['status'],
        where: { shopId: shop.id },
        _count: { id: true },
      }),
    ])

    // Calculate stats
    const statsMap = stats.reduce((acc, item) => {
      acc[item.status.toLowerCase()] = item._count.id
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      orders,
      stats: {
        total,
        pending: statsMap.pending || 0,
        confirmed: statsMap.confirmed || 0,
        completed: statsMap.completed || 0,
        cancelled: statsMap.cancelled || 0,
      },
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    })
  } catch (error) {
    console.error('Error fetching merchant orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}


