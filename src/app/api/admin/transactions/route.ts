import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'ALL'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (status && status !== 'ALL') {
      where.status = status
    }

    const [transactions, total, stats] = await Promise.all([
      prisma.safeTradeTransaction.findMany({
        where,
        include: {
          proposal: {
            select: {
              id: true,
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
          userA: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          userB: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          shop: {
            select: {
              id: true,
              name: true,
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
        _count: { status: true },
      }),
    ])

    // Calculate stats
    const statusCounts = stats.reduce((acc, curr) => {
      acc[curr.status] = curr._count.status
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      transactions,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
      stats: statusCounts,
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

