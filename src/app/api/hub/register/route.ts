import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/hub/register
 * Registra un nuovo Escrow Hub Provider
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const {
      name,
      description,
      address,
      city,
      province,
      postalCode,
      country = 'IT',
      phone,
      email,
      serviceFee = 5.0,
      maxPackageValue,
      acceptedCountries = [],
    } = body

    // Validate required fields
    if (!name || !address || !city || !country) {
      return NextResponse.json(
        { error: 'Name, address, city, and country are required' },
        { status: 400 }
      )
    }

    // Check if user already has a hub
    const existingHub = await prisma.escrowHub.findUnique({
      where: { providerId: user.id },
    })

    if (existingHub) {
      return NextResponse.json(
        { error: 'You already have an Escrow Hub. Use /api/hub/my to update it.' },
        { status: 400 }
      )
    }

    // Create hub
    const hub = await prisma.escrowHub.create({
      data: {
        providerId: user.id,
        name,
        description: description || null,
        address,
        city,
        province: province || null,
        postalCode: postalCode || null,
        country,
        phone: phone || null,
        email: email || null,
        serviceFee: parseFloat(serviceFee) || 5.0,
        maxPackageValue: maxPackageValue ? parseFloat(maxPackageValue) : null,
        acceptedCountries: acceptedCountries || [],
        isActive: true,
        isApproved: false, // Requires admin approval
        isVerified: false,
        isAvailable: true,
      },
    })

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    })

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'NEW_HUB_APPLICATION',
          title: 'New Escrow Hub Application',
          message: `${name} has applied to become an Escrow Hub Provider.`,
          link: '/admin/hubs', // TODO: Create admin hubs page
        },
      })
    }

    return NextResponse.json(hub, { status: 201 })
  } catch (error: any) {
    console.error('Error creating hub:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


