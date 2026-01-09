import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Public API to get shop data by slug or id
// Accepts both slug (for public pages) and id (for internal use)
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    // Try to find by slug first, then by id if not found
    let shop = await prisma.shop.findUnique({
      where: { slug },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        products: {
          where: { isActive: true },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        tournaments: {
          where: { status: 'PUBLISHED' },
          take: 10,
          orderBy: { date: 'asc' },
          include: {
            _count: {
              select: { registrations: true },
            },
          },
        },
      },
    })

    // If not found by slug, try by id (for backward compatibility)
    if (!shop) {
      shop = await prisma.shop.findUnique({
        where: { id: slug },
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          products: {
            where: { isActive: true },
            take: 20,
            orderBy: { createdAt: 'desc' },
          },
          tournaments: {
            where: { status: 'PUBLISHED' },
            take: 10,
            orderBy: { date: 'asc' },
            include: {
              _count: {
                select: { registrations: true },
              },
            },
          },
        },
      })
    }

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // For public pages (slug), only return approved shops
    // For internal use (id), return all shops
    const isSlugRequest = shop.slug === slug
    if (isSlugRequest && !shop.isApproved) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const response = NextResponse.json(shop)
    // Cache for 60 seconds (same as page revalidate)
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    return response
  } catch (error: any) {
    console.error('Error fetching shop:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

