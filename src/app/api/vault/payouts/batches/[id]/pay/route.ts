import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { notifyPayoutPaid } from '@/lib/vault/notifications'

/**
 * POST /api/vault/payouts/batches/[id]/pay
 * Mark payout batch as paid - ADMIN only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireRole('ADMIN')
    const resolvedParams = 'then' in params ? await params : params
    const { id: batchId } = resolvedParams

    const batch = await prisma.vaultPayoutBatch.findUnique({
      where: { id: batchId },
      include: {
        lines: {
          include: {
            split: true,
          },
        },
      },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    if (batch.status !== 'CREATED' && batch.status !== 'PROCESSING') {
      return NextResponse.json(
        { error: `Batch must be CREATED or PROCESSING, current: ${batch.status}` },
        { status: 400 }
      )
    }

    // Update batch and lines, mark splits as PAID
    const result = await prisma.$transaction(async (tx) => {
      // Update batch
      const updatedBatch = await tx.vaultPayoutBatch.update({
        where: { id: batchId },
        data: { status: 'PAID' },
      })

      // Update lines
      await tx.vaultPayoutLine.updateMany({
        where: { batchId },
        data: { status: 'PAID' },
      })

      // Update splits
      const splitIds = batch.lines.map((line) => line.splitId).filter(Boolean) as string[]
      if (splitIds.length > 0) {
        await tx.vaultSplit.updateMany({
          where: { id: { in: splitIds } },
          data: { status: 'PAID' },
        })
      }

      return updatedBatch
    })

    // Notify payees
    await notifyPayoutPaid(batchId)

    return NextResponse.json({ data: result }, { status: 200 })
  } catch (error: any) {
    console.error('[POST /api/vault/payouts/batches/[id]/pay] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

