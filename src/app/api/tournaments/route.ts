import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { calculateCityDistance } from '@/lib/utils/distance'

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
    
    // Debug: log per verificare query
    console.log('[Tournaments API] Query params:', { game, futureOnly, filterByDistance, limit })

    if (game) {
      where.game = game
    }

    if (futureOnly) {
      where.date = {
        gte: new Date(),
      }
    }

    // Get user location and distance preference if filtering by distance
    let userCity: string | null = null
    let userProvince: string | null = null
    let maxDistance: number | null = null

    if (filterByDistance) {
      try {
        const user = await requireAuth()
        if (user) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { city: true, province: true },
          })
          userCity = dbUser?.city || null
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
    
    // Debug: log tornei trovati
    console.log(`[Tournaments API] Found ${tournaments.length} tournaments`, tournaments.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      shopCity: t.shop?.city,
      date: t.date,
    })))

    // Filter by distance if requested and user has location
    let filteredTournaments = tournaments
    if (filterByDistance) {
      if (userCity && maxDistance) {
        // Utente ha città: filtra per distanza reale
        console.log(`[Tournaments API] Filtering by distance: userCity=${userCity}, maxDistance=${maxDistance}km`)
        filteredTournaments = tournaments.filter((tournament) => {
          if (!tournament.shop?.city) {
            // Se il negozio non ha città, includi comunque il torneo (fallback)
            console.log(`[Tournaments API] Tournament ${tournament.id} included (no shop city): fallback`)
            return true
          }
          
          // Calcola distanza reale tra città utente e città negozio
          const distance = calculateCityDistance(userCity!, tournament.shop.city)
          
          // Se il calcolo distanza fallisce (città non trovata), includi comunque il torneo (fallback)
          // Questo garantisce che i tornei vengano mostrati anche se la città non è riconosciuta
          if (distance === null) {
            console.log(`[Tournaments API] Tournament ${tournament.id} included (city "${tournament.shop.city}" not found): fallback`)
            return true
          }
          
          const withinDistance = distance <= maxDistance!
          console.log(`[Tournaments API] Tournament ${tournament.id} (${tournament.shop.city}): distance=${distance.toFixed(1)}km, within=${withinDistance}`)
          
          // Include solo tornei entro la distanza massima
          return withinDistance
        })
        console.log(`[Tournaments API] After distance filter: ${filteredTournaments.length} tournaments`)
      } else {
        // Utente non autenticato o senza città: mostra tutti i tornei (senza filtro distanza)
        // Questo permette di vedere i tornei anche se non si è impostata la città
        console.log(`[Tournaments API] No distance filter: userCity=${userCity}, showing all ${tournaments.length} tournaments`)
        filteredTournaments = tournaments
      }
    } else {
      console.log(`[Tournaments API] Distance filter disabled, showing all ${tournaments.length} tournaments`)
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


