import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import QRCode from 'qrcode'
import { handleApiError } from '@/lib/api-error'
import { generateSlotQRToken } from '@/lib/vault/qr-generator'

export const dynamic = 'force-dynamic'

/**
 * GET /api/vault/cases/[id]/qr-batch
 * Genera QR codes per tutti i 30 slot della teca (per stampa etichette).
 * Genera qrToken on-the-fly per slot che non ce l'hanno.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { requireAuth } = await import('@/lib/auth')
    const user = await requireAuth()
    const resolvedParams = 'then' in params ? await params : params
    const { id: caseId } = resolvedParams

    // Fetch case with all slots
    const case_ = await prisma.vaultCase.findUnique({
      where: { id: caseId },
      include: {
        slots: {
          orderBy: { slotCode: 'asc' },
        },
      },
    })

    if (!case_) {
      return NextResponse.json({ error: 'Teca non trovata' }, { status: 404 })
    }

    // Check permissions: ADMIN/HUB_STAFF can access all, MERCHANT can access their authorized case
    if (user.role !== 'ADMIN' && user.role !== 'HUB_STAFF') {
      if (case_.authorizedShopId) {
        const shop = await prisma.shop.findUnique({
          where: { id: case_.authorizedShopId },
        })
        if (shop?.merchantId !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Ensure all 30 slots have qrToken; generate and persist if missing
    for (const slot of case_.slots) {
      if (!slot.qrToken) {
        const qrToken = generateSlotQRToken(caseId, slot.slotCode)
        await prisma.vaultCaseSlot.update({
          where: { id: slot.id },
          data: { qrToken },
        })
        ;(slot as { qrToken: string }).qrToken = qrToken
      }
    }

    // Generate QR codes for all 30 slots
    const qrCodes = await Promise.all(
      case_.slots.map(async (slot) => {
        const token = slot.qrToken!
        const qrPayload = {
          type: 'VAULT_SLOT',
          slotId: slot.id,
          slotCode: slot.slotCode,
          caseId: slot.caseId,
          qrToken: token,
          scanUrl: `${baseUrl}/scan/${token}`,
        }

        const qrData = await QRCode.toDataURL(JSON.stringify(qrPayload), {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        })

        return {
          slotId: slot.id,
          slotCode: slot.slotCode,
          qrToken: token,
          qrData,
          status: slot.status,
        }
      })
    )

    return NextResponse.json({
      caseId: case_.id,
      caseLabel: case_.label,
      qrCodes,
    })
  } catch (error) {
    console.error('Error generating batch QR codes:', error)
    return handleApiError(error, 'vault-cases-id-qr-batch')
  }
}

