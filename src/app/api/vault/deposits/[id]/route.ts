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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = 'then' in params ? await params : params
    const { id } = resolvedParams

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

/**
 * PATCH /api/vault/deposits/[id]
 * Update deposit (only if CREATED status)
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

    // Only allow editing if status is CREATED
    if (deposit.status !== 'CREATED') {
      return NextResponse.json(
        { error: 'Deposit can only be edited when status is CREATED' },
        { status: 400 }
      )
    }

    // Update deposit
    const updatedDeposit = await prisma.vaultDeposit.update({
      where: { id },
      data: {
        notes: body.notes !== undefined ? body.notes : deposit.notes,
        trackingIn: body.trackingIn !== undefined ? body.trackingIn : deposit.trackingIn,
      },
      include: {
        items: true,
        _count: { select: { items: true } },
      },
    })

    // Audit log
    await createVaultAuditLog({
      actionType: 'DEPOSIT_UPDATED',
      performedBy: user,
      depositId: deposit.id,
      oldValue: { notes: deposit.notes, trackingIn: deposit.trackingIn },
      newValue: { notes: updatedDeposit.notes, trackingIn: updatedDeposit.trackingIn },
    }).catch(console.error)

    return NextResponse.json({ data: updatedDeposit }, { status: 200 })
  } catch (error: any) {
    console.error('[PATCH /api/vault/deposits/[id]] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/vault/deposits/[id]
 * Delete deposit (only if CREATED status)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = 'then' in params ? await params : params
    const { id } = resolvedParams

    const deposit = await prisma.vaultDeposit.findUnique({
      where: { id },
      include: {
        items: true,
      },
    })

    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
    }

    // Check permissions
    if (deposit.depositorUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only allow deletion if status is CREATED
    if (deposit.status !== 'CREATED') {
      return NextResponse.json(
        { error: 'Deposit can only be deleted when status is CREATED' },
        { status: 400 }
      )
    }

    // Delete deposit (cascade will delete items)
    await prisma.vaultDeposit.delete({
      where: { id },
    })

    // Audit log
    await createVaultAuditLog({
      actionType: 'DEPOSIT_DELETED',
      performedBy: user,
      depositId: id,
      oldValue: { itemCount: deposit.items.length },
    }).catch(console.error)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('[DELETE /api/vault/deposits/[id]] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

