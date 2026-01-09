import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get active featured listings
    const featured = await prisma.featuredListing.findMany({
      where: {
        isActive: true,
        endDate: {
          gte: new Date(),
        },
      },
      include: {
        listing: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
      take: 6,
    })

    // Transform to return listings with featured info
    const listings = featured
      .filter(f => f.listing && f.listing.isActive)
      .map(f => ({
        ...f.listing,
        featuredListings: [{
          tier: f.tier,
          endDate: f.endDate.toISOString(),
        }]
      }))

    return NextResponse.json({
      listings,
      total: listings.length,
    })
  } catch (error) {
    console.error('Error fetching featured listings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

