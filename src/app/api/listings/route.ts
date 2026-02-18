import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CardGame, CardCondition } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { calculateCityDistance } from '@/lib/utils/distance'

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
    const locationFilter = searchParams.get('locationFilter') as 'locale' | 'regionale' | 'nazionale' | null
    const isVault = searchParams.get('isVault') // 'true' or 'false' or null
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
    if (isVault === 'true') where.isVaultListing = true
    if (isVault === 'false') where.isVaultListing = false
    // Location filter: locale (near me), regionale (same province), nazionale (all)
    let userCity: string | null = null
    let userProvince: string | null = null
    let maxDistanceKm: number | null = null
    if (locationFilter === 'locale' || locationFilter === 'regionale') {
      const uid = session?.user?.id
      if (uid) {
        const dbUser = await prisma.user.findUnique({
          where: { id: uid },
          select: { city: true, province: true, maxDistance: true },
        })
        userCity = dbUser?.city ?? null
        userProvince = dbUser?.province ?? null
        maxDistanceKm = dbUser?.maxDistance ?? 50
      }
    }
    if (locationFilter === 'regionale' && userProvince) {
      where.user = where.user || {}
      where.user.province = { equals: userProvince, mode: 'insensitive' }
    }
    // Filter by seller's city and/or role (manual city search, not locationFilter)
    if (city || sellerType) {
      where.user = where.user || {}
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

    const userSelect = {
      id: true,
      name: true,
      avatar: true,
      role: true,
      city: true,
      province: true,
      subscription: {
        include: { plan: true },
      },
    }

    let listings: any[]
    let total: number

    if (locationFilter === 'locale' && userCity && maxDistanceKm != null) {
      // Fetch ids + seller city for distance filter (no DB distance, so filter in memory)
      const maxLocal = 5000
      const candidates = await prisma.listingP2P.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          price: true,
          user: { select: { city: true } },
        },
        orderBy,
        take: maxLocal,
      })
      const filtered = candidates.filter((row) => {
        const sellerCity = row.user?.city ?? null
        if (!sellerCity) return false
        const km = calculateCityDistance(userCity!, sellerCity)
        return km != null && km <= maxDistanceKm!
      })
      total = filtered.length
      const pageIds = filtered.slice(skip, skip + limit).map((r) => r.id)
      listings = pageIds.length
        ? await prisma.listingP2P.findMany({
            where: { id: { in: pageIds } },
            include: { user: { select: userSelect } },
          })
        : []
      // Restore sort order (findMany doesn't preserve id order)
      const orderMap = new Map(pageIds.map((id, i) => [id, i]))
      listings.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
    } else {
      const [listingsRes, totalRes] = await Promise.all([
        prisma.listingP2P.findMany({
          where,
          include: { user: { select: userSelect } },
          orderBy,
          take: limit,
          skip,
        }),
        prisma.listingP2P.count({ where }),
      ])
      listings = listingsRes
      total = totalRes
    }

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
    const { requireEmailVerified } = await import('@/lib/auth')
    const user = await requireEmailVerified()

    // FIX #3: Rate limiting for listing creation
    const { checkRateLimit, getRateLimitKey, RATE_LIMITS } = await import('@/lib/rate-limit')
    const rateLimitKey = getRateLimitKey(user.id, 'LISTING_CREATE')
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.LISTING_CREATE)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Troppe richieste. Limite di 10 annunci per ora raggiunto.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000), // seconds
        },
        { status: 429 }
      )
    }

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
      isVaultListing,
    } = body

    // Validation
    if (!title || !type || !condition || !game) {
      return NextResponse.json(
        { error: 'Missing required fields', details: { title, type, condition, game } },
        { status: 400 }
      )
    }

    if (typeof title !== 'string' || title.length > 500) {
      return NextResponse.json(
        { error: 'Title must be a string with max 500 characters' },
        { status: 400 }
      )
    }

    if (description != null && (typeof description !== 'string' || description.length > 5000)) {
      return NextResponse.json(
        { error: 'Description must be a string with max 5000 characters' },
        { status: 400 }
      )
    }

    if (type === 'SALE' || type === 'BOTH') {
      const priceNum = typeof price === 'number' ? price : parseFloat(String(price))
      if (isNaN(priceNum) || priceNum <= 0 || priceNum > 1_000_000) {
        return NextResponse.json(
          { error: 'Price is required and must be a valid number between 0 and 1000000' },
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

    // Auto-approve listings for verified/trusted users
    // Admin can still reject if needed via /admin/listings
    let userRecord: any = null
    try {
      userRecord = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          createdAt: true,
          karma: {
            select: {
              karma: true,
            },
          },
          _count: {
            select: {
              listings: true,
            },
          },
        },
      })
    } catch (error) {
      console.error('Error fetching user record:', error)
      // Continue with default values if query fails
    }

    // Check email verification via Supabase session
    let isEmailVerified = false
    try {
      const session = await getSession()
      isEmailVerified = session?.user?.email_confirmed_at ? true : false
    } catch (error) {
      console.error('Error checking email verification:', error)
      // Default to false if check fails
    }

    // Auto-approve if:
    // - User has verified email OR
    // - User account is older than 7 days OR
    // - User has positive karma OR
    // - User has created listings before (trusted seller)
    const accountAge = userRecord?.createdAt 
      ? (Date.now() - new Date(userRecord.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      : 0
    const hasPositiveKarma = (userRecord?.karma?.karma || 0) > 0
    const hasPreviousListings = (userRecord?._count?.listings || 0) > 0

    const shouldAutoApprove = isEmailVerified || 
                              accountAge >= 7 || 
                              hasPositiveKarma || 
                              hasPreviousListings

    // Create listing first
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
        isApproved: shouldAutoApprove, // Auto-approve for trusted users
        isVaultListing: isVaultListing || false,
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

    // If SafeVault listing, create deposit and item, then link them
    if (isVaultListing) {
      try {
        const { createVaultAuditLog } = await import('@/lib/vault/audit')
        
        // Create VaultDeposit with VaultItem linked to listing
        const deposit = await prisma.vaultDeposit.create({
          data: {
            depositorUserId: user.id,
            status: 'CREATED',
            notes: `Deposito creato automaticamente da listing: "${title}"`,
            items: {
              create: {
                ownerUserId: user.id,
                game: game as any,
                name: title,
                set: set || null,
                conditionDeclared: condition as any,
                photos: images,
                status: 'PENDING_REVIEW',
                listingId: listing.id, // Link to listing
              },
            },
          },
          include: {
            items: true,
          },
        })

        const vaultItem = deposit.items[0]

        if (vaultItem) {
          // Update listing with vaultItemId and vaultDepositId
          await prisma.listingP2P.update({
            where: { id: listing.id },
            data: {
              vaultItemId: vaultItem.id,
              vaultDepositId: deposit.id,
            },
          })

          // Audit log
          await createVaultAuditLog({
            actionType: 'DEPOSIT_CREATED',
            performedBy: user,
            depositId: deposit.id,
            newValue: { itemCount: 1, fromListing: true, listingId: listing.id },
          }).catch(console.error)

          // Notify admins about new Vault deposit
          const admins = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'HUB_STAFF'] } },
            select: { id: true },
          })

          for (const admin of admins) {
            await prisma.adminNotification.create({
              data: {
                type: 'VAULT_CASE_REQUEST', // Reuse this type for now
                referenceType: 'VAULT_DEPOSIT',
                referenceId: deposit.id,
                title: 'Nuovo Deposito Vault da Listing',
                message: `Nuovo deposito Vault creato da listing "${title}". Verifica richiesta.`,
                priority: 'NORMAL',
                targetRoles: ['ADMIN', 'HUB_STAFF'],
              },
            }).catch(console.error)
          }
        }
      } catch (vaultError: any) {
        console.error('Error creating Vault deposit:', vaultError)
        // Non bloccare la creazione del listing se il deposito fallisce
        // L'utente può creare il deposito manualmente dopo
      }
    }
    
    // Trigger price alerts check (async, don't wait)
    checkPriceAlerts(listing).catch(console.error)

    // Notify admins if listing needs manual approval
    if (!shouldAutoApprove) {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      })

      for (const admin of admins) {
        await prisma.adminNotification.create({
          data: {
            type: 'LISTING_PENDING',
            referenceType: 'LISTING',
            referenceId: listing.id,
            title: 'Nuovo Listing da Approvare',
            message: `Nuovo listing "${listing.title}" richiede approvazione manuale.`,
            priority: 'NORMAL',
            targetRoles: ['ADMIN', 'MODERATOR'],
          },
        }).catch(console.error) // Non bloccare se la notifica fallisce
      }
    }

    return NextResponse.json({
      ...listing,
      isEarlyAccess: visibility === 'EARLY_ACCESS',
      isApproved: shouldAutoApprove,
      requiresApproval: !shouldAutoApprove,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating listing:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    })
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    if (error.message === 'Email not verified') {
      return NextResponse.json(
        { error: 'Email non verificata. Verifica la tua email per creare annunci.' },
        { status: 403 }
      )
    }
    
    // Return more detailed error in development
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(isDevelopment && {
          details: error.message,
          code: error.code,
        }),
      },
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


