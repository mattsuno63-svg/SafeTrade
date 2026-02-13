import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createEscrowPaymentIntent, euroToCents } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * POST /api/escrow/create-payment-intent
 *
 * Il BUYER di un Verified Escrow chiama questo endpoint per creare
 * un Payment Intent Stripe con capture_method: manual.
 *
 * Flusso:
 * 1. Buyer chiama questo endpoint → riceve clientSecret
 * 2. Frontend usa Stripe.js/Elements per completare il pagamento con il clientSecret
 * 3. Stripe processa → webhook payment_intent.succeeded → salva paymentProviderId
 * 4. Admin/EscrowAgent conferma → EscrowPayment: PENDING → HELD
 * 5. Trade completa → Admin approva release → capture del Payment Intent
 *
 * Body:
 * - transactionId: string
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { transactionId } = body

    if (!transactionId) {
      return NextResponse.json(
        { error: 'transactionId è obbligatorio' },
        { status: 400 }
      )
    }

    // 1. Trova la transazione
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id: transactionId },
      include: {
        escrowPayment: true,
        escrowSession: {
          select: {
            totalAmount: true,
            feeAmount: true,
            feePaidBy: true,
          },
        },
        userA: { select: { id: true, name: true, email: true } },
        userB: { select: { id: true, name: true, email: true } },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // 2. Solo il BUYER può pagare
    if (transaction.userAId !== user.id) {
      return NextResponse.json(
        { error: 'Solo il buyer può effettuare il pagamento' },
        { status: 403 }
      )
    }

    // 3. Deve essere VERIFIED escrow
    if (transaction.escrowType !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'Payment Intent è solo per Verified Escrow. I trade LOCAL usano pagamento in contanti.' },
        { status: 400 }
      )
    }

    // 4. Deve esistere un EscrowPayment
    if (!transaction.escrowPayment) {
      return NextResponse.json(
        { error: 'Nessun pagamento escrow trovato per questa transazione' },
        { status: 400 }
      )
    }

    const payment = transaction.escrowPayment

    // 5. Il pagamento deve essere PENDING
    if (payment.status !== 'PENDING') {
      return NextResponse.json(
        {
          error: `Il pagamento è in stato "${payment.status}". Solo pagamenti PENDING possono essere processati.`,
          currentStatus: payment.status,
        },
        { status: 400 }
      )
    }

    // 6. Se esiste già un PI, restituisci il clientSecret esistente
    if (payment.paymentProviderId) {
      // Recupera il PI da Stripe per ottenere il clientSecret
      const { stripe } = await import('@/lib/stripe')
      const existingPI = await stripe.paymentIntents.retrieve(payment.paymentProviderId)

      if (existingPI.status === 'requires_payment_method' || existingPI.status === 'requires_confirmation') {
        return NextResponse.json({
          success: true,
          clientSecret: existingPI.client_secret,
          paymentIntentId: existingPI.id,
          amount: existingPI.amount / 100,
          currency: existingPI.currency,
          existing: true,
        })
      }

      if (existingPI.status === 'requires_capture') {
        return NextResponse.json({
          success: true,
          message: 'Pagamento già autorizzato. In attesa di conferma admin.',
          alreadyAuthorized: true,
        })
      }

      // PI in stato non recuperabile → ne creiamo uno nuovo
    }

    // 7. Calcola importo in centesimi
    const amountEur = payment.amount
    const amountInCents = euroToCents(amountEur)

    if (amountInCents < 50) {
      return NextResponse.json(
        { error: `Importo troppo basso (€${amountEur}). Minimo Stripe: €0.50` },
        { status: 400 }
      )
    }

    // 8. Crea Payment Intent su Stripe
    const paymentIntent = await createEscrowPaymentIntent({
      amountInCents,
      metadata: {
        transactionId: transaction.id,
        buyerId: transaction.userAId,
        sellerId: transaction.userBId,
        escrowType: transaction.escrowType,
        escrowPaymentId: payment.id,
      },
      description: `SafeTrade Verified Escrow - €${amountEur.toFixed(2)} - Transaction #${transaction.id.slice(0, 8)}`,
    })

    // 9. Salva il paymentProviderId
    await prisma.escrowPayment.update({
      where: { id: payment.id },
      data: {
        paymentProviderId: paymentIntent.id,
        paymentProvider: 'stripe',
      },
    })

    // 10. Log per debug
    console.log(
      `[create-payment-intent] Created PI ${paymentIntent.id} for transaction ${transactionId}, amount: €${amountEur}`
    )

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountEur,
      currency: 'eur',
    })
  } catch (error: any) {
    console.error('[POST /api/escrow/create-payment-intent] Error:', error)

    // Gestisci errori Stripe specifici
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: `Errore carta: ${error.message}` },
        { status: 400 }
      )
    }

    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: `Errore Stripe: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Errore nella creazione del pagamento' },
      { status: 500 }
    )
  }
}
