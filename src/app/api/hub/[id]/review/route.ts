import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/hub/[id]/review
 * Lascia una recensione per un Escrow Hub
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id: hubId } = params
    const body = await request.json()
    const {
      rating,
      comment,
      transactionId,
      pros = [],
      cons = [],
    } = body

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check if hub exists
    const hub = await prisma.escrowHub.findUnique({
      where: { id: hubId },
    })

    if (!hub) {
      return NextResponse.json(
        { error: 'Hub not found' },
        { status: 404 }
      )
    }

    // Check if user has already reviewed this hub (for same transaction)
    if (transactionId) {
      const existingReview = await prisma.escrowHubReview.findUnique({
        where: {
          hubId_reviewerId_transactionId: {
            hubId,
            reviewerId: user.id,
            transactionId,
          },
        },
      })

      if (existingReview) {
        return NextResponse.json(
          { error: 'You have already reviewed this hub for this transaction' },
          { status: 400 }
        )
      }
    } else {
      // Check if user has reviewed without transaction ID
      const existingReview = await prisma.escrowHubReview.findFirst({
        where: {
          hubId,
          reviewerId: user.id,
          transactionId: null,
        },
      })

      if (existingReview) {
        return NextResponse.json(
          { error: 'You have already reviewed this hub. Use PATCH to update your review.' },
          { status: 400 }
        )
      }
    }

    // Create review
    const review = await prisma.escrowHubReview.create({
      data: {
        hubId,
        reviewerId: user.id,
        transactionId: transactionId || null,
        rating: parseInt(rating),
        comment: comment || null,
        pros: pros || [],
        cons: cons || [],
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    })

    // Update hub rating
    const allReviews = await prisma.escrowHubReview.findMany({
      where: { hubId },
      select: { rating: true },
    })

    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length

    await prisma.escrowHub.update({
      where: { id: hubId },
      data: {
        rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        ratingCount: allReviews.length,
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error: any) {
    console.error('Error creating review:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/hub/[id]/review
 * Ottieni recensioni di un Escrow Hub
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: hubId } = params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [reviews, total] = await Promise.all([
      prisma.escrowHubReview.findMany({
        where: { hubId },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.escrowHubReview.count({ where: { hubId } }),
    ])

    return NextResponse.json({
      reviews,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    })
  } catch (error: any) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


