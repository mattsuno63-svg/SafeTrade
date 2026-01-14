import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/vault/payouts
 * Get payouts (filtered by role)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // OWNER, MERCHANT, PLATFORM

    if (user.role === 'ADMIN' || user.role === 'HUB_STAFF') {
      // Admin can see all payouts
      const batches = await prisma.vaultPayoutBatch.findMany({
        where: type ? { type: type as any } : undefined,
        include: {
          lines: {
            include: {
              split: {
                include: {
                  item: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({ data: batches }, { status: 200 })
    } else {
      // Users can see their own payout lines
      const lines = await prisma.vaultPayoutLine.findMany({
        where: {
          payeeType: 'USER',
          payeeId: user.id,
        },
        include: {
          batch: true,
          split: {
            include: {
              item: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({ data: lines }, { status: 200 })
    }
  } catch (error: any) {
    console.error('[GET /api/vault/payouts] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

