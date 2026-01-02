import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { isApproved, approvalNotes } = body

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (dbUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get the listing
    const listing = await prisma.listingP2P.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    // Update listing
    const updated = await prisma.listingP2P.update({
      where: { id },
      data: {
        isApproved,
        approvalNotes,
      },
    })

    // Notify the user
    await prisma.notification.create({
      data: {
        userId: listing.userId,
        type: isApproved ? 'LISTING_APPROVED' : 'LISTING_REJECTED',
        title: isApproved ? 'Listing Approved' : 'Listing Rejected',
        message: isApproved
          ? `Your listing "${listing.title}" has been approved and is now live.`
          : `Your listing "${listing.title}" was rejected. ${approvalNotes ? `Reason: ${approvalNotes}` : ''}`,
        link: `/listings/${listing.id}`,
      },
    })

    return NextResponse.json(updated)
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

