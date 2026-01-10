import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const DAILY_MESSAGE_LIMIT = 5

// GET /api/contact - Get user's contact messages
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const messages = await prisma.contactMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Get today's message count
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayCount = await prisma.contactMessage.count({
      where: {
        userId: user.id,
        createdAt: { gte: today },
      },
    })

    return NextResponse.json({
      messages,
      todayCount,
      remainingToday: Math.max(0, DAILY_MESSAGE_LIMIT - todayCount),
      dailyLimit: DAILY_MESSAGE_LIMIT,
    })
  } catch (error) {
    console.error('Error fetching contact messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST /api/contact - Send a contact message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message } = body

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Name, email, subject, and message are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate message length
    if (message.length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters' },
        { status: 400 }
      )
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message must be less than 2000 characters' },
        { status: 400 }
      )
    }

    // Get current user (optional - can send messages without login)
    const user = await getCurrentUser()

    // Get IP address for rate limiting (anonymous users)
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0] : 'unknown'

    // Check daily limit
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let todayCount: number

    if (user) {
      // Rate limit by user ID
      todayCount = await prisma.contactMessage.count({
        where: {
          userId: user.id,
          createdAt: { gte: today },
        },
      })
    } else {
      // Rate limit by IP address for anonymous users
      todayCount = await prisma.contactMessage.count({
        where: {
          ipAddress,
          userId: null,
          createdAt: { gte: today },
        },
      })
    }

    if (todayCount >= DAILY_MESSAGE_LIMIT) {
      return NextResponse.json(
        { 
          error: `Hai raggiunto il limite di ${DAILY_MESSAGE_LIMIT} messaggi giornalieri. Riprova domani.`,
          remainingToday: 0,
          dailyLimit: DAILY_MESSAGE_LIMIT,
        },
        { status: 429 }
      )
    }

    // Create the contact message
    const contactMessage = await prisma.contactMessage.create({
      data: {
        userId: user?.id,
        name,
        email,
        subject,
        message,
        ipAddress: user ? null : ipAddress,
      },
    })

    // Send notification to admin (if notification system exists)
    try {
      // Find admin users
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      })

      // Create notifications for all admins
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            type: 'SYSTEM',
            title: 'Nuovo messaggio di contatto',
            message: `${name} ha inviato un messaggio: "${subject}"`,
            link: '/admin/contacts',
          })),
        })
      }
    } catch (notifError) {
      console.error('Error sending admin notifications:', notifError)
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({
      success: true,
      message: contactMessage,
      remainingToday: DAILY_MESSAGE_LIMIT - todayCount - 1,
      dailyLimit: DAILY_MESSAGE_LIMIT,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating contact message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

