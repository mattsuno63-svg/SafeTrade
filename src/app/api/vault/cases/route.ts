import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { generateSlotQRToken } from '@/lib/vault/qr-generator'
import { z } from 'zod'

/**
 * GET /api/vault/cases
 * List cases (filtered by role)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const searchParams = request.nextUrl.searchParams
    const shopId = searchParams.get('shopId')
    const status = searchParams.get('status')

    const cases = await prisma.vaultCase.findMany({
      where: {
        ...(shopId ? { shopId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        shop: {
          select: { id: true, name: true },
        },
        slots: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                game: true,
                status: true,
              },
            },
          },
          orderBy: { slotCode: 'asc' },
        },
        _count: {
          select: { slots: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: cases }, { status: 200 })
  } catch (error: any) {
    console.error('[GET /api/vault/cases] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/vault/cases
 * Create new case with 30 slots (S01..S30) - HUB_STAFF/ADMIN only
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('ADMIN')

    const body = await request.json()
    const schema = z.object({
      shopId: z.string().optional(), // null = in hub
      label: z.string().optional(),
    })

    const data = schema.parse(body)

    // If shopId provided, verify shop exists and is vault-enabled
    if (data.shopId) {
      const shop = await prisma.shop.findUnique({
        where: { id: data.shopId },
      })

      if (!shop) {
        return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
      }

      if (!shop.vaultEnabled) {
        return NextResponse.json(
          { error: 'Shop is not enrolled in Vault program' },
          { status: 400 }
        )
      }
    }

    // Create case with 30 slots
    const case_ = await prisma.vaultCase.create({
      data: {
        shopId: data.shopId || null,
        authorizedShopId: data.shopId || null, // Must match shopId for merchant operations
        status: data.shopId ? 'IN_SHOP_ACTIVE' : 'IN_HUB',
        label: data.label,
        slots: {
          create: Array.from({ length: 30 }, (_, i) => {
            const slotNum = i + 1
            const slotCode = `S${String(slotNum).padStart(2, '0')}`
            return {
              slotCode,
              qrToken: '', // Will be set after case creation
              status: 'FREE',
            }
          }),
        },
      },
      include: {
        slots: true,
      },
    })

    // Generate QR tokens for all slots
    await Promise.all(
      case_.slots.map(async (slot) => {
        const qrToken = generateSlotQRToken(case_.id, slot.slotCode)
        await prisma.vaultCaseSlot.update({
          where: { id: slot.id },
          data: { qrToken },
        })
      })
    )

    // Reload case with QR tokens
    const caseWithQR = await prisma.vaultCase.findUnique({
      where: { id: case_.id },
      include: {
        slots: {
          orderBy: { slotCode: 'asc' },
        },
      },
    })

    // If assigned to a shop, also authorize the shop for vault case operations
    if (data.shopId) {
      await prisma.shop.update({
        where: { id: data.shopId },
        data: { vaultCaseAuthorized: true },
      })
    }

    await createVaultAuditLog({
      actionType: 'CASE_CREATED',
      performedBy: user,
      caseId: case_.id,
      newValue: { shopId: data.shopId, slotCount: 30 },
    })

    return NextResponse.json({ data: caseWithQR }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[POST /api/vault/cases] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

