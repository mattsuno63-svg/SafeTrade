import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { calculateCityDistance, getCityCoordinates, calculateDistance } from '@/lib/utils/distance'

export const dynamic = 'force-dynamic'

/**
 * GET /api/shops
 * Ottiene tutti i negozi partner SafeTrade (approvati)
 * Filtra automaticamente per distanza geografica se utente autenticato
 * Supporta filtri per città, provincia, nome, rating
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')
    const province = searchParams.get('province')
    const name = searchParams.get('name') || searchParams.get('q') // Support both 'name' and 'q' for search
    const minRating = searchParams.get('minRating')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const filterByDistance = searchParams.get('filterByDistance') !== 'false' // Default true

    // Try to get authenticated user for distance filtering
    let userCity: string | null = null
    let userMaxDistance: number = 50 // Default 50km
    
    try {
      const user = await requireAuth()
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { city: true, maxDistance: true },
        })
        userCity = dbUser?.city || null
        userMaxDistance = dbUser?.maxDistance || 50
      }
    } catch {
      // User not authenticated, skip distance filtering
    }

    const where: any = {
      isApproved: true,
      // Include negozi che supportano:
      // 1. Vault (vaultEnabled o vaultCaseAuthorized) - per vendite online
      // 2. Escrow locale - tutti i negozi approvati possono gestire escrow locale
      // Quindi mostriamo tutti i negozi approvati (non serve filtro OR per vault)
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' }
    }

    if (province) {
      where.province = { contains: province, mode: 'insensitive' }
    }

    if (name) {
      where.name = { contains: name, mode: 'insensitive' }
    }

    if (minRating) {
      where.rating = { gte: parseFloat(minRating) }
    }

    let shops = await prisma.shop.findMany({
      where,
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            tournaments: {
              where: {
                date: { gte: new Date() },
                status: { in: ['PUBLISHED', 'REGISTRATION_CLOSED'] },
              },
            },
          },
        },
      },
      orderBy: [
        { rating: 'desc' },
        { ratingCount: 'desc' },
        { name: 'asc' },
      ],
      take: limit ? parseInt(limit) : 100, // Get more to filter by distance
      skip: offset ? parseInt(offset) : 0,
    })

    // Filter by distance if user is authenticated and has city
    if (filterByDistance && userCity && shops.length > 0) {
      const userCoords = getCityCoordinates(userCity)
      
      if (userCoords) {
        shops = shops.filter((shop) => {
          if (!shop.city) {
            // If shop has no city, exclude it (we need city for distance calculation)
            return false
          }
          
          // If shop has coordinates, use them
          if (shop.latitude && shop.longitude) {
            const distance = calculateDistance(
              userCoords.lat,
              userCoords.lon,
              shop.latitude,
              shop.longitude
            )
            return distance <= userMaxDistance
          }
          
          // Otherwise, calculate distance between cities
          const shopCoords = getCityCoordinates(shop.city)
          if (!shopCoords) {
            // Shop city not found in our database, exclude it
            return false
          }
          
          const distance = calculateCityDistance(userCity, shop.city)
          if (distance === null) {
            return false
          }
          
          return distance <= userMaxDistance
        })
      }
    }

    const total = shops.length

    return NextResponse.json({
      shops,
      total,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      filteredByDistance: filterByDistance && userCity !== null,
      userMaxDistance: userCity ? userMaxDistance : null,
    })
  } catch (error: any) {
    console.error('Error fetching shops:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
