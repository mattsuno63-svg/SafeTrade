import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET - Get specific escrow session by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireAuth()
    const { sessionId } = params

    const session = await prisma.escrowSession.findUnique({
      where: { id: sessionId },
      include: {
        transaction: {
          include: {
            userA: { select: { id: true, name: true, email: true, avatar: true } },
            userB: { select: { id: true, name: true, email: true, avatar: true } },
            shop: { select: { id: true, name: true, address: true } },
            proposal: {
              include: {
                listing: { select: { id: true, title: true, images: true, price: true } },
              },
            },
          },
        },
        buyer: { select: { id: true, name: true, email: true, avatar: true } },
        seller: { select: { id: true, name: true, email: true, avatar: true } },
        merchant: { select: { id: true, name: true, email: true, avatar: true } },
        messages: {
          include: {
            sender: { select: { id: true, name: true, avatar: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
          take: 100, // Last 100 messages
        },
        _count: {
          select: { messages: true },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify user has access to this session
    if (
      session.buyerId !== user.id &&
      session.sellerId !== user.id &&
      session.merchantId !== user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(session)
  } catch (error: any) {
    console.error('Error fetching escrow session:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

