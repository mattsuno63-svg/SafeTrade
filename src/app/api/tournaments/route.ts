import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { calculateProvinceDistance } from '@/lib/utils/distance'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const game = searchParams.get('game')
    const userId = searchParams.get('userId')
    const limit = searchParams.get('limit')
    const futureOnly = searchParams.get('futureOnly') === 'true'
    const filterByDistance = searchParams.get('filterByDistance') === 'true'

    const where: any = {
      status: {
        in: ['PUBLISHED', 'REGISTRATION_CLOSED', 'IN_PROGRESS'],
      },
    }

    if (game) {
      where.game = game
    }

    if (futureOnly) {
      where.date = {
        gte: new Date(),
      }
    }

    // Get user location and distance preference if filtering by distance
    let userProvince: string | null = null
    let maxDistance: number | null = null

    if (filterByDistance) {
      try {
        const user = await requireAuth()
        if (user) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { province: true },
          })
          userProvince = dbUser?.province || null

          // Get distance preference from localStorage (passed via query param or stored in user settings)
          const distancePref = searchParams.get('maxDistance')
          if (distancePref) {
            // Parse "50 km" to 50
            const match = distancePref.match(/(\d+)/)
            if (match) {
              maxDistance = parseInt(match[1])
            }
          }
        }
      } catch {
        // User not authenticated, skip distance filtering
      }
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

    // Filter by distance if requested and user has location
    let filteredTournaments = tournaments
    if (filterByDistance && userProvince && maxDistance) {
      filteredTournaments = tournaments.filter((tournament) => {
        if (!tournament.shop?.city) return false
        // Use city as province approximation (in production, use proper geocoding)
        const shopProvince = tournament.shop.city // Approximate: use city as province
        const distance = calculateProvinceDistance(userProvince!, shopProvince)
        // If distance calculation fails, include tournament anyway (fallback)
        return distance === null || distance <= maxDistance!
      })
    }

    // Apply limit after filtering
    if (limit) {
      filteredTournaments = filteredTournaments.slice(0, parseInt(limit))
    }

    // Transform to include isRegistered flag
    const result = filteredTournaments.map(t => ({
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


