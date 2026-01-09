import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    // Get merchant's shop (or create one for admin if needed)
    let shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    // If admin doesn't have a shop, create one automatically
    if (!shop && dbUser?.role === 'ADMIN') {
      shop = await prisma.shop.upsert({
        where: { merchantId: user.id },
        update: {},
        create: {
          name: 'Admin Shop',
          description: 'Shop for admin tournament management',
          merchantId: user.id,
          isApproved: true,
        },
      })
    }

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found. Please set up your shop first.' },
        { status: 404 }
      )
    }

    // Admin can see all tournaments, merchants only their own
    const whereClause = dbUser?.role === 'ADMIN' 
      ? {} 
      : { shopId: shop.id }

    const tournaments = await prisma.tournament.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            registrations: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json(tournaments)
  } catch (error: any) {
    console.error('Error fetching tournaments:', error)
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

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    // Get merchant's shop (or create one for admin if needed)
    let shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    // If admin doesn't have a shop, create one automatically
    if (!shop && dbUser?.role === 'ADMIN') {
      shop = await prisma.shop.upsert({
        where: { merchantId: user.id },
        update: {},
        create: {
          name: 'Admin Shop',
          description: 'Shop for admin tournament management',
          merchantId: user.id,
          isApproved: true,
        },
      })
    }

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found. Please set up your shop first.' },
        { status: 404 }
      )
    }

    const {
      title,
      description,
      game,
      date,
      time,
      maxParticipants,
      entryFee,
      prizePool,
      rules,
      status = 'DRAFT',
    } = body

    if (!title || !game || !date || !time || !maxParticipants) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const tournament = await prisma.tournament.create({
      data: {
        title,
        description,
        game,
        date: new Date(date),
        time,
        maxParticipants: parseInt(maxParticipants),
        entryFee: entryFee ? parseFloat(entryFee) : null,
        prizePool,
        rules,
        status,
        shopId: shop.id,
      },
      include: {
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    })

    return NextResponse.json(tournament, { status: 201 })
  } catch (error: any) {
    console.error('Error creating tournament:', error)
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


