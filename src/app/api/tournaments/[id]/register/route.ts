import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// Register for a tournament
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params

    // Get tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: {
          select: { registrations: true },
        },
      },
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    // Check if tournament is open for registration
    if (tournament.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Registration is not open for this tournament' },
        { status: 400 }
      )
    }

    // Check if tournament is full
    if (tournament._count.registrations >= tournament.maxParticipants) {
      return NextResponse.json(
        { error: 'Tournament is full' },
        { status: 400 }
      )
    }

    // Check if already registered
    const existingRegistration = await prisma.tournamentRegistration.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: id,
          userId: user.id,
        },
      },
    })

    if (existingRegistration) {
      return NextResponse.json(
        { error: 'You are already registered for this tournament' },
        { status: 400 }
      )
    }

    // Create registration
    const registration = await prisma.tournamentRegistration.create({
      data: {
        tournamentId: id,
        userId: user.id,
        status: 'CONFIRMED',
      },
    })

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'TOURNAMENT_REGISTERED',
        title: 'Tournament Registration Confirmed',
        message: `You have successfully registered for "${tournament.title}"`,
        data: {
          tournamentId: id,
          tournamentTitle: tournament.title,
        },
      },
    })

    return NextResponse.json(registration, { status: 201 })
  } catch (error: any) {
    console.error('Error registering for tournament:', error)
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

// Unregister from a tournament
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params

    // Get tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    // Check if tournament allows unregistration
    if (['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(tournament.status)) {
      return NextResponse.json(
        { error: 'Cannot unregister from a tournament that has started or ended' },
        { status: 400 }
      )
    }

    // Find registration
    const registration = await prisma.tournamentRegistration.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: id,
          userId: user.id,
        },
      },
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'You are not registered for this tournament' },
        { status: 404 }
      )
    }

    // Delete registration
    await prisma.tournamentRegistration.delete({
      where: { id: registration.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error unregistering from tournament:', error)
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

