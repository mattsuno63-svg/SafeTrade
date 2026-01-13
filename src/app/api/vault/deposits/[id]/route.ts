import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'

/**
 * GET /api/vault/deposits/[id]
 * Get deposit details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params

    const deposit = await prisma.vaultDeposit.findUnique({
      where: { id },
      include: {
        depositor: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            shop: {
              select: { id: true, name: true },
            },
            case: {
              select: { id: true, label: true },
            },
            slot: {
              select: { id: true, slotCode: true },
            },
          },
        },
      },
    })

    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
    }

    // Check permissions
    if (user.role !== 'ADMIN' && user.role !== 'HUB_STAFF' && deposit.depositorUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ data: deposit }, { status: 200 })
  } catch (error: any) {
    console.error('[GET /api/vault/deposits/[id]] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

