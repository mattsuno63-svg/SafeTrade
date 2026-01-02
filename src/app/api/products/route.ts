import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CardGame, CardCondition } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const shopId = searchParams.get('shopId')
    const game = searchParams.get('game') as CardGame | null
    const isActive = searchParams.get('isActive') !== 'false'

    const where: any = {
      isActive,
    }

    if (shopId) where.shopId = shopId
    if (game) where.game = game

    const products = await prisma.product.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            logo: true,
            rating: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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
      images,
      stock,
      shopId,
    } = body

    // TODO: Verificare autenticazione e che shopId appartenga all'utente

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
        images: images || [],
        stock: parseInt(stock) || 1,
        shopId,
      },
      include: {
        shop: true,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

