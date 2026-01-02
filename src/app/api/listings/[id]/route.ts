import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const listing = await prisma.listingP2P.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
            role: true,
          },
        },
        proposals: {
          include: {
            proposer: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(listing)
  } catch (error) {
    console.error('Error fetching listing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    // Verify authentication
    const user = await requireAuth()

    // Check listing ownership
    const listing = await prisma.listingP2P.findUnique({
      where: { id },
    })

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    // Admin can edit any listing, others can only edit their own
    if (listing.userId !== user.id && dbUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: You can only edit your own listings' },
        { status: 403 }
      )
    }

    // Update listing
    const updatedListing = await prisma.listingP2P.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        type: body.type,
        price: body.price,
        condition: body.condition,
        game: body.game,
        set: body.set,
        cardNumber: body.cardNumber,
        rarity: body.rarity,
        language: body.language,
        images: body.images,
        wants: body.wants,
        isActive: body.isActive,
      },
    })

    return NextResponse.json(updatedListing)
  } catch (error: any) {
    console.error('Error updating listing:', error)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Verify authentication
    const user = await requireAuth()

    // Check listing ownership
    const listing = await prisma.listingP2P.findUnique({
      where: { id },
    })

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    // Admin can delete any listing, others can only delete their own
    if (listing.userId !== user.id && dbUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own listings' },
        { status: 403 }
      )
    }

    // Delete listing
    await prisma.listingP2P.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting listing:', error)
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

