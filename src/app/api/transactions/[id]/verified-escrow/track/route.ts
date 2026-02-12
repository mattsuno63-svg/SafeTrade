import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { SafeTradeStatus, HubPackageStatus } from '@prisma/client'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/transactions/[id]/verified-escrow/track
 * Seller inserisce tracking number per Verified Escrow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = await Promise.resolve(params)
    const body = await request.json()
    const { trackingNumber } = body

    // SECURITY: Rate limiting
    const rateLimitKey = getRateLimitKey(user.id, 'MESSAGE_SEND') // Reuse message rate limit
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.MESSAGE_SEND)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Troppe richieste. Riprova tra qualche minuto.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { status: 429 }
      )
    }

    // Get transaction
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id },
      include: {
        userA: { select: { id: true, name: true, email: true } },
        userB: { select: { id: true, name: true, email: true } },
        escrowPayment: { select: { id: true, amount: true, status: true } },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // SECURITY: Only seller can insert tracking
    if (transaction.userBId !== user.id) {
      return NextResponse.json(
        { error: 'Solo il venditore può inserire il tracking number' },
        { status: 403 }
      )
    }

    // SECURITY: Verify escrowType is VERIFIED
    if (transaction.escrowType !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'Questa transazione non è Verified Escrow' },
        { status: 400 }
      )
    }

    // SECURITY: Verify status is correct (must be PENDING_ESCROW_SETUP - initial state)
    if (transaction.status !== SafeTradeStatus.PENDING_ESCROW_SETUP) {
      return NextResponse.json(
        { error: `Stato transazione non valido. Stato attuale: ${transaction.status}. Stato richiesto: PENDING_ESCROW_SETUP. Hai già inserito il tracking number?` },
        { status: 400 }
      )
    }

    // SECURITY: Check if tracking already set (prevent overwriting)
    if (transaction.trackingNumber) {
      return NextResponse.json(
        { error: 'Tracking number già inserito per questa transazione' },
        { status: 400 }
      )
    }

    // SECURITY: Validate tracking number
    if (!trackingNumber || typeof trackingNumber !== 'string' || trackingNumber.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tracking number richiesto' },
        { status: 400 }
      )
    }

    // SECURITY: Validate tracking format (basic check for common Italian couriers)
    const trackingPattern = /^[A-Z0-9]{8,20}$/i
    if (!trackingPattern.test(trackingNumber.trim())) {
      return NextResponse.json(
        { error: 'Formato tracking number non valido' },
        { status: 400 }
      )
    }

    // SECURITY: Check if tracking already exists (prevent duplicates)
    const existingTransaction = await prisma.safeTradeTransaction.findFirst({
      where: {
        trackingNumber: trackingNumber.trim(),
        id: { not: id },
      },
    })

    if (existingTransaction) {
      return NextResponse.json(
        { error: 'Questo tracking number è già stato utilizzato' },
        { status: 400 }
      )
    }

    // SECURITY: Verify escrowPayment exists and is HELD (funds must be in escrow before shipping)
    const escrowPayment = await prisma.escrowPayment.findUnique({
      where: { transactionId: id },
    })

    if (!escrowPayment) {
      return NextResponse.json(
        { error: 'Pagamento non trovato. La transazione non può procedere.' },
        { status: 400 }
      )
    }

    if (escrowPayment.status !== 'HELD') {
      return NextResponse.json(
        { error: `Pagamento non in stato HELD. Stato attuale: ${escrowPayment.status}. I fondi devono essere in escrow prima della spedizione.` },
        { status: 400 }
      )
    }

    // SECURITY: Tracking inserito dal seller, ma richiede validazione admin
    // Admin deve vedere notifica per organizzare ricezione e verificare tracking
    // Update transaction (status rimane PENDING_ESCROW_SETUP finché admin non valida)
    const updatedTransaction = await prisma.safeTradeTransaction.update({
      where: { id },
      data: {
        trackingNumber: trackingNumber.trim(),
        // NOTA: Non cambiamo packageStatus/status qui - solo dopo validazione admin
        // Questo permette ad admin di validare tracking prima che diventi "attivo"
        notes: `Tracking number inserito da seller: ${trackingNumber.trim()} (${new Date().toISOString()}). In attesa di validazione admin.`,
      },
    })

    // SECURITY: Create AdminNotification per validazione tracking
    // Admin deve validare il tracking number prima che il pacco venga considerato "in transito"
    await prisma.adminNotification.create({
      data: {
        type: 'URGENT_ACTION',
        referenceType: 'TRANSACTION',
        referenceId: id,
        title: `📦 Tracking Inserito - Validazione Richiesta - Ordine #${id.slice(0, 8)}`,
        message: `Seller ${transaction.userB.name || transaction.userB.email} ha inserito tracking number: "${trackingNumber.trim()}" per transazione Verified Escrow. Importo: €${(transaction.escrowPayment?.amount || 0).toFixed(2)}. Verifica tracking e valida quando pronto per ricezione hub.`,
        priority: 'HIGH',
        targetRoles: ['ADMIN', 'HUB_STAFF'],
      },
    })

    // Create notification for buyer (informa che tracking è stato inserito, ma in attesa validazione)
    await prisma.notification.create({
      data: {
        userId: transaction.userAId,
        type: 'TRANSACTION_UPDATED',
        title: '📦 Tracking Number Inserito',
        message: `Il venditore ha inserito il tracking number: ${trackingNumber.trim()}. Il pacco sarà verificato dal nostro team quando arriverà all'hub (dopo validazione tracking).`,
        link: `/transaction/${id}/status`,
      },
    })

    // SECURITY: Log action for audit trail
    console.log(`[VERIFIED_ESCROW] Tracking inserted by seller ${user.id} for transaction ${id}: ${trackingNumber.trim()} - PENDING ADMIN VALIDATION`)
    
    // Note: transaction notes already updated in the previous update, no need to update again

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
    })
  } catch (error: any) {
    console.error('Error inserting tracking number:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

