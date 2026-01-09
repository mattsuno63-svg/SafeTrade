import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Verify user is part of conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        OR: [
          { userAId: user.id },
          { userBId: user.id },
        ],
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    })

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        conversationId: id,
        receiverId: user.id,
        read: false,
      },
      data: {
        read: true,
      },
    })

    return NextResponse.json({
      messages: messages.reverse(), // Return in chronological order
      nextCursor: messages.length === limit ? messages[0]?.id : null,
    })
  } catch (error: any) {
    console.error('Error fetching messages:', error)
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

// Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Verify user is part of conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        OR: [
          { userAId: user.id },
          { userBId: user.id },
        ],
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Determine receiver
    const receiverId = conversation.userAId === user.id
      ? conversation.userBId
      : conversation.userAId

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: id,
        senderId: user.id,
        receiverId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    })

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    // Create notification for receiver
    const sender = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    })

    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'NEW_MESSAGE',
        title: 'New Message',
        message: `${sender?.name || sender?.email}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        data: {
          conversationId: id,
          messageId: message.id,
          senderId: user.id,
        },
      },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error: any) {
    console.error('Error sending message:', error)
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

