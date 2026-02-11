import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// ID admin fisso (tu)
const ADMIN_EMAIL = 'portelli.mattiaa@gmail.com'

/**
 * GET /api/admin/hub
 * Ottieni l'Hub dell'admin (crea automaticamente se non esiste)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    // Solo admin può accedere
    if (user.role !== 'ADMIN' && user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Accesso negato. Solo Admin.' },
        { status: 403 }
      )
    }

    // Cerca l'hub dell'admin
    let hub = await prisma.escrowHub.findUnique({
      where: { providerId: user.id },
      include: {
        _count: {
          select: {
            transactions: true,
            reviews: true,
          },
        },
        transactions: {
          where: {
            packageStatus: {
              in: ['PENDING', 'IN_TRANSIT_TO_HUB', 'RECEIVED_AT_HUB', 'VERIFICATION_IN_PROGRESS', 'VERIFICATION_PASSED'],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            userA: {
              select: { id: true, name: true, email: true },
            },
            userB: {
              select: { id: true, name: true, email: true },
            },
            escrowPayment: true,
          },
        },
      },
    })

    // Se non esiste, crealo automaticamente
    if (!hub) {
      hub = await prisma.escrowHub.create({
        data: {
          providerId: user.id,
          name: 'SafeTrade Hub Centrale',
          description: 'Hub escrow ufficiale di SafeTrade. Gestito direttamente dal team.',
          address: 'Via SafeTrade 1',
          city: 'Italia',
          province: null,
          postalCode: null,
          country: 'IT',
          phone: null,
          email: user.email,
          serviceFee: 0, // Nessuna fee per l'hub admin
          maxPackageValue: null, // Nessun limite
          acceptedCountries: ['IT'], // Solo Italia
          isActive: true,
          isApproved: true, // Già approvato
          isVerified: true, // Già verificato
          isAvailable: true,
        },
        include: {
          _count: {
            select: {
              transactions: true,
              reviews: true,
            },
          },
          transactions: {
            where: {
              packageStatus: {
                in: ['PENDING', 'IN_TRANSIT_TO_HUB', 'RECEIVED_AT_HUB', 'VERIFICATION_IN_PROGRESS', 'VERIFICATION_PASSED'],
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              userA: {
                select: { id: true, name: true, email: true },
              },
              userB: {
                select: { id: true, name: true, email: true },
              },
              escrowPayment: true,
            },
          },
        },
      })
    }

    // Statistiche aggiuntive
    const stats = await prisma.safeTradeTransaction.groupBy({
      by: ['packageStatus'],
      where: { hubId: hub.id },
      _count: { id: true },
    })

    const statsMap = stats.reduce((acc, s) => {
      if (s.packageStatus) {
        acc[s.packageStatus] = s._count.id
      }
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      hub,
      stats: {
        pending: statsMap['PENDING'] || 0,
        inTransit: statsMap['IN_TRANSIT_TO_HUB'] || 0,
        received: statsMap['RECEIVED_AT_HUB'] || 0,
        verified: statsMap['VERIFICATION_PASSED'] || 0,
        shipped: statsMap['SHIPPED_TO_BUYER'] || 0,
        delivered: statsMap['DELIVERED_TO_BUYER'] || 0,
        total: hub._count.transactions,
        reviews: hub._count.reviews,
      },
    })
  } catch (error) {
    console.error('Error fetching admin hub:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dell\'hub' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/hub
 * Aggiorna l'Hub dell'admin
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Accesso negato. Solo Admin.' },
        { status: 403 }
      )
    }

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

    // Verifica hub esistente
    const existingHub = await prisma.escrowHub.findUnique({
      where: { providerId: user.id },
    })

    if (!existingHub) {
      return NextResponse.json(
        { error: 'Hub non trovato. Usa GET per crearlo automaticamente.' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
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
    })

    return NextResponse.json(updatedHub)
  } catch (error) {
    console.error('Error updating admin hub:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento dell\'hub' },
      { status: 500 }
    )
  }
}

