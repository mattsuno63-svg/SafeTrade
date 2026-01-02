import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SafeTradeStatus } from '@prisma/client'
import { requireAuth, requireRole } from '@/lib/auth'

/**
 * POST /api/transactions/[id]/checkin
 * Check-in at store (scan QR code)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { qrCodeData } = body

    // Verify authentication
    const user = await requireAuth()

    // Parse QR code data
    let qrData: any
    try {
      qrData = JSON.parse(qrCodeData)
    } catch {
      return NextResponse.json(
        { error: 'Invalid QR code format' },
        { status: 400 }
      )
    }

    // Verify QR code is for this transaction
    if (qrData.type !== 'safetrade' || qrData.transactionId !== id) {
      return NextResponse.json(
        { error: 'Invalid QR code for this transaction' },
        { status: 400 }
      )
    }

    // Get transaction
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id },
      include: {
        shop: true,
        userA: true,
        userB: true,
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Verify user is part of this transaction
    if (transaction.userAId !== user.id && transaction.userBId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You are not part of this transaction' },
        { status: 403 }
      )
    }

    // Verify transaction is in correct status
    if (transaction.status !== SafeTradeStatus.PENDING && transaction.status !== SafeTradeStatus.CONFIRMED) {
      return NextResponse.json(
        { error: 'Transaction cannot be checked in at this stage' },
        { status: 400 }
      )
    }

    // Update transaction status to CONFIRMED (user arrived at store)
    const updatedTransaction = await prisma.safeTradeTransaction.update({
      where: { id },
      data: {
        status: SafeTradeStatus.CONFIRMED,
        checkedInAt: new Date(),
      },
      include: {
        shop: true,
        userA: true,
        userB: true,
      },
    })

    // Create notification for shop (VLS)
    if (transaction.shopId) {
      const shop = await prisma.shop.findUnique({
        where: { id: transaction.shopId },
        include: { merchant: true },
      })

      if (shop?.merchantId) {
        await prisma.notification.create({
          data: {
            userId: shop.merchantId,
            type: 'TRANSACTION_CHECKIN',
            title: 'Customer Checked In',
            message: `${user.name || user.email} has checked in for transaction #${id}`,
            link: `/dashboard/vls/verify/${id}`,
          },
        })
      }
    }

    // Create notification for other user
    const otherUserId = transaction.userAId === user.id ? transaction.userBId : transaction.userAId
    await prisma.notification.create({
      data: {
        userId: otherUserId,
        type: 'TRANSACTION_CHECKIN',
        title: 'Transaction Update',
        message: `The other party has checked in at the store.`,
        link: `/transaction/${id}/status`,
      },
    })

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
    })
  } catch (error: any) {
    console.error('Error checking in:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

