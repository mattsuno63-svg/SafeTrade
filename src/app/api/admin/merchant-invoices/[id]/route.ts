import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { markInvoiceAsPaid, cancelInvoice } from '@/lib/merchant/invoicing'
import { handleApiError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/merchant-invoices/[id]
 *
 * Dettaglio fattura con tutte le voci. Solo ADMIN.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo Admin può accedere' }, { status: 403 })
    }

    const resolvedParams = 'then' in params ? await params : params
    const { id } = resolvedParams

    const invoice = await prisma.merchantInvoice.findUnique({
      where: { id },
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
        entries: {
          orderBy: { createdAt: 'asc' },
          include: {
            transaction: {
              select: {
                id: true,
                status: true,
                userA: { select: { id: true, name: true } },
                userB: { select: { id: true, name: true } },
                completedAt: true,
              },
            },
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
    }

    return NextResponse.json({ data: invoice })
  } catch (error: any) {
    console.error('[GET /api/admin/merchant-invoices/[id]] Error:', error)
    return handleApiError(error, 'merchant-invoices-id')
  }
}

/**
 * PATCH /api/admin/merchant-invoices/[id]
 *
 * Aggiorna stato fattura. Solo ADMIN.
 * Body:
 * - action: "mark_paid" | "cancel"
 * - paymentMethod?: string (per mark_paid, es. "BANK_TRANSFER")
 * - paymentReference?: string (per mark_paid, es. CRO bonifico)
 * - notes?: string
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo Admin può modificare fatture' }, { status: 403 })
    }

    const resolvedParams = 'then' in params ? await params : params
    const { id } = resolvedParams
    const body = await request.json()
    const { action, paymentMethod, paymentReference, notes } = body

    if (!action) {
      return NextResponse.json(
        { error: 'action è obbligatorio ("mark_paid" o "cancel")' },
        { status: 400 }
      )
    }

    let result

    if (action === 'mark_paid') {
      if (!paymentMethod) {
        return NextResponse.json(
          { error: 'paymentMethod è obbligatorio per mark_paid (es. "BANK_TRANSFER")' },
          { status: 400 }
        )
      }

      result = await markInvoiceAsPaid(id, paymentMethod, paymentReference, notes)

      // Crea notifica per il merchant
      const invoice = await prisma.merchantInvoice.findUnique({
        where: { id },
        include: {
          shop: {
            select: { merchantId: true },
          },
        },
      })

      if (invoice) {
        await prisma.notification.create({
          data: {
            userId: invoice.shop.merchantId,
            type: 'INVOICE_PAID',
            title: 'Fattura Pagata ✅',
            message: `La fattura ${invoice.invoiceNumber} di €${invoice.amountDue.toFixed(2)} è stata confermata come pagata.`,
          },
        })
      }
    } else if (action === 'cancel') {
      result = await cancelInvoice(id, notes)
    } else {
      return NextResponse.json(
        { error: 'action deve essere "mark_paid" o "cancel"' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('[PATCH /api/admin/merchant-invoices/[id]] Error:', error)
    return handleApiError(error, 'merchant-invoices-id')
  }
}
