import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SafeTradeStatus } from '@prisma/client'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Verify authentication
    const user = await requireAuth()

    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
        proposal: {
          select: {
            id: true,
            type: true,
            offerPrice: true,
            tradeItems: true,
            listing: {
              select: {
                id: true,
                title: true,
                images: true,
                price: true,
              },
            },
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this transaction
    if (transaction.userAId !== user.id && transaction.userBId !== user.id) {
      // Check if user owns the shop
      if (transaction.shopId) {
        const shop = await prisma.shop.findUnique({
          where: { id: transaction.shopId },
        })
        if (shop?.merchantId !== user.id) {
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(transaction)
  } catch (error: any) {
    console.error('Error fetching transaction:', error)
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { status, notes } = body

    // Verify authentication
    const { requireAuth } = await import('@/lib/auth')
    const user = await requireAuth()

    // Get transaction with proposal
    const existingTransaction = await prisma.safeTradeTransaction.findUnique({
      where: { id },
      include: {
        proposal: {
          include: {
            listing: true,
          },
        },
        shop: true,
      },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Verify permissions (merchant or admin)
    const isMerchant = existingTransaction.shop?.merchantId === user.id
    const isAdmin = user.role === 'ADMIN'
    
    if (!isMerchant && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const transaction = await prisma.safeTradeTransaction.update({
      where: { id },
      data: {
        status: status as SafeTradeStatus,
        notes,
      },
      include: {
        userA: true,
        userB: true,
        shop: true,
        proposal: {
          include: {
            listing: true,
          },
        },
      },
    })

    // Se la transazione viene CANCELLATA, rimetti il listing disponibile
    if (status === 'CANCELLED' && transaction.proposal?.listing) {
      await prisma.listingP2P.update({
        where: { id: transaction.proposal.listing.id },
        data: {
          isActive: true,
          isSold: false,
        },
      })
    }

    // Create notifications for both users
    if (status === 'CANCELLED') {
      await prisma.notification.createMany({
        data: [
          {
            userId: transaction.userAId,
            type: 'TRANSACTION_CANCELLED',
            title: 'Transazione Annullata',
            message: `La transazione SafeTrade è stata annullata. ${notes ? `Motivo: ${notes}` : ''}`,
            link: `/dashboard`,
          },
          {
            userId: transaction.userBId,
            type: 'TRANSACTION_CANCELLED',
            title: 'Transazione Annullata',
            message: `La transazione SafeTrade è stata annullata. ${notes ? `Motivo: ${notes}` : ''}`,
            link: `/dashboard`,
          },
        ],
      })
    }

    return NextResponse.json(transaction)
  } catch (error: any) {
    console.error('Error updating transaction:', error)
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

