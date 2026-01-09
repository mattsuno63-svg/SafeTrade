import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET - Fetch escrow sessions for current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const searchParams = request.nextUrl.searchParams
    const transactionId = searchParams.get('transactionId')

    if (transactionId) {
      // Get specific session
      const session = await prisma.escrowSession.findUnique({
        where: { transactionId },
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
              sender: { select: { id: true, name: true, avatar: true } },
            },
            orderBy: { createdAt: 'asc' },
            take: 50, // Last 50 messages
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
    }

    // Get all sessions for user
    const sessions = await prisma.escrowSession.findMany({
      where: {
        OR: [
          { buyerId: user.id },
          { sellerId: user.id },
          { merchantId: user.id },
        ],
      },
      include: {
        transaction: {
          include: {
            userA: { select: { id: true, name: true, avatar: true } },
            userB: { select: { id: true, name: true, avatar: true } },
            shop: { select: { id: true, name: true } },
            proposal: {
              include: {
                listing: { select: { id: true, title: true, images: true } },
              },
            },
          },
        },
        buyer: { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
        merchant: { select: { id: true, name: true, avatar: true } },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { lastActivity: 'desc' },
      take: 50,
    })

    return NextResponse.json({ sessions })
  } catch (error: any) {
    console.error('Error fetching escrow sessions:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create escrow session (automatically created when transaction is created)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { transactionId } = body

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
    }

    // Get transaction
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id: transactionId },
      include: {
        userA: true,
        userB: true,
        shop: true,
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Verify user is part of this transaction
    if (
      transaction.userAId !== user.id &&
      transaction.userBId !== user.id &&
      transaction.shop.merchantId !== user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if session already exists
    const existingSession = await prisma.escrowSession.findUnique({
      where: { transactionId },
    })

    if (existingSession) {
      return NextResponse.json(existingSession)
    }

    // Create session
    const session = await prisma.escrowSession.create({
      data: {
        transactionId,
        buyerId: transaction.userAId,
        sellerId: transaction.userBId,
        merchantId: transaction.shop.merchantId,
        status: 'ACTIVE',
      },
      include: {
        transaction: {
          include: {
            userA: { select: { id: true, name: true, avatar: true } },
            userB: { select: { id: true, name: true, avatar: true } },
            shop: { select: { id: true, name: true } },
          },
        },
        buyer: { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
        merchant: { select: { id: true, name: true, avatar: true } },
      },
    })

    // Create system message
    await prisma.escrowMessage.create({
      data: {
        sessionId: session.id,
        senderId: user.id,
        content: 'Escrow session created. All parties can now communicate securely.',
        isSystem: true,
      },
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error: any) {
    console.error('Error creating escrow session:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


