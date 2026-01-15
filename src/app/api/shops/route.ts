import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/shops
 * Ottiene tutti i negozi partner SafeTrade (approvati e con vault enabled)
 * Supporta filtri per città, provincia, nome, rating
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')
    const province = searchParams.get('province')
    const name = searchParams.get('name')
    const minRating = searchParams.get('minRating')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const where: any = {
      isApproved: true,
      // Solo negozi che hanno aderito al progetto (vaultEnabled o hanno teca autorizzata)
      OR: [
        { vaultEnabled: true },
        { vaultCaseAuthorized: true },
      ],
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' }
    }

    if (province) {
      where.province = { contains: province, mode: 'insensitive' }
    }

    if (name) {
      where.name = { contains: name, mode: 'insensitive' }
    }

    if (minRating) {
      where.rating = { gte: parseFloat(minRating) }
    }

    const shops = await prisma.shop.findMany({
      where,
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            tournaments: {
              where: {
                date: { gte: new Date() },
                status: { in: ['PUBLISHED', 'REGISTRATION_CLOSED'] },
              },
            },
          },
        },
      },
      orderBy: [
        { rating: 'desc' },
        { ratingCount: 'desc' },
        { name: 'asc' },
      ],
      take: limit ? parseInt(limit) : 50,
      skip: offset ? parseInt(offset) : 0,
    })

    const total = await prisma.shop.count({ where })

    return NextResponse.json({
      shops,
      total,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    })
  } catch (error: any) {
    console.error('Error fetching shops:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
