import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ProposalStatus, SafeTradeStatus } from '@prisma/client'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Verify authentication
    const user = await requireAuth()

    // Get proposal
    const proposal = await prisma.proposal.findUnique({
      where: { id },
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
    })

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      )
    }

    // Verify user has access
    if (proposal.proposerId !== user.id && proposal.receiverId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json(proposal)
  } catch (error: any) {
    console.error('Error fetching proposal:', error)
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { status } = body

    // Verify authentication
    const user = await requireAuth()

    // Get proposal to verify permissions
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        listing: true,
      },
    })

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      )
    }

    // Verify user has permission
    // - Receiver can accept/reject
    // - Proposer can cancel their own proposal
    const isReceiver = proposal.receiverId === user.id
    const isProposer = proposal.proposerId === user.id

    if (status === 'CANCELLED') {
      // Only proposer can cancel
      if (!isProposer) {
        return NextResponse.json(
          { error: 'Forbidden: Only the proposer can cancel a proposal' },
          { status: 403 }
        )
      }
    } else if (status === 'ACCEPTED' || status === 'REJECTED') {
      // Only receiver can accept/reject
      if (!isReceiver) {
        return NextResponse.json(
          { error: 'Forbidden: Only the receiver can accept/reject proposals' },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Check proposal is still pending
    if (proposal.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Cannot modify a proposal that is not pending' },
        { status: 400 }
      )
    }

    // Update proposal
    const updatedProposal = await prisma.proposal.update({
      where: { id },
      data: {
        status: status as ProposalStatus,
      },
      include: {
        listing: true,
        proposer: true,
        receiver: true,
      },
    })

    // If accepted, redirect to store selection
    // SafeTrade transaction will be created when store is selected
    if (status === 'ACCEPTED') {
      // Note: Transaction will be created after store selection by the seller (receiver)

      // Create notification for buyer (proposer) - they will wait for seller to select store
      await prisma.notification.create({
        data: {
          userId: proposal.proposerId,
          type: 'PROPOSAL_ACCEPTED',
          title: '🎉 Proposta Accettata!',
          message: `La tua proposta per "${proposal.listing.title}" è stata accettata! Il venditore selezionerà il negozio per completare la transazione.`,
          link: `/dashboard/proposals/sent`,
        },
      })
      
      // Create notification for seller (receiver) - they need to select escrow method
      await prisma.notification.create({
        data: {
          userId: proposal.receiverId,
          type: 'PROPOSAL_ACCEPTED',
          title: 'Proposta Accettata - Seleziona Metodo Escrow',
          message: `Hai accettato la proposta per "${proposal.listing.title}". Seleziona il metodo di escrow (Locale o Verified) per completare la transazione.`,
          link: `/select-escrow-method?proposalId=${id}`,
        },
      })
    } else if (status === 'REJECTED') {
      // Create notification for proposer
      await prisma.notification.create({
        data: {
          userId: proposal.proposerId,
          type: 'PROPOSAL_REJECTED',
          title: 'Proposal Rejected',
          message: `Your proposal for "${proposal.listing.title}" has been rejected.`,
          link: `/dashboard/proposals/sent`,
        },
      })
    }

    return NextResponse.json(updatedProposal)
  } catch (error: any) {
    console.error('Error updating proposal:', error)
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

