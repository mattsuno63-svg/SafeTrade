import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * POST /api/vault/requests
 * Crea una richiesta per una teca Vault
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
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
        notes: `Richiesta teca Vault per ${shop.name}`,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // TODO: Invia notifica agli admin per review

    return NextResponse.json(
      {
        data: vaultRequest,
        message: 'Richiesta inviata con successo. Riceverai una notifica quando sarà processata.',
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating vault case request:', error)
    return NextResponse.json(
      { error: error.message || 'Errore nella creazione della richiesta' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/vault/requests
 * Ottiene le richieste teca (merchant vede solo le proprie, admin vede tutte)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
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
      include: {
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
  } catch (error: any) {
    console.error('Error fetching vault case requests:', error)
    return NextResponse.json(
      { error: error.message || 'Errore nel caricamento delle richieste' },
      { status: 500 }
    )
  }
}

