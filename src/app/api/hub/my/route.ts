import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/hub/my
 * Ottieni il mio Escrow Hub
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const hub = await prisma.escrowHub.findUnique({
      where: { providerId: user.id },
      include: {
        _count: {
          select: {
            transactions: true,
            reviews: true,
          },
        },
      },
    })

    if (!hub) {
      return NextResponse.json(
        { error: 'Hub not found. Register first at /api/hub/register' },
        { status: 404 }
      )
    }

    return NextResponse.json(hub)
  } catch (error: any) {
    console.error('Error fetching hub:', error)
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

/**
 * PATCH /api/hub/my
 * Aggiorna il mio Escrow Hub
 */
export async function PATCH(request: NextRequest) {
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
      country,
      phone,
      email,
      serviceFee,
      maxPackageValue,
      acceptedCountries,
      isActive,
      isAvailable,
    } = body

    // Check if hub exists
    const existingHub = await prisma.escrowHub.findUnique({
      where: { providerId: user.id },
    })

    if (!existingHub) {
      return NextResponse.json(
        { error: 'Hub not found. Register first at /api/hub/register' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (province !== undefined) updateData.province = province
    if (postalCode !== undefined) updateData.postalCode = postalCode
    if (country !== undefined) updateData.country = country
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (serviceFee !== undefined) updateData.serviceFee = parseFloat(serviceFee)
    if (maxPackageValue !== undefined) updateData.maxPackageValue = maxPackageValue ? parseFloat(maxPackageValue) : null
    if (acceptedCountries !== undefined) updateData.acceptedCountries = acceptedCountries
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (typeof isAvailable === 'boolean') updateData.isAvailable = isAvailable

    const updatedHub = await prisma.escrowHub.update({
      where: { providerId: user.id },
      data: updateData,
      include: {
        _count: {
          select: {
            transactions: true,
            reviews: true,
          },
        },
      },
    })

    return NextResponse.json(updatedHub)
  } catch (error: any) {
    console.error('Error updating hub:', error)
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

