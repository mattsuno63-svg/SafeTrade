import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

/**
 * POST /api/vault/requests/[id]/confirm-payment
 * Merchant conferma di aver inviato il bonifico
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    // Gestisci params come Promise (Next.js 15)
    const resolvedParams = 'then' in params ? await params : params
    const { id } = resolvedParams

    if (!id || id === 'undefined') {
      return NextResponse.json(
        { error: 'ID richiesta non valido' },
        { status: 400 }
      )
    }

    // Recupera la richiesta
    const vaultRequest = await prisma.vaultCaseRequest.findUnique({
      where: { id },
      include: {
        shop: true,
      },
    })

    if (!vaultRequest) {
      return NextResponse.json(
        { error: 'Richiesta non trovata' },
        { status: 404 }
      )
    }

    // Verifica che sia il merchant proprietario
    if (vaultRequest.requestedBy !== user.id) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      )
    }

    // Verifica che la richiesta sia APPROVED
    if (vaultRequest.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'La richiesta deve essere approvata prima di confermare il pagamento' },
        { status: 400 }
      )
    }

    // Verifica che il pagamento non sia già stato confermato o processato
    // paymentStatus iniziale è null → accetta solo null per la prima conferma
    if (vaultRequest.paymentStatus === 'PENDING') {
      return NextResponse.json(
        { error: 'Il pagamento è già stato confermato e in attesa di verifica admin' },
        { status: 400 }
      )
    }

    if (vaultRequest.paymentStatus === 'PAID') {
      return NextResponse.json(
        { error: 'Il pagamento è già stato verificato e confermato' },
        { status: 400 }
      )
    }

    if (vaultRequest.paymentStatus && vaultRequest.paymentStatus !== 'UNPAID') {
      return NextResponse.json(
        { error: 'Stato pagamento non valido per la conferma' },
        { status: 400 }
      )
    }

    // Aggiorna paymentStatus
    const updated = await prisma.vaultCaseRequest.update({
      where: { id },
      data: {
        paymentStatus: 'PENDING', // In attesa di verifica admin
      },
    })

    // Notifica admin
    try {
      await prisma.adminNotification.create({
        data: {
          type: 'VAULT_CASE_REQUEST',
          referenceType: 'VAULT_CASE_REQUEST',
          referenceId: id,
          title: 'Pagamento Bonifico in Attesa di Verifica',
          message: `Il merchant "${vaultRequest.shop.name}" ha confermato l'invio del bonifico per la teca Vault. Verifica il pagamento.`,
          priority: 'NORMAL',
          targetRoles: ['ADMIN', 'HUB_STAFF'],
        },
      })
    } catch (notifError) {
      console.error('Error creating admin notification:', notifError)
      // Non fallire se la notifica fallisce
    }

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (error) {
    return handleApiError(error, 'ConfirmPayment')
  }
}

