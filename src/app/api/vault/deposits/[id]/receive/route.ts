import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { notifyDepositReceived } from '@/lib/vault/notifications'
import { handleApiError } from '@/lib/api-error'

/**
 * POST /api/vault/deposits/[id]/receive
 * Mark deposit as received at hub (HUB_STAFF/ADMIN only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireRole('ADMIN') // Hub staff uses ADMIN role for now

    const resolvedParams = 'then' in params ? await params : params
    const { id } = resolvedParams

    const deposit = await prisma.vaultDeposit.findUnique({
      where: { id },
    })

    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
    }

    if (deposit.status !== 'CREATED') {
      return NextResponse.json(
        { error: `Deposit must be in CREATED status, current: ${deposit.status}` },
        { status: 400 }
      )
    }

    const updated = await prisma.vaultDeposit.update({
      where: { id },
      data: {
        status: 'RECEIVED',
        receivedAt: new Date(),
      },
    })

    await createVaultAuditLog({
      actionType: 'DEPOSIT_RECEIVED',
      performedBy: user,
      depositId: id,
      oldValue: { status: deposit.status },
      newValue: { status: 'RECEIVED' },
    })

    // Notify depositor
    await notifyDepositReceived(id)

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (error) {
    console.error('[POST /api/vault/deposits/[id]/receive] Error:', error)
    return handleApiError(error, 'vault-deposits-id-receive')
  }
}

