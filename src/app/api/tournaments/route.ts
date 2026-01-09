import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const game = searchParams.get('game')
    const userId = searchParams.get('userId')

    const where: any = {
      status: {
        in: ['PUBLISHED', 'REGISTRATION_CLOSED', 'IN_PROGRESS'],
      },
    }

    if (game) {
      where.game = game
    }

    const tournaments = await prisma.tournament.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        _count: {
          select: {
            registrations: true,
          },
        },
        ...(userId && {
          registrations: {
            where: { userId },
            select: { id: true },
          },
        }),
      },
      orderBy: [
        { date: 'asc' },
      ],
    })

    // Transform to include isRegistered flag
    const result = tournaments.map(t => ({
      ...t,
      isRegistered: userId ? (t as any).registrations?.length > 0 : false,
      registrations: undefined, // Remove raw registrations data
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching tournaments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


