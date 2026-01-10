import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { HubPackageStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/hub/packages
 * Ottieni lista pacchi gestiti dall'hub provider
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Get user's hub
    const hub = await prisma.escrowHub.findUnique({
      where: { providerId: user.id },
    })

    if (!hub) {
      return NextResponse.json(
        { error: 'Hub not found. Register first at /api/hub/register' },
        { status: 404 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as HubPackageStatus | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {
      hubId: hub.id,
    }

    if (status) {
      where.packageStatus = status
    } else {
      // Default: show active packages
      where.packageStatus = {
        in: [
          'PENDING',
          'IN_TRANSIT',
          'RECEIVED',
          'VERIFIED',
          'SHIPPED',
        ],
      }
    }

    const [packages, total] = await Promise.all([
      prisma.safeTradeTransaction.findMany({
        where,
        include: {
          userA: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          userB: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
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
              id: true,
              amount: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.safeTradeTransaction.count({ where }),
    ])

    return NextResponse.json({
      packages,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
      stats: {
        total,
        pending: await prisma.safeTradeTransaction.count({
          where: { hubId: hub.id, packageStatus: 'PENDING' },
        }),
        inTransit: await prisma.safeTradeTransaction.count({
          where: { hubId: hub.id, packageStatus: 'IN_TRANSIT' },
        }),
        received: await prisma.safeTradeTransaction.count({
          where: { hubId: hub.id, packageStatus: 'RECEIVED' },
        }),
        verified: await prisma.safeTradeTransaction.count({
          where: { hubId: hub.id, packageStatus: 'VERIFIED' },
        }),
        shipped: await prisma.safeTradeTransaction.count({
          where: { hubId: hub.id, packageStatus: 'SHIPPED' },
        }),
        delivered: await prisma.safeTradeTransaction.count({
          where: { hubId: hub.id, packageStatus: 'DELIVERED' },
        }),
      },
    })
  } catch (error: any) {
    console.error('Error fetching packages:', error)
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

