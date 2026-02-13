import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/escrow/confirm-payment
 *
 * SOLO ADMIN o ESCROW_AGENT autorizzato possono confermare che il pagamento
 * del buyer è stato ricevuto in un Verified Escrow.
 *
 * Flusso:
 * 1. Buyer paga via Stripe → webhook aggiorna EscrowPayment (futuro)
 * 2. ADMIN/ESCROW_AGENT verifica manualmente il pagamento (es. controlla Stripe dashboard)
 * 3. Chiama questo endpoint → EscrowPayment passa da PENDING a HELD
 * 4. Seller riceve notifica: "Pagamento confermato, puoi spedire"
 *
 * SICUREZZA:
 * - Solo ADMIN o utenti con ESCROW_AGENT role + autorizzazione attiva
 * - Verifica che la transazione sia di tipo VERIFIED
 * - Verifica che il pagamento sia in stato PENDING
 * - Audit trail completo
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    // =========================================================
    // SECURITY: Solo ADMIN o ESCROW_AGENT autorizzato
    // =========================================================
    let isAuthorized = false

    if (user.role === 'ADMIN') {
      isAuthorized = true
    } else if (user.role === 'ESCROW_AGENT') {
      // Verifica che l'agente abbia un'autorizzazione attiva dall'admin
      const authorization = await prisma.escrowAgentAuthorization.findUnique({
        where: { userId: user.id },
      })

      if (authorization && authorization.isActive && !authorization.revokedAt) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error: 'Accesso negato. Solo Admin o Escrow Agent autorizzati possono confermare pagamenti.',
        },
        { status: 403 }
      )
    }

    // =========================================================
    // PARSE BODY
    // =========================================================
    const body = await request.json()
    const { transactionId, notes } = body

    if (!transactionId) {
      return NextResponse.json(
        { error: 'transactionId è obbligatorio' },
        { status: 400 }
      )
    }

    // =========================================================
    // VALIDAZIONI
    // =========================================================

    // 1. Trova la transazione con tutti i dettagli
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id: transactionId },
      include: {
        escrowPayment: true,
        escrowSession: true,
        userA: { select: { id: true, name: true, email: true } }, // Buyer
        userB: { select: { id: true, name: true, email: true } }, // Seller
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // 2. Deve essere una transazione VERIFIED (escrow centralizzato)
    if (transaction.escrowType !== 'VERIFIED') {
      return NextResponse.json(
        {
          error: 'Questa funzione è solo per transazioni Verified Escrow. Le transazioni LOCAL usano un flusso diverso.',
          escrowType: transaction.escrowType,
        },
        { status: 400 }
      )
    }

    // 3. Deve esistere un EscrowPayment
    if (!transaction.escrowPayment) {
      return NextResponse.json(
        { error: 'Nessun pagamento escrow trovato per questa transazione' },
        { status: 400 }
      )
    }

    const payment = transaction.escrowPayment

    // 4. Il pagamento deve essere in stato PENDING
    if (payment.status !== 'PENDING') {
      return NextResponse.json(
        {
          error: `Il pagamento è già in stato "${payment.status}". Solo pagamenti PENDING possono essere confermati.`,
          currentStatus: payment.status,
        },
        { status: 400 }
      )
    }

    // 5. Validazione importo: deve essere > 0
    if (payment.amount <= 0) {
      return NextResponse.json(
        { error: 'Importo pagamento non valido (deve essere > 0)' },
        { status: 400 }
      )
    }

    // 6. SECURITY: Se c'è un Payment Intent Stripe, verifica che sia effettivamente autorizzato
    let stripeVerified = false
    if (payment.paymentProviderId && payment.paymentProvider === 'stripe') {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(payment.paymentProviderId)

        // Il PI deve essere in requires_capture (autorizzato ma non catturato)
        if (paymentIntent.status !== 'requires_capture') {
          return NextResponse.json(
            {
              error: `Il Payment Intent Stripe è in stato "${paymentIntent.status}". Deve essere "requires_capture" per confermare il pagamento.`,
              stripeStatus: paymentIntent.status,
              hint: paymentIntent.status === 'requires_payment_method'
                ? 'Il buyer non ha ancora completato il pagamento su Stripe.'
                : paymentIntent.status === 'canceled'
                ? 'Il pagamento è stato annullato su Stripe.'
                : 'Controlla lo stato su Stripe Dashboard.',
            },
            { status: 400 }
          )
        }

        // Verifica che l'importo corrisponda
        const stripeAmountEur = paymentIntent.amount / 100
        const tolerance = 0.01 // 1 centesimo di tolleranza
        if (Math.abs(stripeAmountEur - payment.amount) > tolerance) {
          return NextResponse.json(
            {
              error: `Discrepanza importo: Stripe €${stripeAmountEur.toFixed(2)} vs DB €${payment.amount.toFixed(2)}`,
              stripeAmount: stripeAmountEur,
              dbAmount: payment.amount,
            },
            { status: 400 }
          )
        }

        stripeVerified = true
      } catch (stripeError: any) {
        return NextResponse.json(
          {
            error: `Errore verifica Stripe: ${stripeError.message}`,
            hint: 'Verifica che il Payment Intent ID sia corretto e che Stripe sia raggiungibile.',
          },
          { status: 500 }
        )
      }
    }

    // =========================================================
    // CONFERMA PAGAMENTO - Transazione atomica
    // =========================================================
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const confirmedAt = new Date()

    const result = await prisma.$transaction(async (tx) => {
      // 1. Aggiorna EscrowPayment: PENDING → HELD
      const updatedPayment = await tx.escrowPayment.update({
        where: { id: payment.id },
        data: {
          status: 'HELD',
          paymentHeldAt: confirmedAt,
        },
      })

      // 2. Aggiorna la transazione: il seller può ora spedire
      await tx.safeTradeTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'CONFIRMED', // Pagamento confermato, seller può spedire
          notes: notes
            ? `Pagamento confermato da ${user.role} (${user.name || user.email}). ${notes}`
            : `Pagamento confermato da ${user.role} (${user.name || user.email}).`,
        },
      })

      // 3. Crea audit log
      if (transaction.escrowSession) {
        await tx.escrowAuditLog.create({
          data: {
            sessionId: transaction.escrowSession.id,
            actionType: 'PAYMENT_CONFIRMED',
            performedById: user.id,
            performedByRole: user.role,
            oldStatus: transaction.escrowSession.status,
            newStatus: transaction.escrowSession.status, // Lo status della session non cambia
            metadata: {
              paymentId: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              confirmedBy: user.id,
              confirmedByRole: user.role,
              notes: notes || null,
            },
            ipAddress,
            userAgent,
          },
        })

        // 4. Messaggio sistema nella sessione escrow
        await tx.escrowMessage.create({
          data: {
            sessionId: transaction.escrowSession.id,
            senderId: user.id,
            content: `✅ Pagamento di €${payment.amount.toFixed(2)} confermato da ${user.role === 'ADMIN' ? 'Admin' : 'Agente Escrow'}. Il venditore può ora procedere con la spedizione.`,
            isSystem: true,
          },
        })
      }

      // 5. Notifica al SELLER: "Pagamento confermato, puoi spedire"
      await tx.notification.create({
        data: {
          userId: transaction.userBId, // Seller
          type: 'PAYMENT_CONFIRMED',
          title: 'Pagamento Confermato ✅',
          message: `Il pagamento di €${payment.amount.toFixed(2)} per la tua transazione è stato confermato. Puoi ora procedere con la spedizione al SafeTrade Hub.`,
          link: `/transaction/${transactionId}/status`,
        },
      })

      // 6. Notifica al BUYER: "Pagamento ricevuto, in attesa spedizione seller"
      await tx.notification.create({
        data: {
          userId: transaction.userAId, // Buyer
          type: 'PAYMENT_CONFIRMED',
          title: 'Pagamento Ricevuto ✅',
          message: `Il tuo pagamento di €${payment.amount.toFixed(2)} è stato confermato. Il venditore è stato avvisato di procedere con la spedizione.`,
          link: `/transaction/${transactionId}/status`,
        },
      })

      // 7. Notifica admin (per tracking)
      await tx.adminNotification.create({
        data: {
          type: 'ESCROW_PAYMENT_CONFIRMED',
          referenceType: 'ESCROW_PAYMENT',
          referenceId: payment.id,
          title: `Pagamento Verified Escrow confermato`,
          message: `${user.name || user.email} (${user.role}) ha confermato il pagamento di €${payment.amount.toFixed(2)} per la transazione #${transactionId.slice(0, 8)}.`,
          priority: 'NORMAL',
          targetRoles: ['ADMIN'],
        },
      })

      return { updatedPayment }
    })

    return NextResponse.json({
      success: true,
      message: `Pagamento di €${payment.amount.toFixed(2)} confermato. Il venditore è stato notificato.`,
      payment: {
        id: result.updatedPayment.id,
        status: result.updatedPayment.status,
        amount: result.updatedPayment.amount,
        paymentHeldAt: result.updatedPayment.paymentHeldAt,
      },
      confirmedBy: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      confirmedAt: confirmedAt.toISOString(),
    })
  } catch (error: any) {
    console.error('[POST /api/admin/escrow/confirm-payment] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Errore nella conferma del pagamento' },
      { status: 500 }
    )
  }
}
