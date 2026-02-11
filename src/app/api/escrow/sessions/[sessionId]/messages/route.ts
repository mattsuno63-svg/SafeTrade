import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { EscrowSessionStatus } from '@prisma/client'

// GET - Fetch messages in session
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireAuth()
    const { sessionId } = params

    // Verify user has access to session
    const session = await prisma.escrowSession.findUnique({
      where: { id: sessionId },
      select: {
        buyerId: true,
        sellerId: true,
        merchantId: true,
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (
      session.buyerId !== user.id &&
      session.sellerId !== user.id &&
      session.merchantId !== user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get messages
    const messages = await prisma.escrowMessage.findMany({
      where: { sessionId },
      include: {
        sender: { select: { id: true, name: true, avatar: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ messages })
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Send message in session
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireAuth()
    const { sessionId } = params
    const body = await request.json()
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Verify user has access to session
    const session = await prisma.escrowSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        merchantId: true,
        status: true,
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (
      session.buyerId !== user.id &&
      session.sellerId !== user.id &&
      session.merchantId !== user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const terminalStatuses: EscrowSessionStatus[] = ['COMPLETED', 'CANCELLED', 'EXPIRED']
    if (terminalStatuses.includes(session.status)) {
      return NextResponse.json(
        { error: 'Cannot send messages in inactive session' },
        { status: 400 }
      )
    }

    // Create message
    const message = await prisma.escrowMessage.create({
      data: {
        sessionId,
        senderId: user.id,
        content: content.trim(),
        readBy: [user.id], // Sender has read their own message
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true, role: true } },
      },
    })

    // Update session last activity
    await prisma.escrowSession.update({
      where: { id: sessionId },
      data: { lastActivity: new Date() },
    })

    // Create notifications for other participants
    const otherUserIds = [
      session.buyerId,
      session.sellerId,
      session.merchantId,
    ].filter((id) => id !== user.id)

    await prisma.notification.createMany({
      data: otherUserIds.map((userId) => ({
        userId,
        type: 'ESCROW_MESSAGE',
        title: 'New message in escrow session',
        message: `You have a new message in your SafeTrade escrow session.`,
        link: `/escrow/sessions/${sessionId}`,
      })),
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error: any) {
    console.error('Error sending message:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

