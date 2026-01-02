import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { CardCondition, CardGame } from '@prisma/client'

// GET - Fetch all products for the merchant's shop
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Get the merchant's shop
    const shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found. Please set up your shop first.' },
        { status: 404 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const game = searchParams.get('game') || ''
    const isActive = searchParams.get('isActive')

    const skip = (page - 1) * limit

    const where: any = {
      shopId: shop.id,
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { set: { contains: search, mode: 'insensitive' } },
        { cardNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (game && game !== 'ALL') {
      where.game = game as CardGame
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true'
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Error fetching products:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new product
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Get the merchant's shop
    const shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found. Please set up your shop first.' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      price,
      condition,
      game,
      set,
      cardNumber,
      rarity,
      language,
      images,
      stock,
    } = body

    // Validate required fields
    if (!title || !price || !condition || !game) {
      return NextResponse.json(
        { error: 'Title, price, condition, and game are required' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        condition: condition as CardCondition,
        game: game as CardGame,
        set,
        cardNumber,
        rarity,
        language: language || 'IT',
        images: images || [],
        stock: stock || 1,
        shopId: shop.id,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    console.error('Error creating product:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

