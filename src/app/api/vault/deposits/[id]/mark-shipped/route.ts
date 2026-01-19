import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { z } from 'zod'

/**
 * PATCH /api/vault/deposits/[id]/mark-shipped
 * Mark deposit as shipped (update tracking)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = 'then' in params ? await params : params
    const { id } = resolvedParams
    const body = await request.json()

    const schema = z.object({
      trackingIn: z.string().min(1, 'Tracking code is required'),
    })

    const data = schema.parse(body)

    const deposit = await prisma.vaultDeposit.findUnique({
      where: { id },
    })

    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
    }

    // Check permissions
    if (deposit.depositorUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only allow if status is CREATED
    if (deposit.status !== 'CREATED') {
      return NextResponse.json(
        { error: 'Tracking can only be updated when deposit status is CREATED' },
        { status: 400 }
      )
    }

    // Update tracking
    const updatedDeposit = await prisma.vaultDeposit.update({
      where: { id },
      data: {
        trackingIn: data.trackingIn,
      },
    })

    // Audit log
    await createVaultAuditLog({
      actionType: 'DEPOSIT_TRACKING_UPDATED',
      performedBy: user,
      depositId: deposit.id,
      oldValue: { trackingIn: deposit.trackingIn },
      newValue: { trackingIn: updatedDeposit.trackingIn },
    }).catch(console.error)

    return NextResponse.json({ data: updatedDeposit }, { status: 200 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[PATCH /api/vault/deposits/[id]/mark-shipped] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

