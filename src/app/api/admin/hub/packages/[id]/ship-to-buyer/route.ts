import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { SafeTradeStatus, HubPackageStatus } from '@prisma/client'

/**
 * POST /api/admin/hub/packages/[id]/ship-to-buyer
 * Hub Staff rispedisce pacco a buyer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = await Promise.resolve(params)
    const body = await request.json()
    const { returnTrackingNumber } = body

    // SECURITY: Only HUB_STAFF and ADMIN can ship to buyer
    if (user.role !== 'HUB_STAFF' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo HUB_STAFF e ADMIN possono rispedire i pacchi' },
        { status: 403 }
      )
    }

    // SECURITY: Validate return tracking number
    if (!returnTrackingNumber || typeof returnTrackingNumber !== 'string' || returnTrackingNumber.trim().length === 0) {
      return NextResponse.json(
        { error: 'Return tracking number richiesto' },
        { status: 400 }
      )
    }

    // SECURITY: Validate tracking format
    const trackingPattern = /^[A-Z0-9]{8,20}$/i
    if (!trackingPattern.test(returnTrackingNumber.trim())) {
      return NextResponse.json(
        { error: 'Formato return tracking number non valido' },
        { status: 400 }
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

    // SECURITY: Verify status is VERIFICATION_PASSED
    if (transaction.status !== SafeTradeStatus.VERIFICATION_PASSED) {
      return NextResponse.json(
        { error: `Stato transazione non valido. Stato attuale: ${transaction.status}. Stato richiesto: VERIFICATION_PASSED` },
        { status: 400 }
      )
    }

    // SECURITY: Verify packageStatus is VERIFICATION_PASSED
    if (transaction.packageStatus !== HubPackageStatus.VERIFICATION_PASSED) {
      return NextResponse.json(
        { error: `Stato pacco non valido. Stato attuale: ${transaction.packageStatus}` },
        { status: 400 }
      )
    }

    // Update transaction
    const now = new Date()
    const updatedTransaction = await prisma.safeTradeTransaction.update({
      where: { id },
      data: {
        returnTrackingNumber: returnTrackingNumber.trim(),
        packageStatus: HubPackageStatus.SHIPPED_TO_BUYER,
        status: SafeTradeStatus.SHIPPED_TO_BUYER,
        packageShippedAt: now,
      },
    })

    // Create notifications
    await Promise.all([
      prisma.notification.create({
        data: {
          userId: transaction.userAId, // Buyer
          type: 'TRANSACTION_UPDATED',
          title: '📦 Pacco Rispedito',
          message: `Il pacco è stato rispedito. Tracking: ${returnTrackingNumber.trim()}. Riceverai la carta a breve!`,
          link: `/transaction/${id}/status`,
        },
      }),
      prisma.notification.create({
        data: {
          userId: transaction.userBId, // Seller
          type: 'TRANSACTION_UPDATED',
          title: '📦 Pacco Rispedito',
          message: `Il pacco è stato rispedito all'acquirente. Tracking: ${returnTrackingNumber.trim()}`,
          link: `/transaction/${id}/status`,
        },
      }),
    ])

    if (process.env.NODE_ENV === 'development') console.log(`[VERIFIED_ESCROW] Package shipped to buyer by ${user.role} ${user.id} for transaction ${id}`)

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
    })
  } catch (error: any) {
    console.error('Error shipping to buyer:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}


