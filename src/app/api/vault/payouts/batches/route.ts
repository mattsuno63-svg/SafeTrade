import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { z } from 'zod'

/**
 * POST /api/vault/payouts/batches
 * Create payout batch - ADMIN only
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('ADMIN')

    const body = await request.json()
    const schema = z.object({
      type: z.enum(['OWNER', 'MERCHANT', 'PLATFORM']),
      periodStart: z.string().datetime().optional(),
      periodEnd: z.string().datetime().optional(),
    })

    const data = schema.parse(body)

    // Get eligible splits filtered by type
    const splits = await prisma.vaultSplit.findMany({
      where: {
        status: 'ELIGIBLE',
        ...(data.type === 'OWNER'
          ? { ownerAmount: { gt: 0 } }
          : data.type === 'MERCHANT'
          ? { merchantAmount: { gt: 0 } }
          : { platformAmount: { gt: 0 } }),
        ...(data.periodStart ? { eligibleAt: { gte: new Date(data.periodStart) } } : {}),
        ...(data.periodEnd ? { eligibleAt: { lte: new Date(data.periodEnd) } } : {}),
      },
      include: {
        owner: true,
        shop: true,
      },
    })

    if (splits.length === 0) {
      return NextResponse.json(
        { error: 'No eligible splits found for the specified criteria' },
        { status: 400 }
      )
    }

    // Map type to VaultPayoutPayeeType enum values
    const batchType = data.type === 'OWNER' ? 'USER' : data.type === 'MERCHANT' ? 'SHOP' : 'PLATFORM'

    // Create batch and lines
    const batch = await prisma.$transaction(async (tx) => {
      const batch = await tx.vaultPayoutBatch.create({
        data: {
          type: batchType,
          status: 'CREATED',
          periodStart: data.periodStart ? new Date(data.periodStart) : null,
          periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
        },
      })

      // Create one payout line per split for full traceability
      const lines = await Promise.all(
        splits.map(async (split) => {
          let payeeId: string
          let amount: number
          if (data.type === 'OWNER') {
            payeeId = split.ownerUserId
            amount = split.ownerAmount
          } else if (data.type === 'MERCHANT') {
            payeeId = split.shopId
            amount = split.merchantAmount
          } else {
            payeeId = 'PLATFORM'
            amount = split.platformAmount
          }

          return tx.vaultPayoutLine.create({
            data: {
              batchId: batch.id,
              splitId: split.id,
              payeeType: data.type === 'OWNER' ? 'USER' : data.type === 'MERCHANT' ? 'SHOP' : 'PLATFORM',
              payeeId,
              amount: Math.round(amount * 100) / 100,
              status: 'PENDING',
            },
          })
        })
      )

      // Update splits to IN_PAYOUT
      await tx.vaultSplit.updateMany({
        where: {
          id: { in: splits.map((s) => s.id) },
        },
        data: { status: 'IN_PAYOUT' },
      })

      return { batch, lines }
    })

    return NextResponse.json({ data: batch }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[POST /api/vault/payouts/batches] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

