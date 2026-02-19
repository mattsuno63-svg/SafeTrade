import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/hub/packages
 * Lista pacchi per Hub Staff
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // SECURITY: Only HUB_STAFF and ADMIN can view packages
    if (user.role !== 'HUB_STAFF' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo HUB_STAFF e ADMIN possono visualizzare i pacchi' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {
      escrowType: 'VERIFIED',
    }

    if (status) {
      where.status = status
    }

    const packages = await prisma.safeTradeTransaction.findMany({
      where,
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        proposal: {
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                images: true,
              },
            },
          },
        },
        escrowPayment: {
          select: {
            id: true,
            amount: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    })

    const total = await prisma.safeTradeTransaction.count({ where })

    return NextResponse.json({
      packages,
      total,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('Error fetching packages:', error)
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
