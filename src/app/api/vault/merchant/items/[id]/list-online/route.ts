import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { canListOnline, canTransitionItemStatus } from '@/lib/vault/state-machine'
import { handleApiError } from '@/lib/api-error'

/**
 * POST /api/vault/merchant/items/[id]/list-online
 * List item online - MERCHANT only. Creates ListingP2P for marketplace visibility.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = 'then' in params ? await params : params
    const { id: itemId } = resolvedParams

    // Get merchant's shop
    const shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Get item with slot verification
    const item = await prisma.vaultItem.findUnique({
      where: { id: itemId },
      include: {
        slot: {
          include: {
            case: true,
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (item.shopIdCurrent !== shop.id) {
      return NextResponse.json(
        { error: 'Item is not assigned to your shop' },
        { status: 403 }
      )
    }

    // Validazione: Item deve essere nella teca (IN_CASE) per essere listato online
    if (item.status !== 'IN_CASE') {
      return NextResponse.json(
        { error: `La carta deve essere nella teca per essere listata online. Stato corrente: ${item.status}` },
        { status: 400 }
      )
    }

    // Validazione: Verifica che la carta sia nella teca autorizzata del negozio
    if (!item.slotId || !item.slot || item.slot.case.authorizedShopId !== shop.id) {
      return NextResponse.json(
        { error: 'La carta non è nella tua teca autorizzata' },
        { status: 403 }
      )
    }

    // Check if can list online
    if (!canListOnline(item.status)) {
      return NextResponse.json(
        { error: `Item cannot be listed online. Current status: ${item.status}` },
        { status: 400 }
      )
    }

    // Validate transition
    const transition = canTransitionItemStatus(item.status, 'LISTED_ONLINE')
    if (!transition.valid) {
      return NextResponse.json(
        { error: transition.reason },
        { status: 400 }
      )
    }

    const price = item.priceFinal ?? 0
    if (price <= 0) {
      return NextResponse.json(
        { error: 'La carta deve avere un prezzo (priceFinal) per essere listata online' },
        { status: 400 }
      )
    }

    if (!item.photos || item.photos.length === 0) {
      return NextResponse.json(
        { error: 'La carta deve avere almeno una foto per essere listata online' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const listing = await tx.listingP2P.create({
        data: {
          title: item.name,
          description: `${item.game}${item.set ? ` - ${item.set}` : ''}`,
          type: 'SALE',
          price,
          condition: item.conditionVerified ?? item.conditionDeclared,
          game: item.game,
          set: item.set,
          images: item.photos,
          userId: item.ownerUserId,
          isVaultListing: true,
          vaultItemId: itemId,
          isApproved: true,
          isActive: true,
        },
      })

      const updated = await tx.vaultItem.update({
        where: { id: itemId },
        data: { status: 'LISTED_ONLINE', listingId: listing.id },
      })

      return { listing, updated }
    })

    await createVaultAuditLog({
      actionType: 'ITEM_LISTED_ONLINE',
      performedBy: user,
      itemId: itemId,
      oldValue: { status: item.status },
      newValue: { status: 'LISTED_ONLINE' },
    })

    return NextResponse.json({ data: result.updated, listingId: result.listing.id }, { status: 200 })
  } catch (error) {
    console.error('[POST /api/vault/merchant/items/[id]/list-online] Error:', error)
    return handleApiError(error, 'vault-merchant-items-id-list-online')
  }
}

