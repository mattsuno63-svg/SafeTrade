import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { parseSlotQRToken } from '@/lib/vault/qr-generator'
import { z } from 'zod'
import { handleApiError } from '@/lib/api-error'

/**
 * POST /api/vault/merchant/scan-slot
 * Scansiona QR slot e restituisce info slot + lista carte disponibili per assegnazione
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Get merchant's shop
    const shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    if (!shop.vaultCaseAuthorized) {
      return NextResponse.json(
        { error: 'Il tuo negozio non è autorizzato ad utilizzare le teche Vault. Contatta l\'amministratore.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const schema = z.object({
      qrToken: z.string(),
    })

    const { qrToken } = schema.parse(body)

    // Parse QR token
    const parsed = parseSlotQRToken(qrToken)
    if (!parsed) {
      return NextResponse.json(
        { error: 'QR token non valido' },
        { status: 400 }
      )
    }

    // Get slot
    const slot = await prisma.vaultCaseSlot.findFirst({
      where: {
        qrToken,
        case: {
          authorizedShopId: shop.id, // Verifica che la teca sia autorizzata per questo negozio
        },
      },
      include: {
        case: {
          select: {
            id: true,
            label: true,
            shopId: true,
            authorizedShopId: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            game: true,
            set: true,
            status: true,
            priceFinal: true,
            photos: true,
            owner: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    if (!slot) {
      return NextResponse.json(
        { error: 'Slot non trovato o non appartiene al tuo negozio' },
        { status: 404 }
      )
    }

    // Verifica che la teca sia autorizzata per questo shop
    if (slot.case.authorizedShopId !== shop.id || !shop.vaultCaseAuthorized) {
      return NextResponse.json(
        { error: 'Teca non autorizzata per questo negozio' },
        { status: 403 }
      )
    }

    // Get carte disponibili per assegnazione (ASSIGNED_TO_SHOP ma non ancora IN_CASE)
    const availableItems = await prisma.vaultItem.findMany({
      where: {
        shopIdCurrent: shop.id,
        status: 'ASSIGNED_TO_SHOP', // Solo carte assegnate ma non ancora in teca
        slotId: null, // Non già in uno slot
      },
      include: {
        owner: {
          select: { id: true, name: true },
        },
        deposit: {
          select: {
            id: true,
            depositor: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      data: {
        slot: {
          id: slot.id,
          slotCode: slot.slotCode,
          status: slot.status,
          case: slot.case,
          item: slot.item,
        },
        availableItems: availableItems.map((item) => ({
          id: item.id,
          name: item.name,
          game: item.game,
          set: item.set,
          conditionDeclared: item.conditionDeclared,
          conditionVerified: item.conditionVerified,
          priceFinal: item.priceFinal,
          owner: item.owner,
          deposit: item.deposit,
          createdAt: item.createdAt,
        })),
      },
    }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[POST /api/vault/merchant/scan-slot] Error:', error)
    return handleApiError(error, 'vault-merchant-scan-slot')
  }
}

