import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CardGame, CardCondition } from '@prisma/client'
import { getSession } from '@/lib/auth'

// Helper to check if user has premium subscription
async function getUserSubscriptionTier(userId: string | null): Promise<'FREE' | 'PREMIUM' | 'PRO'> {
  if (!userId) return 'FREE'
  
  const subscription = await prisma.userSubscription.findUnique({
    where: { userId },
    include: { plan: true },
  })
  
  if (!subscription || subscription.status !== 'ACTIVE') return 'FREE'
  if (subscription.endDate && subscription.endDate < new Date()) return 'FREE'
  
  return subscription.plan.tier as 'FREE' | 'PREMIUM' | 'PRO'
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const game = searchParams.get('game') as CardGame | null
    const condition = searchParams.get('condition') as CardCondition | null
    const listingType = searchParams.get('type') // SALE, TRADE, BOTH
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null
    const query = searchParams.get('q') || ''
    const city = searchParams.get('city') || ''
    const sellerType = searchParams.get('sellerType') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const sort = searchParams.get('sort') || 'newest'
    const showEarlyAccess = searchParams.get('earlyAccess') === 'true'

    // Check user's subscription tier for early access filtering
    const session = await getSession()
    const userTier = await getUserSubscriptionTier(session?.user?.id || null)
    const canSeeEarlyAccess = userTier === 'PREMIUM' || userTier === 'PRO'

    const where: any = {
      isActive: true,
      isApproved: true, // Only show approved listings
    }
    
    // Early Access filtering
    // If user is not premium, only show PUBLIC listings or EARLY_ACCESS that have expired
    if (!canSeeEarlyAccess) {
      where.OR = [
        { visibility: 'PUBLIC' },
        { 
          visibility: 'EARLY_ACCESS',
          earlyAccessEnd: { lt: new Date() }
        }
      ]
    } else if (showEarlyAccess) {
      // Premium users filtering for early access only
      where.visibility = 'EARLY_ACCESS'
      where.earlyAccessEnd = { gt: new Date() }
    }

    if (game) where.game = game
    if (condition) where.condition = condition
    if (listingType) where.type = listingType
    // Filter by seller's city and/or role
    if (city || sellerType) {
      where.user = {}
      if (city) {
        where.user.city = { contains: city, mode: 'insensitive' }
      }
      if (sellerType) {
        where.user.role = sellerType
      }
    }
    if (minPrice !== null || maxPrice !== null) {
      where.price = {}
      if (minPrice !== null) where.price.gte = minPrice
      if (maxPrice !== null) where.price.lte = maxPrice
    }
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { set: { contains: query, mode: 'insensitive' } },
        { rarity: { contains: query, mode: 'insensitive' } },
        { cardNumber: { contains: query, mode: 'insensitive' } },
      ]
    }

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' }
    switch (sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' }
        break
      case 'price_asc':
        orderBy = { price: 'asc' }
        break
      case 'price_desc':
        orderBy = { price: 'desc' }
        break
      default:
        orderBy = { createdAt: 'desc' }
    }

    const [listings, total] = await Promise.all([
      prisma.listingP2P.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
              city: true,
              subscription: {
                include: { plan: true }
              }
            },
          },
        },
        orderBy,
        take: limit,
        skip,
      }),
      prisma.listingP2P.count({ where }),
    ])

    // Add isEarlyAccess flag to each listing for UI display
    const listingsWithFlags = listings.map(listing => ({
      ...listing,
      isEarlyAccess: listing.visibility === 'EARLY_ACCESS' && 
                     listing.earlyAccessEnd && 
                     listing.earlyAccessEnd > new Date(),
      earlyAccessEndsIn: listing.earlyAccessEnd ? 
        Math.max(0, Math.floor((listing.earlyAccessEnd.getTime() - Date.now()) / 1000 / 60 / 60)) : null, // hours
    }))

    const response = NextResponse.json({
      listings: listingsWithFlags,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      userTier, // Include user's tier for frontend
    })

    // Cache for 30 seconds for GET requests
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    
    return response
  } catch (error) {
    console.error('Error fetching listings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { requireAuth } = await import('@/lib/auth')
    const user = await requireAuth()

    const body = await request.json()
    const {
      title,
      description,
      type,
      price,
      condition,
      game,
      set,
      cardNumber,
      images,
      wants,
    } = body

    // Validation
    if (!title || !type || !condition || !game) {
      return NextResponse.json(
        { error: 'Missing required fields', details: { title, type, condition, game } },
        { status: 400 }
      )
    }

    if (type === 'SALE' || type === 'BOTH') {
      if (!price || price <= 0) {
        return NextResponse.json(
          { error: 'Price is required and must be greater than 0 for sale listings' },
          { status: 400 }
        )
      }
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required' },
        { status: 400 }
      )
    }

    if (images.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 images allowed' },
        { status: 400 }
      )
    }

    // Check if user has premium subscription for early access
    const userSubscription = await prisma.userSubscription.findUnique({
      where: { userId: user.id },
      include: { plan: true },
    })
    
    let visibility: 'EARLY_ACCESS' | 'PUBLIC' = 'PUBLIC'
    let earlyAccessEnd: Date | null = null
    
    // If subscription is active and premium/pro, enable early access
    if (userSubscription && 
        userSubscription.status === 'ACTIVE' &&
        (!userSubscription.endDate || userSubscription.endDate > new Date())) {
      const earlyAccessHours = userSubscription.plan.earlyAccessHours
      if (earlyAccessHours > 0) {
        visibility = 'EARLY_ACCESS'
        earlyAccessEnd = new Date()
        earlyAccessEnd.setHours(earlyAccessEnd.getHours() + earlyAccessHours)
      }
    }

    const listing = await prisma.listingP2P.create({
      data: {
        title,
        description,
        type,
        price: type === 'SALE' || type === 'BOTH' ? price : null,
        condition,
        game,
        set,
        cardNumber,
        images,
        wants,
        userId: user.id,
        visibility,
        earlyAccessEnd,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            city: true,
          },
        },
      },
    })
    
    // Trigger price alerts check (async, don't wait)
    checkPriceAlerts(listing).catch(console.error)

    return NextResponse.json({
      ...listing,
      isEarlyAccess: visibility === 'EARLY_ACCESS',
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating listing:', error)
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

// Check price alerts when a new listing is created
async function checkPriceAlerts(listing: any) {
  try {
    // Find all active alerts that might match this listing
    const alerts = await prisma.priceAlert.findMany({
      where: {
        isActive: true,
        OR: [
          // Match by game
          { game: listing.game },
          // Match by card name (fuzzy)
          listing.title ? { 
            cardName: { 
              contains: listing.title.split(' ')[0], // First word match
              mode: 'insensitive' 
            } 
          } : {},
        ],
      },
      include: {
        user: {
          include: {
            subscription: { include: { plan: true } }
          }
        }
      }
    })

    for (const alert of alerts) {
      // Check if alert conditions are met
      let matches = true

      if (alert.maxPrice && listing.price && listing.price > alert.maxPrice) {
        matches = false
      }
      if (alert.minPrice && listing.price && listing.price < alert.minPrice) {
        matches = false
      }
      if (alert.condition && listing.condition !== alert.condition) {
        matches = false
      }
      if (alert.cardSet && listing.set && !listing.set.toLowerCase().includes(alert.cardSet.toLowerCase())) {
        matches = false
      }
      if (alert.cardName && listing.title && !listing.title.toLowerCase().includes(alert.cardName.toLowerCase())) {
        matches = false
      }

      if (matches) {
        // Create alert trigger
        await prisma.alertTrigger.create({
          data: {
            alertId: alert.id,
            listingId: listing.id,
            matchedPrice: listing.price || 0,
          }
        })

        // Update alert
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: {
            lastTriggeredAt: new Date(),
            triggerCount: { increment: 1 }
          }
        })

        // Create notification
        await prisma.notification.create({
          data: {
            userId: alert.userId,
            type: 'price_alert',
            title: '🔔 Price Alert Triggered!',
            message: `"${listing.title}" disponibile a €${listing.price?.toFixed(2) || 'N/A'}`,
            link: `/listings/${listing.id}`,
            data: {
              alertId: alert.id,
              listingId: listing.id,
              price: listing.price
            }
          }
        })
      }
    }
  } catch (error) {
    console.error('Error checking price alerts:', error)
  }
}


