import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, getSession } from '@/lib/auth'

// GET /api/events - Get all events (calendar)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const searchParams = request.nextUrl.searchParams
    
    const type = searchParams.get('type')
    const game = searchParams.get('game')
    const month = searchParams.get('month') // Format: YYYY-MM
    const upcoming = searchParams.get('upcoming') === 'true'
    
    // Check if user has premium access
    let canSeePremium = false
    if (session?.user?.id) {
      const subscription = await prisma.userSubscription.findUnique({
        where: { userId: session.user.id },
        include: { plan: true },
      })
      canSeePremium = subscription?.plan?.premiumCommunity || false
    }

    // Build where clause
    const where: any = {
      status: 'PUBLISHED',
    }

    // Filter by type
    if (type) {
      where.type = type
    }

    // Filter by game
    if (game) {
      where.game = game
    }

    // Filter by month
    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      const startDate = new Date(year, monthNum - 1, 1)
      const endDate = new Date(year, monthNum, 0, 23, 59, 59)
      where.date = {
        gte: startDate,
        lte: endDate,
      }
    }

    // Filter upcoming only
    if (upcoming) {
      where.date = {
        gte: new Date(),
      }
    }

    // Hide premium events from non-premium users
    if (!canSeePremium) {
      where.isPremiumOnly = false
    }

    const events = await prisma.communityEvent.findMany({
      where,
      include: {
        _count: {
          select: { registrations: true }
        }
      },
      orderBy: { date: 'asc' },
    })

    // Add registration status for current user
    const eventsWithStatus = await Promise.all(events.map(async (event) => {
      let isRegistered = false
      let registrationStatus = null

      if (session?.user?.id) {
        const registration = await prisma.eventRegistration.findUnique({
          where: {
            eventId_userId: {
              eventId: event.id,
              userId: session.user.id,
            }
          }
        })
        isRegistered = !!registration
        registrationStatus = registration?.status
      }

      return {
        ...event,
        registeredCount: event._count.registrations,
        isRegistered,
        registrationStatus,
        isFull: event.maxParticipants ? event._count.registrations >= event.maxParticipants : false,
        isLocked: event.isPremiumOnly && !canSeePremium,
      }
    }))

    return NextResponse.json({
      events: eventsWithStatus,
      canSeePremium,
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

// POST /api/events - Create a new event (for merchants/admins)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    
    const {
      title,
      description,
      type,
      game,
      date,
      endDate,
      time,
      location,
      isOnline,
      onlineLink,
      maxParticipants,
      entryFee,
      isPremiumOnly,
      requiredTier,
    } = body

    // Validation
    if (!title || !type || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if user is merchant or admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { shop: true },
    })

    const canCreateEvents = dbUser?.role === 'ADMIN' || 
                           dbUser?.role === 'MERCHANT' || 
                           !!dbUser?.shop

    if (!canCreateEvents) {
      return NextResponse.json({ 
        error: 'Solo merchant e admin possono creare eventi' 
      }, { status: 403 })
    }

    const event = await prisma.communityEvent.create({
      data: {
        title,
        description,
        type,
        game: game || undefined,
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : undefined,
        time,
        location,
        isOnline: isOnline || false,
        onlineLink,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
        entryFee: entryFee ? parseFloat(entryFee) : undefined,
        isPremiumOnly: isPremiumOnly || false,
        requiredTier,
        organizerUserId: user.id,
        organizerShopId: dbUser?.shop?.id,
        status: 'PUBLISHED',
      },
    })

    return NextResponse.json({
      event,
      message: 'Evento creato con successo!',
    }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}


