import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { prepareMessageContent } from '@/lib/chat/message-utils'

// Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params
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

    // Improved cursor-based pagination using createdAt instead of id
    const cursorDate = cursor ? new Date(cursor) : undefined
    
    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
        ...(cursorDate && {
          createdAt: { lt: cursorDate },
        }),
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
      take: Math.min(limit, 100),  // Max 100 messages per request
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

    // Return in chronological order (oldest first)
    const sortedMessages = messages.reverse()
    const lastMessage = sortedMessages[sortedMessages.length - 1]
    
    return NextResponse.json({
      messages: sortedMessages,
      nextCursor: messages.length === limit && lastMessage 
        ? lastMessage.createdAt.toISOString() 
        : null,
      hasMore: messages.length === limit,
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params
    const body = await request.json()
    const { content } = body

    // SECURITY: Rate limiting for message sending
    const rateLimitKey = getRateLimitKey(user.id, 'MESSAGE_SEND')
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.MESSAGE_SEND)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Troppi messaggi inviati. Limite di 30 messaggi per minuto raggiunto.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // SECURITY: Validate and sanitize message content
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Il contenuto del messaggio è richiesto' },
        { status: 400 }
      )
    }

    const messagePrep = prepareMessageContent(content)
    if (!messagePrep.valid) {
      return NextResponse.json(
        { error: messagePrep.error || 'Contenuto del messaggio non valido' },
        { status: 400 }
      )
    }

    const sanitizedContent = messagePrep.sanitized

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

    // SECURITY: Get IP address for audit trail
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Create message with sanitized content
    const message = await prisma.message.create({
      data: {
        conversationId: id,
        senderId: user.id,
        receiverId,
        content: sanitizedContent,  // Use sanitized content
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
        message: `${sender?.name || sender?.email}: ${sanitizedContent.substring(0, 50)}${sanitizedContent.length > 50 ? '...' : ''}`,
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

