import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const resolvedParams = 'then' in params ? await params : params
    const { token } = resolvedParams

    if (!token) {
      return NextResponse.json({ error: 'Token mancante' }, { status: 400 })
    }

    // Validate token format (alphanumeric + hyphens, reasonable length)
    if (token.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(token)) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 400 })
    }

    // Find slot by QR token
    const slot = await prisma.vaultCaseSlot.findUnique({
      where: { qrToken: token },
      include: {
        case: {
          select: {
            id: true,
            label: true,
            status: true,
            authorizedShop: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
                postalCode: true,
                slug: true,
              },
            },
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            game: true,
            set: true,
            priceFinal: true,
            photos: true,
            status: true,
          },
        },
      },
    })

    if (!slot) {
      return NextResponse.json({ error: 'Slot non trovato' }, { status: 404 })
    }

    // Public endpoint - return basic info only
    return NextResponse.json({
      data: {
        id: slot.id,
        slotCode: slot.slotCode,
        case: slot.case,
        item: slot.item,
        shop: slot.case.authorizedShop, // Shop info for display
      },
    })
  } catch (error: any) {
    console.error('Error fetching public slot info:', error)
    return NextResponse.json(
      { error: 'Errore nel caricamento dello slot' },
      { status: 500 }
    )
  }
}

