import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// POST /api/events/[id]/register - Register for an event
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id: eventId } = params

    // Get event
    const event = await prisma.communityEvent.findUnique({
      where: { id: eventId },
      include: {
        _count: { select: { registrations: true } }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if event is in the past
    if (event.date < new Date()) {
      return NextResponse.json({ error: 'Questo evento è già passato' }, { status: 400 })
    }

    // Check if event is full
    if (event.maxParticipants && event._count.registrations >= event.maxParticipants) {
      return NextResponse.json({ error: 'Evento al completo' }, { status: 400 })
    }

    // Check premium access
    if (event.isPremiumOnly) {
      const subscription = await prisma.userSubscription.findUnique({
        where: { userId: user.id },
        include: { plan: true },
      })

      const hasPremiumAccess = subscription && 
        subscription.status === 'ACTIVE' &&
        (!subscription.endDate || subscription.endDate > new Date()) &&
        subscription.plan.premiumCommunity

      if (!hasPremiumAccess) {
        return NextResponse.json({ 
          error: 'Questo evento è riservato ai membri Premium',
          premiumRequired: true 
        }, { status: 403 })
      }

      // Check tier requirement
      if (event.requiredTier === 'PRO' && subscription?.plan.tier !== 'PRO') {
        return NextResponse.json({ 
          error: 'Questo evento è riservato ai membri PRO',
          tierRequired: 'PRO' 
        }, { status: 403 })
      }
    }

    // Check if already registered
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: user.id,
        }
      }
    })

    if (existingRegistration) {
      return NextResponse.json({ 
        error: 'Sei già registrato a questo evento',
        alreadyRegistered: true 
      }, { status: 400 })
    }

    // Check if premium user for priority registration
    let isPriorityRegistration = false
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId: user.id },
      include: { plan: true },
    })
    if (subscription?.plan?.prioritySafeTrade) {
      isPriorityRegistration = true
    }

    // Create registration
    const registration = await prisma.eventRegistration.create({
      data: {
        eventId,
        userId: user.id,
        status: 'REGISTERED',
        isPriorityRegistration,
      },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'event_registration',
        title: '✅ Registrazione confermata!',
        message: `Ti sei registrato a "${event.title}"`,
        link: `/events/${eventId}`,
      },
    })

    return NextResponse.json({
      registration,
      message: 'Registrazione completata!',
    }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error registering for event:', error)
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
  }
}

// DELETE /api/events/[id]/register - Cancel registration
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id: eventId } = params

    const registration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: user.id,
        }
      }
    })

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    await prisma.eventRegistration.delete({
      where: { id: registration.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Registrazione cancellata',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error cancelling registration:', error)
    return NextResponse.json({ error: 'Failed to cancel registration' }, { status: 500 })
  }
}

