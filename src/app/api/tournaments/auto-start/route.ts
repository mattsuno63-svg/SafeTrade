import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * API route to check and auto-start tournaments
 * This should be called periodically (e.g., via cron job or client-side polling)
 * For tournaments with status PUBLISHED, if the current time matches the tournament time,
 * automatically change status to IN_PROGRESS
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentDate = now.toISOString().split('T')[0] // YYYY-MM-DD

    // Find all PUBLISHED tournaments that should start now
    const tournaments = await prisma.tournament.findMany({
      where: {
        status: 'PUBLISHED',
        date: {
          lte: now, // Tournament date is today or in the past
        },
      },
    })

    const startedTournaments: string[] = []

    for (const tournament of tournaments) {
      const [hours, minutes] = tournament.time.split(':').map(Number)
      const tournamentDate = new Date(tournament.date).toISOString().split('T')[0]

      // Check if tournament date matches today and time matches current time (within 1 minute tolerance)
      if (
        tournamentDate === currentDate &&
        hours === currentHour &&
        Math.abs(minutes - currentMinute) <= 1
      ) {
        // Auto-start tournament
        await prisma.tournament.update({
          where: { id: tournament.id },
          data: { status: 'IN_PROGRESS' },
        })

        startedTournaments.push(tournament.id)
      }
    }

    return NextResponse.json({
      success: true,
      startedCount: startedTournaments.length,
      startedTournaments,
      checkedAt: now.toISOString(),
    })
  } catch (error: any) {
    console.error('Error in auto-start tournaments:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

