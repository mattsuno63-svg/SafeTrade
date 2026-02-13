import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyWebhookSignature } from '@/lib/stripe'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// IMPORTANTE: Next.js di default parsa il body come JSON.
// Stripe richiede il body RAW per la verifica della firma.
// In Next.js App Router, dobbiamo leggere il body come testo.

/**
 * POST /api/webhooks/stripe
 *
 * Gestisce gli eventi Stripe. Verifica la firma del webhook per
 * garantire che l'evento arrivi davvero da Stripe.
 *
 * Eventi gestiti:
 * - payment_intent.succeeded → Pagamento autorizzato (fondi bloccati)
 * - payment_intent.payment_failed → Pagamento fallito
 * - payment_intent.canceled → Pagamento annullato
 * - charge.refunded → Rimborso eseguito
 */
export async function POST(request: NextRequest) {
  let event: Stripe.Event

  try {
    // 1. Leggi il body RAW (necessario per verifica firma)
    const rawBody = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('[Stripe Webhook] Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // 2. Verifica la firma — se fallisce, il webhook è fraudolento
    try {
      event = verifyWebhookSignature(rawBody, signature)
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message)
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      )
    }

    // 3. Gestisci l'evento in base al tipo
    console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`)

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    // 4. Rispondi 200 a Stripe (conferma ricezione)
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[Stripe Webhook] Unhandled error:', error)
    // Rispondi 200 anche in caso di errore per evitare retry infiniti di Stripe
    // L'errore è stato loggato, lo gestiamo manualmente
    return NextResponse.json({ received: true, error: error.message })
  }
}

// =====================================================
// EVENT HANDLERS
// =====================================================

/**
 * Payment Intent autorizzato con successo.
 *
 * Con capture_method: 'manual', questo significa che i fondi del buyer
 * sono stati AUTORIZZATI (bloccati sulla carta) ma NON addebiatati.
 *
 * Aggiorniamo l'EscrowPayment con il paymentProviderId per tracking.
 * Lo stato resta PENDING — diventa HELD solo quando l'admin conferma.
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const transactionId = paymentIntent.metadata?.transactionId

  if (!transactionId) {
    console.warn('[Stripe Webhook] payment_intent.succeeded senza transactionId nei metadata')
    return
  }

  console.log(`[Stripe Webhook] Payment authorized for transaction: ${transactionId}`)

  try {
    // Trova l'EscrowPayment collegato
    const escrowPayment = await prisma.escrowPayment.findUnique({
      where: { transactionId },
    })

    if (!escrowPayment) {
      console.error(`[Stripe Webhook] EscrowPayment not found for transaction: ${transactionId}`)
      return
    }

    // Idempotenza: se ha già il paymentProviderId, non aggiornare
    if (escrowPayment.paymentProviderId === paymentIntent.id) {
      console.log(`[Stripe Webhook] Already processed PI ${paymentIntent.id}`)
      return
    }

    // Aggiorna con i riferimenti Stripe
    await prisma.escrowPayment.update({
      where: { id: escrowPayment.id },
      data: {
        paymentProviderId: paymentIntent.id,
        paymentProvider: 'stripe',
        // NON cambiamo lo status a HELD — lo fa solo l'admin via confirm-payment
      },
    })

    // Crea notifica admin: "Pagamento Stripe autorizzato, verifica e conferma"
    await prisma.adminNotification.create({
      data: {
        type: 'STRIPE_PAYMENT_AUTHORIZED',
        referenceType: 'ESCROW_PAYMENT',
        referenceId: escrowPayment.id,
        title: `Pagamento Stripe autorizzato - €${(paymentIntent.amount / 100).toFixed(2)}`,
        message: `Il buyer ha autorizzato il pagamento di €${(paymentIntent.amount / 100).toFixed(2)} per la transazione #${transactionId.slice(0, 8)}. Verifica su Stripe Dashboard e conferma con /api/admin/escrow/confirm-payment.`,
        priority: 'HIGH',
        targetRoles: ['ADMIN', 'ESCROW_AGENT'],
      },
    })

    // Notifica al buyer: "Pagamento autorizzato, in attesa conferma"
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id: transactionId },
      select: { userAId: true },
    })

    if (transaction) {
      await prisma.notification.create({
        data: {
          userId: transaction.userAId,
          type: 'PAYMENT_AUTHORIZED',
          title: 'Pagamento Autorizzato',
          message: `Il tuo pagamento di €${(paymentIntent.amount / 100).toFixed(2)} è stato autorizzato. Il team SafeTrade lo verificherà e confermerà a breve.`,
          link: `/transaction/${transactionId}/status`,
        },
      })
    }

    console.log(`[Stripe Webhook] Updated EscrowPayment ${escrowPayment.id} with PI ${paymentIntent.id}`)
  } catch (error: any) {
    console.error(`[Stripe Webhook] Error handling payment_intent.succeeded:`, error)
  }
}

/**
 * Pagamento fallito. Notifica buyer e admin.
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const transactionId = paymentIntent.metadata?.transactionId

  if (!transactionId) return

  console.log(`[Stripe Webhook] Payment failed for transaction: ${transactionId}`)

  try {
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id: transactionId },
      select: { userAId: true },
    })

    if (transaction) {
      const failureMessage = paymentIntent.last_payment_error?.message || 'Errore sconosciuto'

      await prisma.notification.create({
        data: {
          userId: transaction.userAId,
          type: 'PAYMENT_FAILED',
          title: 'Pagamento Fallito',
          message: `Il pagamento per la transazione non è andato a buon fine: ${failureMessage}. Riprova o usa un altro metodo di pagamento.`,
          link: `/transaction/${transactionId}/status`,
        },
      })
    }
  } catch (error: any) {
    console.error(`[Stripe Webhook] Error handling payment_intent.payment_failed:`, error)
  }
}

/**
 * Pagamento annullato. Aggiorna EscrowPayment.
 */
async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  const transactionId = paymentIntent.metadata?.transactionId

  if (!transactionId) return

  console.log(`[Stripe Webhook] Payment canceled for transaction: ${transactionId}`)

  try {
    const escrowPayment = await prisma.escrowPayment.findUnique({
      where: { transactionId },
    })

    if (escrowPayment && escrowPayment.status === 'PENDING') {
      await prisma.escrowPayment.update({
        where: { id: escrowPayment.id },
        data: {
          status: 'CANCELLED',
        },
      })
    }
  } catch (error: any) {
    console.error(`[Stripe Webhook] Error handling payment_intent.canceled:`, error)
  }
}

/**
 * Rimborso eseguito. Aggiorna EscrowPayment se collegato.
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id

  if (!paymentIntentId) return

  console.log(`[Stripe Webhook] Charge refunded for PI: ${paymentIntentId}`)

  try {
    const escrowPayment = await prisma.escrowPayment.findFirst({
      where: { paymentProviderId: paymentIntentId },
    })

    if (escrowPayment && escrowPayment.status !== 'REFUNDED') {
      await prisma.escrowPayment.update({
        where: { id: escrowPayment.id },
        data: {
          status: 'REFUNDED',
          paymentRefundedAt: new Date(),
        },
      })
    }
  } catch (error: any) {
    console.error(`[Stripe Webhook] Error handling charge.refunded:`, error)
  }
}
