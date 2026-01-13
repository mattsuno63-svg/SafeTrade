import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import QRCode from 'qrcode'

/**
 * GET /api/vault/cases/[id]/slots/[slotId]/qr
 * Genera il QR code image per uno slot specifico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; slotId: string } }
) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: caseId, slotId } = params

    // Fetch slot
    const slot = await prisma.vaultCaseSlot.findUnique({
      where: { id: slotId },
      include: {
        case: {
          include: {
            authorizedShop: {
              select: {
                id: true,
                name: true,
                merchantId: true,
              },
            },
          },
        },
      },
    })

    if (!slot) {
      return NextResponse.json({ error: 'Slot non trovato' }, { status: 404 })
    }

    if (slot.caseId !== caseId) {
      return NextResponse.json({ error: 'Slot non appartiene a questa teca' }, { status: 400 })
    }

    // Check permissions
    // Admin/HUB_STAFF can see all
    // Merchant can see slots from their authorized cases
    if (user.role !== 'ADMIN' && user.role !== 'HUB_STAFF') {
      if (slot.case.authorizedShopId) {
        const shop = slot.case.authorizedShop
        if (shop?.merchantId !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (!slot.qrToken) {
      return NextResponse.json(
        { error: 'QR token non generato per questo slot' },
        { status: 400 }
      )
    }

    // Create QR payload
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const qrPayload = {
      type: 'VAULT_SLOT',
      slotId: slot.id,
      slotCode: slot.slotCode,
      caseId: slot.caseId,
      qrToken: slot.qrToken,
      scanUrl: `${baseUrl}/scan/${slot.qrToken}`,
    }

    // Get format (default: dataURL)
    const format = request.nextUrl.searchParams.get('format') || 'dataURL'

    if (format === 'svg') {
      const qrData = await QRCode.toString(JSON.stringify(qrPayload), {
        type: 'svg',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
      return new NextResponse(qrData, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    } else {
      const qrData = await QRCode.toDataURL(JSON.stringify(qrPayload), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })

      return NextResponse.json({
        qrData,
        qrToken: slot.qrToken,
        slotCode: slot.slotCode,
        caseId: slot.caseId,
        scanUrl: qrPayload.scanUrl,
      })
    }
  } catch (error: any) {
    console.error('Error generating slot QR code:', error)
    return NextResponse.json(
      { error: error.message || 'Errore generazione QR code' },
      { status: 500 }
    )
  }
}

