import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const city = searchParams.get('city') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { address: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
      ]
    }
    
    if (city) {
      where.city = { contains: city, mode: 'insensitive' }
    }

    const shops = await prisma.shop.findMany({
      where,
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        postalCode: true,
        phone: true,
        rating: true,
        ratingCount: true,
        logo: true,
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { rating: 'desc' },
        { ratingCount: 'desc' },
      ],
      take: limit,
    })

    return NextResponse.json({ shops })
  } catch (error) {
    console.error('Error fetching shops:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
