import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/listings/featured
 * Ottiene le listings featured/premium per la vetrina homepage
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '4')

    // Fetch featured/premium listings
    // Priority: high price, recent, approved
    const listings = await prisma.listingP2P.findMany({
      where: {
        isActive: true,
        isApproved: true,
        isSold: false,
        // Prefer high-value items
        price: { gte: 100 }, // Minimum price for featured
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { price: 'desc' }, // High price first
        { createdAt: 'desc' }, // Recent first
      ],
      take: limit,
    })

    // Format for frontend
    const formatted = listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      price: listing.price,
      images: listing.images,
      condition: listing.condition,
      game: listing.game,
      set: listing.set,
      type: listing.type,
      verified: false, // Not available in schema
    }))

    return NextResponse.json({ data: formatted })
  } catch (error: any) {
    console.error('Error fetching featured listings:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

