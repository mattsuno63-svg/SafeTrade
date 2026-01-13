import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { z } from 'zod'

/**
 * GET /api/vault/deposits
 * List deposits (filtered by role)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    let deposits

    if (user.role === 'ADMIN' || user.role === 'HUB_STAFF') {
      // Hub can see all deposits
      deposits = await prisma.vaultDeposit.findMany({
        where: status ? { status: status as any } : undefined,
        include: {
          depositor: {
            select: { id: true, name: true, email: true },
          },
          items: {
            select: {
              id: true,
              name: true,
              game: true,
              status: true,
              conditionDeclared: true,
              conditionVerified: true,
              priceFinal: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else {
      // Users can only see their own deposits
      deposits = await prisma.vaultDeposit.findMany({
        where: {
          depositorUserId: user.id,
          ...(status ? { status: status as any } : {}),
        },
        include: {
          items: {
            select: {
              id: true,
              name: true,
              game: true,
              status: true,
              conditionDeclared: true,
              conditionVerified: true,
              priceFinal: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    }

    return NextResponse.json({ data: deposits }, { status: 200 })
  } catch (error: any) {
    console.error('[GET /api/vault/deposits] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/vault/deposits
 * Create new deposit (USER only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const schema = z.object({
      trackingIn: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(
        z.object({
          game: z.enum(['POKEMON', 'MAGIC', 'YUGIOH', 'ONEPIECE', 'DIGIMON', 'OTHER']),
          name: z.string().min(1),
          set: z.string().optional(),
          conditionDeclared: z.enum(['MINT', 'NEAR_MINT', 'EXCELLENT', 'GOOD', 'PLAYED', 'POOR']),
          photos: z.array(z.string()).optional(),
        })
      ).min(1),
    })

    const data = schema.parse(body)

    // Create deposit with items
    const deposit = await prisma.vaultDeposit.create({
      data: {
        depositorUserId: user.id,
        trackingIn: data.trackingIn,
        notes: data.notes,
        status: 'CREATED',
        items: {
          create: data.items.map((item) => ({
            ownerUserId: user.id,
            game: item.game,
            name: item.name,
            set: item.set,
            conditionDeclared: item.conditionDeclared,
            photos: item.photos || [],
            status: 'PENDING_REVIEW',
          })),
        },
      },
      include: {
        items: true,
        _count: { select: { items: true } },
      },
    })

    // Audit log
    await createVaultAuditLog({
      actionType: 'DEPOSIT_CREATED',
      performedBy: user,
      depositId: deposit.id,
      newValue: { itemCount: data.items.length },
    })

    return NextResponse.json({ data: deposit }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[POST /api/vault/deposits] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

