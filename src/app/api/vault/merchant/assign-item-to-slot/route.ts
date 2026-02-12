import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { canTransitionItemStatus } from '@/lib/vault/state-machine'
import { assignItemToSlotAtomic } from '@/lib/vault/transactions'
import { z } from 'zod'

/**
 * POST /api/vault/merchant/assign-item-to-slot
 * Assegna una carta a uno slot scansionato (con validazioni complete)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Get merchant's shop
    const shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
      include: {
        vaultCase: true, // Include teca autorizzata
      },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    if (!shop.vaultCaseAuthorized) {
      return NextResponse.json(
        { error: 'Il tuo negozio non è autorizzato ad utilizzare le teche Vault' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const schema = z.object({
      itemId: z.string(),
      slotId: z.string(),
    })

    const { itemId, slotId } = schema.parse(body)

    // Get item
    const item = await prisma.vaultItem.findUnique({
      where: { id: itemId },
      include: {
        slot: true,
        case: true,
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Validazione 1: Item deve essere assegnato a questo shop
    if (item.shopIdCurrent !== shop.id) {
      return NextResponse.json(
        { error: 'La carta non è assegnata al tuo negozio' },
        { status: 403 }
      )
    }

    // Validazione 2: Item deve essere in stato ASSIGNED_TO_SHOP
    if (item.status !== 'ASSIGNED_TO_SHOP') {
      return NextResponse.json(
        { error: `La carta non può essere assegnata. Stato corrente: ${item.status}` },
        { status: 400 }
      )
    }

    // Validazione 3: Item non deve già essere in uno slot
    if (item.slotId) {
      return NextResponse.json(
        { error: 'La carta è già assegnata a uno slot' },
        { status: 400 }
      )
    }

    // Get slot
    const slot = await prisma.vaultCaseSlot.findUnique({
      where: { id: slotId },
      include: {
        case: true,
        item: true,
      },
    })

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    }

    // Validazione 4: Slot deve appartenere alla teca autorizzata del negozio
    if (slot.case.authorizedShopId !== shop.id) {
      return NextResponse.json(
        { error: 'Lo slot non appartiene alla tua teca autorizzata' },
        { status: 403 }
      )
    }

    // Validazione 5: Slot deve essere libero
    if (slot.status !== 'FREE') {
      return NextResponse.json(
        { error: 'Lo slot è già occupato' },
        { status: 400 }
      )
    }

    // Validazione 6: Verifica transizione stato (pre-check, ma verrà ricontrollato nella transazione)
    const transition = canTransitionItemStatus(item.status, 'IN_CASE')
    if (!transition.valid) {
      return NextResponse.json(
        { error: transition.reason },
        { status: 400 }
      )
    }

    // Tutte le validazioni preliminari passate - procedi con assegnazione atomica
    // Le validazioni critiche vengono rifatte dentro la transazione con lock pessimistico
    const result = await prisma.$transaction(async (tx) => {
      try {
        return await assignItemToSlotAtomic(tx, {
          itemId,
          slotId,
          shopId: shop.id,
        })
      } catch (error: any) {
        // Rilancia l'errore per gestirlo fuori dalla transazione
        throw error
      }
    })

    // Audit log
    await createVaultAuditLog({
      actionType: 'ITEM_MOVED_TO_SLOT',
      performedBy: user,
      itemId: itemId,
      caseId: slot.caseId,
      slotId: slotId,
      oldValue: { status: item.status, slotId: null },
      newValue: { status: 'IN_CASE', slotId: slotId },
      notes: `Assegnazione tramite scansione QR - Slot ${slot.slotCode}`,
    })

    return NextResponse.json({
      data: {
        item: result.item,
        slot: {
          id: result.slot.id,
          slotCode: slot.slotCode,
          status: 'OCCUPIED',
        },
      },
    }, { status: 200 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[POST /api/vault/merchant/assign-item-to-slot] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

