import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { SafeTradeStatus, HubPackageStatus } from '@prisma/client'

/**
 * POST /api/admin/hub/packages/[id]/start-verification
 * Hub Staff avvia verifica pacco
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = await Promise.resolve(params)

    // SECURITY: Only HUB_STAFF and ADMIN can start verification
    if (user.role !== 'HUB_STAFF' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo HUB_STAFF e ADMIN possono avviare la verifica' },
        { status: 403 }
      )
    }

    // Get transaction
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // SECURITY: Verify escrowType is VERIFIED
    if (transaction.escrowType !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'Questa transazione non è Verified Escrow' },
        { status: 400 }
      )
    }

    // SECURITY: Verify status is correct
    if (transaction.status !== SafeTradeStatus.HUB_RECEIVED) {
      return NextResponse.json(
        { error: `Stato transazione non valido. Stato attuale: ${transaction.status}. Stato richiesto: HUB_RECEIVED` },
        { status: 400 }
      )
    }

    // SECURITY: Verify packageStatus is correct
    if (transaction.packageStatus !== HubPackageStatus.RECEIVED_AT_HUB) {
      return NextResponse.json(
        { error: `Stato pacco non valido. Stato attuale: ${transaction.packageStatus}` },
        { status: 400 }
      )
    }

    // Update transaction
    const updatedTransaction = await prisma.safeTradeTransaction.update({
      where: { id },
      data: {
        packageStatus: HubPackageStatus.VERIFICATION_IN_PROGRESS,
        status: SafeTradeStatus.VERIFICATION_IN_PROGRESS,
      },
    })

    if (process.env.NODE_ENV === 'development') console.log(`[VERIFIED_ESCROW] Verification started by ${user.role} ${user.id} for transaction ${id}`)

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
    })
  } catch (error: any) {
    console.error('Error starting verification:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}


