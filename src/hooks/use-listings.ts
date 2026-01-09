'use client'

import { useQuery } from '@tanstack/react-query'
import { CardGame, CardCondition } from '@prisma/client'

interface UseListingsParams {
  game?: CardGame
  condition?: CardCondition
  minPrice?: number
  maxPrice?: number
  query?: string
  page?: number
  limit?: number
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc'
}

export function useListings(params: UseListingsParams = {}) {
  const {
    game,
    condition,
    minPrice,
    maxPrice,
    query,
    page = 1,
    limit = 20,
    sort = 'newest',
  } = params

  return useQuery({
    queryKey: ['listings', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (game) searchParams.set('game', game)
      if (condition) searchParams.set('condition', condition)
      if (minPrice) searchParams.set('minPrice', minPrice.toString())
      if (maxPrice) searchParams.set('maxPrice', maxPrice.toString())
      if (query) searchParams.set('q', query)
      searchParams.set('page', page.toString())
      searchParams.set('limit', limit.toString())
      searchParams.set('sort', sort)

      const res = await fetch(`/api/listings?${searchParams}`)
      if (!res.ok) throw new Error('Failed to fetch listings')
      return res.json()
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  })
}

