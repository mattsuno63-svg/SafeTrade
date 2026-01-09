import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ListingType, ProposalStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      listingId,
      type,
      offerPrice,
      tradeItems,
      message,
      feePaidBy = 'SELLER', // Default: fee pagata dal venditore
    } = body

    // Verify authentication
    const { requireAuth } = await import('@/lib/auth')
    const user = await requireAuth()

    // Get listing to find receiver
    const listing = await prisma.listingP2P.findUnique({
      where: { id: listingId },
    })

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    if (listing.userId === user.id) {
      return NextResponse.json(
        { error: 'You cannot propose on your own listing' },
        { status: 400 }
      )
    }

    const proposal = await prisma.proposal.create({
      data: {
        listingId,
        proposerId: user.id,
        receiverId: listing.userId,
        type: type as ListingType,
        offerPrice,
        tradeItems,
        message,
        feePaidBy: feePaidBy as 'SELLER' | 'BUYER' | 'SPLIT',
        status: ProposalStatus.PENDING,
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            images: true,
          },
        },
        proposer: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    })

    // Create notification for receiver
    await prisma.notification.create({
      data: {
        userId: listing.userId,
        type: 'PROPOSAL_RECEIVED',
        title: 'New Proposal',
        message: `${user.name || user.email} made a proposal on "${listing.title}"`,
        link: `/dashboard/proposals/received`,
      },
    })

    return NextResponse.json(proposal, { status: 201 })
  } catch (error: any) {
    console.error('Error creating proposal:', error)
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'sent' | 'received'

    // Verify authentication
    const { requireAuth } = await import('@/lib/auth')
    const user = await requireAuth()

    const where: any = type === 'sent'
      ? { proposerId: user.id }
      : { receiverId: user.id }

    const proposals = await prisma.proposal.findMany({
      where,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            images: true,
            price: true,
          },
        },
        proposer: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ proposals })
  } catch (error: any) {
    console.error('Error fetching proposals:', error)
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


