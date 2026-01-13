import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    if (!token) {
      return NextResponse.json({ error: 'Token mancante' }, { status: 400 })
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

