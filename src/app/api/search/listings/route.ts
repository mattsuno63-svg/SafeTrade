import { NextRequest, NextResponse } from 'next/server'
import { searchListings } from '@/lib/search'
import { CardGame, CardCondition, ListingType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const filters = {
      query: searchParams.get('q') || undefined,
      game: searchParams.get('game') as CardGame | undefined,
      condition: searchParams.get('condition') as CardCondition | undefined,
      type: searchParams.get('type') as ListingType | undefined,
      minPrice: searchParams.get('minPrice')
        ? parseFloat(searchParams.get('minPrice')!)
        : undefined,
      maxPrice: searchParams.get('maxPrice')
        ? parseFloat(searchParams.get('maxPrice')!)
        : undefined,
      set: searchParams.get('set') || undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'recent',
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : 20,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : 0,
    }

    const result = await searchListings(filters)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


