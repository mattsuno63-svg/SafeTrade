import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { generateAllMonthlyInvoices, getPendingInvoices } from '@/lib/merchant/invoicing'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/merchant-invoices
 *
 * Lista fatture merchant. Solo ADMIN.
 * Query params:
 * - status: "DRAFT" | "ISSUED" | "PAID" | "OVERDUE" | "CANCELLED" (opzionale)
 * - shopId: ID negozio (opzionale)
 * - pending: "true" per ottenere solo fatture in attesa di pagamento
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo Admin può accedere' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const shopId = searchParams.get('shopId')
    const pending = searchParams.get('pending')

    if (pending === 'true') {
      const invoices = await getPendingInvoices()
      return NextResponse.json({ data: invoices })
    }

    const where: any = {}
    if (status) where.status = status
    if (shopId) where.shopId = shopId

    const invoices = await prisma.merchantInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            merchantId: true,
            merchant: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { entries: true },
        },
      },
    })

    return NextResponse.json({ data: invoices })
  } catch (error: any) {
    console.error('[GET /api/admin/merchant-invoices] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/merchant-invoices
 *
 * Genera fatture mensili. Solo ADMIN.
 * Body:
 * - year: number (es. 2026)
 * - month: number 1-12 (es. 2 = Febbraio)
 * - shopId?: string (opzionale, se vuoi generare per un solo negozio)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo Admin può generare fatture' }, { status: 403 })
    }

    const body = await request.json()
    const { year, month, shopId } = body

    if (!year || !month) {
      return NextResponse.json(
        { error: 'year e month sono obbligatori' },
        { status: 400 }
      )
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'month deve essere tra 1 e 12' },
        { status: 400 }
      )
    }

    if (shopId) {
      // Genera per un solo negozio
      const { generateMonthlyInvoice } = await import('@/lib/merchant/invoicing')
      const result = await generateMonthlyInvoice(shopId, year, month)

      return NextResponse.json({
        success: true,
        results: [{ shopId, ...result }],
      })
    } else {
      // Genera per tutti i negozi
      const results = await generateAllMonthlyInvoices(year, month)

      const created = results.filter(r => r.created).length
      const skipped = results.filter(r => !r.created).length

      return NextResponse.json({
        success: true,
        summary: {
          total: results.length,
          created,
          skipped,
        },
        results,
      })
    }
  } catch (error: any) {
    console.error('[POST /api/admin/merchant-invoices] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
