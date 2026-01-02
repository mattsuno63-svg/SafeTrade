import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CardGame, CardCondition } from '@prisma/client'

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

    const where: any = {
      isActive: true,
      isApproved: true, // Only show approved listings
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
            },
          },
        },
        orderBy,
        take: limit,
        skip,
      }),
      prisma.listingP2P.count({ where }),
    ])

    return NextResponse.json({
      listings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
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
        userId: user.id, // Use authenticated user ID
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

    return NextResponse.json(listing, { status: 201 })
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

