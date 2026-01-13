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

    // Get eligible splits
    const splits = await prisma.vaultSplit.findMany({
      where: {
        status: 'ELIGIBLE',
        ...(data.type === 'OWNER'
          ? {}
          : data.type === 'MERCHANT'
          ? {}
          : {}), // Platform splits
      },
      include: {
        owner: true,
        shop: true,
      },
    })

    // Group by payee
    const payeeMap = new Map<string, { amount: number; splitIds: string[] }>()

    for (const split of splits) {
      let payeeId: string
      if (data.type === 'OWNER') {
        payeeId = split.ownerUserId
      } else if (data.type === 'MERCHANT') {
        payeeId = split.shopId
      } else {
        // Platform - use a constant ID
        payeeId = 'PLATFORM'
      }

      const existing = payeeMap.get(payeeId) || { amount: 0, splitIds: [] }
      existing.amount +=
        data.type === 'OWNER'
          ? split.ownerAmount
          : data.type === 'MERCHANT'
          ? split.merchantAmount
          : split.platformAmount
      existing.splitIds.push(split.id)
      payeeMap.set(payeeId, existing)
    }

    // Create batch and lines
    const batch = await prisma.$transaction(async (tx) => {
      const batch = await tx.vaultPayoutBatch.create({
        data: {
          type: data.type,
          status: 'CREATED',
          periodStart: data.periodStart ? new Date(data.periodStart) : null,
          periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
        },
      })

      // Create payout lines
      const lines = await Promise.all(
        Array.from(payeeMap.entries()).map(async ([payeeId, { amount, splitIds }]) => {
          // Get first split to link
          const firstSplitId = splitIds[0]

          return tx.vaultPayoutLine.create({
            data: {
              batchId: batch.id,
              splitId: firstSplitId,
              payeeType: data.type === 'OWNER' ? 'USER' : data.type === 'MERCHANT' ? 'SHOP' : 'PLATFORM',
              payeeId,
              amount: Math.round(amount * 100) / 100, // Round to 2 decimals
              status: 'PENDING',
            },
          })
        })
      )

      // Update splits to IN_PAYOUT
      await tx.vaultSplit.updateMany({
        where: {
          id: { in: Array.from(payeeMap.values()).flatMap((v) => v.splitIds) },
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

