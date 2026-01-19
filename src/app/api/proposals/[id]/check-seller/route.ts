import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const user = await requireAuth()

    // Get proposal
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        listing: true,
      },
    })

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found', authorized: false },
        { status: 404 }
      )
    }

    // Check if user is the seller (receiver)
    const isSeller = proposal.receiverId === user.id

    return NextResponse.json({
      authorized: isSeller,
      proposalId: id,
    })
  } catch (error: any) {
    console.error('Error checking seller authorization:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized', authorized: false },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', authorized: false },
      { status: 500 }
    )
  }
}

