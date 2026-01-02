import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { CardCondition, CardGame } from '@prisma/client'

// GET - Fetch a single product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const user = await requireAuth()
    
    const shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const product = await prisma.product.findFirst({
      where: {
        id,
        shopId: shop.id,
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error: any) {
    console.error('Error fetching product:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update a product
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const user = await requireAuth()
    
    const shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Verify product belongs to shop
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        shopId: shop.id,
      },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
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
      isActive,
    } = body

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(condition !== undefined && { condition: condition as CardCondition }),
        ...(game !== undefined && { game: game as CardGame }),
        ...(set !== undefined && { set }),
        ...(cardNumber !== undefined && { cardNumber }),
        ...(rarity !== undefined && { rarity }),
        ...(language !== undefined && { language }),
        ...(images !== undefined && { images }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(updatedProduct)
  } catch (error: any) {
    console.error('Error updating product:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const user = await requireAuth()
    
    const shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Verify product belongs to shop
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        shopId: shop.id,
      },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    await prisma.product.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting product:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

