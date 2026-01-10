import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/hub/list
 * Ottieni lista di Escrow Hub disponibili
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city')
    const country = searchParams.get('country')
    const isAvailable = searchParams.get('isAvailable') !== 'false'
    const isApproved = searchParams.get('isApproved') !== 'false'
    const minRating = searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {
      isActive: true,
      isApproved: isApproved ? true : undefined,
      isAvailable: isAvailable ? true : undefined,
    }

    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (country) where.country = country
    if (minRating !== null) where.rating = { gte: minRating }

    const [hubs, total] = await Promise.all([
      prisma.escrowHub.findMany({
        where,
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              transactions: true,
              reviews: true,
            },
          },
        },
        orderBy: [
          { rating: 'desc' },
          { transactionsCompleted: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.escrowHub.count({ where }),
    ])

    return NextResponse.json({
      hubs,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    })
  } catch (error: any) {
    console.error('Error fetching hubs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

