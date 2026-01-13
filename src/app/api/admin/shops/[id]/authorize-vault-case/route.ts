import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { z } from 'zod'
import type { VaultCase } from '@prisma/client'

/**
 * POST /api/admin/shops/[id]/authorize-vault-case
 * Autorizza un negozio ad utilizzare una teca (assegna teca e abilita scansione QR)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole('ADMIN')
    const { id: shopId } = params

    const body = await request.json()
    const schema = z.object({
      caseId: z.string().optional(), // Se non fornito, crea nuova teca
      authorize: z.boolean(), // true = autorizza, false = revoca
    })

    const { caseId, authorize } = schema.parse(body)

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        vaultCase: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    if (!shop.vaultEnabled) {
      return NextResponse.json(
        { error: 'Il negozio non è iscritto al programma Vault' },
        { status: 400 }
      )
    }

    if (authorize) {
      // Autorizza teca
      let targetCase: VaultCase & { slots?: Array<{ id: string; slotCode: string }> }

      if (caseId) {
        // Usa teca esistente
        targetCase = await prisma.vaultCase.findUnique({
          where: { id: caseId },
        })

        if (!targetCase) {
          return NextResponse.json({ error: 'Case not found' }, { status: 404 })
        }

        // Verifica che la teca non sia già assegnata
        if (targetCase.shopId && targetCase.shopId !== shopId) {
          return NextResponse.json(
            { error: 'La teca è già assegnata a un altro negozio' },
            { status: 400 }
          )
        }
      } else {
        // Crea nuova teca con 30 slot
        const { generateSlotQRToken } = await import('@/lib/vault/qr-generator')

        targetCase = await prisma.vaultCase.create({
          data: {
            shopId: shopId,
            status: 'IN_SHOP_ACTIVE',
            label: `Teca ${shop.name}`,
            slots: {
              create: Array.from({ length: 30 }, (_, i) => {
                const slotNum = i + 1
                const slotCode = `S${String(slotNum).padStart(2, '0')}`
                return {
                  slotCode,
                  qrToken: '', // Will be set after
                  status: 'FREE',
                }
              }),
            },
          },
          include: {
            slots: true,
          },
        })

        // Generate QR tokens
        await Promise.all(
          targetCase.slots.map(async (slot) => {
            const qrToken = generateSlotQRToken(targetCase.id, slot.slotCode)
            await prisma.vaultCaseSlot.update({
              where: { id: slot.id },
              data: { qrToken },
            })
          })
        )
      }

      // Update case - set authorized shop and shopId
      await prisma.vaultCase.update({
        where: { id: targetCase.id },
        data: {
          shopId: shopId,
          authorizedShopId: shopId,
          status: 'IN_SHOP_ACTIVE',
        },
      })

      // Update shop
      await prisma.shop.update({
        where: { id: shopId },
        data: {
          vaultCaseAuthorized: true,
        },
      })

      await createVaultAuditLog({
        actionType: 'CASE_CREATED',
        performedBy: user,
        caseId: targetCase.id,
        newValue: { shopId, authorized: true },
        notes: `Teca autorizzata per negozio ${shop.name}`,
      })
    } else {
      // Revoca autorizzazione
      if (shop.vaultCase) {
        await prisma.vaultCase.update({
          where: { id: shop.vaultCase.id },
          data: {
            authorizedShopId: null,
          },
        })
      }

      await prisma.shop.update({
        where: { id: shopId },
        data: {
          vaultCaseAuthorized: false,
        },
      })
    }

    const updatedShop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        vaultCase: {
          include: {
            slots: {
              include: {
                item: {
                  select: { id: true, name: true },
                },
              },
              orderBy: { slotCode: 'asc' },
            },
          },
        },
      },
    })

    return NextResponse.json({ data: updatedShop }, { status: 200 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[POST /api/admin/shops/[id]/authorize-vault-case] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

