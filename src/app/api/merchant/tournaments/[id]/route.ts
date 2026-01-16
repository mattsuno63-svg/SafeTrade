import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    // Handle both Promise and non-Promise params (Next.js 14 vs 15)
    const resolvedParams = 'then' in params ? await params : params
    const { id } = resolvedParams

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        shop: true,
        registrations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    // Verify ownership (admin can access any tournament)
    if (tournament.shop.merchantId !== user.id && dbUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json(tournament)
  } catch (error: any) {
    console.error('Error fetching tournament:', error)
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    // Handle both Promise and non-Promise params (Next.js 14 vs 15)
    const resolvedParams = 'then' in params ? await params : params
    const { id } = resolvedParams
    const body = await request.json()

    // Get tournament with shop info
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { shop: true },
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    // Verify ownership (admin can access any tournament)
    if (tournament.shop.merchantId !== user.id && dbUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const {
      title,
      description,
      game,
      date,
      time,
      maxParticipants,
      entryFee,
      prizePool,
      rules,
      status,
      winners,
    } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (game !== undefined) updateData.game = game
    if (date !== undefined) updateData.date = new Date(date)
    if (time !== undefined) updateData.time = time
    if (maxParticipants !== undefined) updateData.maxParticipants = parseInt(maxParticipants)
    if (entryFee !== undefined) updateData.entryFee = entryFee ? parseFloat(entryFee) : null
    if (prizePool !== undefined) updateData.prizePool = prizePool
    if (rules !== undefined) updateData.rules = rules
    if (status !== undefined) updateData.status = status
    if (winners !== undefined) updateData.winners = winners || null

    const updatedTournament = await prisma.tournament.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    })

    return NextResponse.json(updatedTournament)
  } catch (error: any) {
    console.error('Error updating tournament:', error)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    // Handle both Promise and non-Promise params (Next.js 14 vs 15)
    const resolvedParams = 'then' in params ? await params : params
    const { id } = resolvedParams

    // Get tournament with shop info
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { shop: true },
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    // Verify ownership (admin can access any tournament)
    if (tournament.shop.merchantId !== user.id && dbUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Don't allow deleting tournaments with registrations
    const registrationsCount = await prisma.tournamentRegistration.count({
      where: { tournamentId: id },
    })

    if (registrationsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete tournament with registered participants. Cancel it instead.' },
        { status: 400 }
      )
    }

    await prisma.tournament.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting tournament:', error)
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

