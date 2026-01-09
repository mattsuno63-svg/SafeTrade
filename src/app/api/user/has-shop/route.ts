import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Check if user has an approved shop
    const shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
      select: { id: true, isApproved: true },
    })

    return NextResponse.json({
      hasShop: !!shop && shop.isApproved,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ hasShop: false }, { status: 200 })
    }
    return NextResponse.json({ hasShop: false }, { status: 200 })
  }
}


