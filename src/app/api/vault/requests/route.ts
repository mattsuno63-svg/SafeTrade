import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleApiError } from '@/lib/api-error'

/**
 * POST /api/vault/requests
 * Crea una richiesta per una teca Vault
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Solo merchant possono richiedere teche
    if (user.role !== 'MERCHANT' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo i merchant possono richiedere teche Vault' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const schema = z.object({
      shopId: z.string(),
      notes: z.string().max(1000).optional().nullable(),
    })

    const data = schema.parse(body)

    // Verifica che lo shop esista e appartenga al merchant
    const shop = await prisma.shop.findUnique({
      where: { id: data.shopId },
      include: {
        vaultCase: true, // Check if already has authorized case
        vaultCaseRequests: {
          where: { status: 'PENDING' },
        },
      },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop non trovato' }, { status: 404 })
    }

    if (shop.merchantId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non sei autorizzato a richiedere una teca per questo shop' },
        { status: 403 }
      )
    }

    // Verifica se ha già una teca autorizzata
    if (shop.vaultCaseAuthorized || shop.vaultCase) {
      return NextResponse.json(
        { error: 'Questo shop ha già una teca Vault autorizzata' },
        { status: 400 }
      )
    }

    // Verifica se c'è già una richiesta pendente
    if (shop.vaultCaseRequests && shop.vaultCaseRequests.length > 0) {
      return NextResponse.json(
        { error: 'Hai già una richiesta in attesa di approvazione' },
        { status: 400 }
      )
    }

    // Crea la richiesta
    const vaultRequest = await prisma.vaultCaseRequest.create({
      data: {
        shopId: data.shopId,
        requestedBy: user.id,
        status: 'PENDING',
        notes: data.notes && data.notes.trim().length > 0
          ? data.notes.trim()
          : `Richiesta teca Vault per ${shop.name}`,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
        requestedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    // Invia notifica agli admin per review
    try {
      await prisma.adminNotification.create({
        data: {
          type: 'VAULT_CASE_REQUEST',
          referenceType: 'VAULT_CASE_REQUEST',
          referenceId: vaultRequest.id,
          title: 'Nuova Richiesta Teca Vault',
          message: `${vaultRequest.requestedByUser?.name || 'Un merchant'} ha richiesto una teca Vault per il negozio "${shop.name}".`,
          priority: 'NORMAL',
          targetRoles: ['ADMIN', 'HUB_STAFF'],
        },
      })
    } catch (notifError) {
      console.error('Error creating admin notification for vault case request:', notifError)
      // Non fallire la richiesta se la notifica fallisce
    }

    return NextResponse.json(
      {
        data: vaultRequest,
        message: 'Richiesta inviata con successo. Riceverai una notifica quando sarà processata.',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating vault case request:', error)
    return handleApiError(error, 'vault-requests')
  }
}

/**
 * GET /api/vault/requests
 * Ottiene le richieste teca (merchant vede solo le proprie, admin vede tutte)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const status = searchParams.get('status')

    const where: any = {}

    // Merchant vede solo le proprie richieste
    if (user.role !== 'ADMIN' && user.role !== 'HUB_STAFF') {
      where.requestedBy = user.id
    }

    if (shopId) {
      where.shopId = shopId
    }

    if (status) {
      where.status = status
    }

    const requests = await prisma.vaultCaseRequest.findMany({
      where,
      select: {
        id: true,
        shopId: true,
        requestedBy: true,
        status: true,
        notes: true,
        adminNotes: true,
        paymentStatus: true,
        createdAt: true,
        approvedAt: true,
        rejectedAt: true,
        paidAt: true,
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        requestedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: requests })
  } catch (error) {
    console.error('Error fetching vault case requests:', error)
    return handleApiError(error, 'vault-requests')
  }
}

