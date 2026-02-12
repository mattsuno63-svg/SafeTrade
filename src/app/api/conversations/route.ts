import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'

// Get all conversations for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { userAId: user.id },
          { userBId: user.id },
        ],
      },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            read: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Transform to include unread count and other user info
    const result = conversations.map(conv => {
      const otherUser = conv.userAId === user.id ? conv.userB : conv.userA
      const lastMessage = conv.messages[0]

      return {
        id: conv.id,
        otherUser,
        lastMessage,
        listingId: conv.listingId,
        updatedAt: conv.updatedAt,
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching conversations:', error)
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

// Start a new conversation
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { recipientId, listingId, message } = body

    // SECURITY: Rate limiting for conversation creation
    const rateLimitKey = getRateLimitKey(user.id, 'CONVERSATION_CREATE')
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.CONVERSATION_CREATE)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Troppe conversazioni create. Limite di 10 conversazioni per ora raggiunto.',
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

    if (!recipientId) {
      return NextResponse.json(
        { error: 'Recipient ID is required' },
        { status: 400 }
      )
    }

    if (recipientId === user.id) {
      return NextResponse.json(
        { error: 'Cannot start conversation with yourself' },
        { status: 400 }
      )
    }

    // Check if conversation already exists
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { userAId: user.id, userBId: recipientId },
          { userAId: recipientId, userBId: user.id },
        ],
      },
    })

    if (!conversation) {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          userAId: user.id,
          userBId: recipientId,
          listingId: listingId || null,
        },
      })
    }

    // Create first message if provided
    if (message) {
      // SECURITY: Sanitize and validate message
      const { prepareMessageContent } = await import('@/lib/chat/message-utils')
      const messagePrep = prepareMessageContent(message)
      
      if (!messagePrep.valid) {
        return NextResponse.json(
          { error: messagePrep.error || 'Messaggio iniziale non valido' },
          { status: 400 }
        )
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: user.id,
          receiverId: recipientId,
          content: messagePrep.sanitized,
        },
      })

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      })

      // Create notification for recipient
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'NEW_MESSAGE',
          title: 'New Message',
          message: `You have a new message from ${user.name || user.email}`,
          data: {
            conversationId: conversation.id,
            senderId: user.id,
          },
        },
      })
    }

    return NextResponse.json(conversation, { status: 201 })
  } catch (error: any) {
    console.error('Error creating conversation:', error)
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


