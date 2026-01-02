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
    const { status } = body

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACCEPTED or REJECTED.' },
        { status: 400 }
      )
    }

    // Verify the proposal exists and belongs to a listing owned by this user
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        listing: true,
        proposer: true,
      },
    })

    if (!proposal) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    if (proposal.listing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - you do not own this listing' },
        { status: 403 }
      )
    }

    // Update the proposal status
    const updatedProposal = await prisma.proposal.update({
      where: { id },
      data: { status },
    })

    // Create notification for proposer
    await prisma.notification.create({
      data: {
        userId: proposal.proposerId,
        type: status === 'ACCEPTED' ? 'PROPOSAL_ACCEPTED' : 'PROPOSAL_REJECTED',
        title: status === 'ACCEPTED' ? 'Offer Accepted!' : 'Offer Rejected',
        message: status === 'ACCEPTED'
          ? `Your offer on "${proposal.listing.title}" has been accepted!`
          : `Your offer on "${proposal.listing.title}" has been rejected.`,
        data: JSON.stringify({
          proposalId: id,
          listingId: proposal.listingId,
        }),
      },
    })

    return NextResponse.json(updatedProposal)
  } catch (error: any) {
    console.error('Error updating offer:', error)
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

