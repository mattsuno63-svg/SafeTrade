import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// For now, we'll simulate offers on products
// In a full implementation, you'd have a separate ProductOffer model
// Here we reuse the Proposal model concept for shop products

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

    // For now, return proposals on listings that the merchant owns
    // In a full implementation, you'd have a separate ProductOffer table
    const proposals = await prisma.proposal.findMany({
      where: {
        listing: {
          userId: user.id,
        },
      },
      include: {
        proposer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Transform to match the expected format
    const offers = proposals.map(p => ({
      id: p.id,
      type: p.type,
      offerPrice: p.offerPrice,
      tradeItems: p.tradeItems,
      message: p.message,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      proposer: p.proposer,
      product: {
        id: p.listing.id,
        title: p.listing.title,
        price: p.listing.price || 0,
        images: p.listing.images,
      },
    }))

    return NextResponse.json(offers)
  } catch (error: any) {
    console.error('Error fetching offers:', error)
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


