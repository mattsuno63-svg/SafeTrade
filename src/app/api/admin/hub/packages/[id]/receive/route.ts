import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { SafeTradeStatus, HubPackageStatus } from '@prisma/client'

/**
 * POST /api/admin/hub/packages/[id]/receive
 * Hub Staff marca pacco come ricevuto
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = await Promise.resolve(params)

    // SECURITY: Only HUB_STAFF and ADMIN can receive packages
    if (user.role !== 'HUB_STAFF' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo HUB_STAFF e ADMIN possono marcare pacchi come ricevuti' },
        { status: 403 }
      )
    }

    // Get transaction
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id },
      include: {
        userA: { select: { id: true, name: true, email: true } },
        userB: { select: { id: true, name: true, email: true } },
      },
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
    if (transaction.status !== SafeTradeStatus.AWAITING_HUB_RECEIPT) {
      return NextResponse.json(
        { error: `Stato transazione non valido. Stato attuale: ${transaction.status}. Stato richiesto: AWAITING_HUB_RECEIPT` },
        { status: 400 }
      )
    }

    // SECURITY: Verify packageStatus is correct
    if (transaction.packageStatus !== HubPackageStatus.IN_TRANSIT_TO_HUB) {
      return NextResponse.json(
        { error: `Stato pacco non valido. Stato attuale: ${transaction.packageStatus}. Stato richiesto: IN_TRANSIT_TO_HUB` },
        { status: 400 }
      )
    }

    // Update transaction
    const now = new Date()
    const updatedTransaction = await prisma.safeTradeTransaction.update({
      where: { id },
      data: {
        packageStatus: HubPackageStatus.RECEIVED_AT_HUB,
        status: SafeTradeStatus.HUB_RECEIVED,
        packageReceivedAt: now,
      },
    })

    // Create notifications
    await Promise.all([
      // Seller notification
      prisma.notification.create({
        data: {
          userId: transaction.userBId,
          type: 'TRANSACTION_UPDATED',
          title: '📦 Pacco Ricevuto all\'Hub',
          message: `Il tuo pacco è stato ricevuto all'hub SafeTrade. La verifica inizierà a breve.`,
          link: `/transaction/${id}/status`,
        },
      }),
      // Buyer notification
      prisma.notification.create({
        data: {
          userId: transaction.userAId,
          type: 'TRANSACTION_UPDATED',
          title: '📦 Pacco Ricevuto',
          message: `Il pacco è stato ricevuto all'hub SafeTrade. Il nostro team sta verificando la carta.`,
          link: `/transaction/${id}/status`,
        },
      }),
    ])

    // Log action
    console.log(`[VERIFIED_ESCROW] Package received by ${user.role} ${user.id} for transaction ${id}`)

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
    })
  } catch (error: any) {
    console.error('Error receiving package:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}


