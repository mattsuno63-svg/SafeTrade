import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import QRCode from 'qrcode'

/**
 * GET /api/vault/cases/[id]/qr-batch
 * Genera QR codes per tutti gli slot di una teca (per stampa etichette)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole('ADMIN')
    const { id: caseId } = params

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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Generate QR codes for all slots
    const qrCodes = await Promise.all(
      case_.slots.map(async (slot) => {
        if (!slot.qrToken) {
          return null
        }

        const qrPayload = {
          type: 'VAULT_SLOT',
          slotId: slot.id,
          slotCode: slot.slotCode,
          caseId: slot.caseId,
          qrToken: slot.qrToken,
          scanUrl: `${baseUrl}/scan/${slot.qrToken}`,
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
          qrToken: slot.qrToken,
          qrData,
          status: slot.status,
        }
      })
    )

    return NextResponse.json({
      caseId: case_.id,
      caseLabel: case_.label,
      qrCodes: qrCodes.filter((qr) => qr !== null),
    })
  } catch (error: any) {
    console.error('Error generating batch QR codes:', error)
    return NextResponse.json(
      { error: error.message || 'Errore generazione QR codes' },
      { status: 500 }
    )
  }
}

