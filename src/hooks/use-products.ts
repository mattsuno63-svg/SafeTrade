'use client'

import { useQuery } from '@tanstack/react-query'

interface UseProductsParams {
  shopId?: string
  game?: string
  isActive?: boolean
}

export function useProducts(params: UseProductsParams = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.shopId) searchParams.set('shopId', params.shopId)
      if (params.game) searchParams.set('game', params.game)
      if (params.isActive !== undefined) searchParams.set('isActive', params.isActive.toString())

      const res = await fetch(`/api/products?${searchParams}`)
      if (!res.ok) throw new Error('Failed to fetch products')
      return res.json()
    },
  })
}

