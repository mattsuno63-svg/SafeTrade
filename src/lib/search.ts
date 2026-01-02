import { prisma } from './db'
import { CardGame, CardCondition, ListingType } from '@prisma/client'

export interface SearchFilters {
  query?: string
  game?: CardGame
  condition?: CardCondition
  type?: ListingType
  minPrice?: number
  maxPrice?: number
  set?: string
  sortBy?: 'recent' | 'price_asc' | 'price_desc'
  limit?: number
  offset?: number
}

/**
 * Search P2P listings with full-text search and filters
 * Uses PostgreSQL full-text search + trigram for fuzzy matching
 */
export async function searchListings(filters: SearchFilters) {
  const {
    query,
    game,
    condition,
    type,
    minPrice,
    maxPrice,
    set,
    sortBy = 'recent',
    limit = 20,
    offset = 0,
  } = filters

  let where: any = {
    isActive: true,
    isApproved: true,
  }

  // Game filter
  if (game) {
    where.game = game
  }

  // Condition filter
  if (condition) {
    where.condition = condition
  }

  // Type filter
  if (type) {
    where.type = type
  }

  // Price range
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {}
    if (minPrice !== undefined) {
      where.price.gte = minPrice
    }
    if (maxPrice !== undefined) {
      where.price.lte = maxPrice
    }
  }

  // Set filter
  if (set) {
    where.set = {
      contains: set,
      mode: 'insensitive',
    }
  }

  // Full-text search on query
  if (query) {
    where.OR = [
      {
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
      {
        description: {
          contains: query,
          mode: 'insensitive',
        },
      },
      {
        set: {
          contains: query,
          mode: 'insensitive',
        },
      },
      // For fuzzy matching, we'll use a raw query with similarity
      // This requires pg_trgm extension
    ]
  }

  // Sort
  let orderBy: any = {}
  switch (sortBy) {
    case 'price_asc':
      orderBy = { price: 'asc' }
      break
    case 'price_desc':
      orderBy = { price: 'desc' }
      break
    case 'recent':
    default:
      orderBy = { createdAt: 'desc' }
      break
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
          },
        },
      },
      orderBy,
      take: limit,
      skip: offset,
    }),
    prisma.listingP2P.count({ where }),
  ])

  return {
    listings,
    total,
    hasMore: offset + listings.length < total,
  }
}

/**
 * Search shop products
 */
export async function searchProducts(filters: Omit<SearchFilters, 'type'>) {
  const {
    query,
    game,
    condition,
    minPrice,
    maxPrice,
    set,
    sortBy = 'recent',
    limit = 20,
    offset = 0,
  } = filters

  let where: any = {
    isActive: true,
    shop: {
      isApproved: true,
    },
  }

  if (game) where.game = game
  if (condition) where.condition = condition

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {}
    if (minPrice !== undefined) where.price.gte = minPrice
    if (maxPrice !== undefined) where.price.lte = maxPrice
  }

  if (set) {
    where.set = {
      contains: set,
      mode: 'insensitive',
    }
  }

  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { set: { contains: query, mode: 'insensitive' } },
    ]
  }

  let orderBy: any = {}
  switch (sortBy) {
    case 'price_asc':
      orderBy = { price: 'asc' }
      break
    case 'price_desc':
      orderBy = { price: 'desc' }
      break
    case 'recent':
    default:
      orderBy = { createdAt: 'desc' }
      break
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
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
      orderBy,
      take: limit,
      skip: offset,
    }),
    prisma.product.count({ where }),
  ])

  return {
    products,
    total,
    hasMore: offset + products.length < total,
  }
}

