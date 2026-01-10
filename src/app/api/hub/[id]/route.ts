import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/hub/[id]
 * Ottieni dettagli di un Escrow Hub
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const hub = await prisma.escrowHub.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            avatar: true,
            city: true,
            createdAt: true,
          },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            transactions: true,
            reviews: true,
          },
        },
      },
    })

    if (!hub) {
      return NextResponse.json(
        { error: 'Hub not found' },
        { status: 404 }
      )
    }

    // Calculate rating breakdown
    const ratingBreakdown = await prisma.escrowHubReview.groupBy({
      by: ['rating'],
      where: { hubId: id },
      _count: { rating: true },
    })

    return NextResponse.json({
      ...hub,
      ratingBreakdown: ratingBreakdown.reduce((acc, item) => {
        acc[item.rating] = item._count.rating
        return acc
      }, {} as Record<number, number>),
    })
  } catch (error: any) {
    console.error('Error fetching hub:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

