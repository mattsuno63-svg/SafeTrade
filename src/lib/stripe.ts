/**
 * Stripe Client Singleton
 *
 * Uso:
 *   import { stripe } from '@/lib/stripe'
 *   const paymentIntent = await stripe.paymentIntents.create({ ... })
 */

import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY mancante nel .env')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia' as any,
  typescript: true,
})

/**
 * Verifica la firma di un webhook Stripe.
 * Ritorna l'evento parsato se la firma è valida, altrimenti lancia un errore.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret || webhookSecret === 'whsec_placeholder') {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET non configurato. ' +
      'Esegui `stripe listen --forward-to localhost:3000/api/webhooks/stripe` e copia il whsec_ nel .env'
    )
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

/**
 * Crea un Payment Intent per escrow con manual capture.
 *
 * capture_method: 'manual' → i fondi vengono autorizzati ma NON addebitati.
 * L'addebito reale avviene solo quando chiamiamo stripe.paymentIntents.capture().
 * Questo è FONDAMENTALE per l'escrow: teniamo i fondi "bloccati" finché
 * l'admin non approva il rilascio.
 *
 * @param amount - Importo in centesimi (es. €10.50 = 1050)
 * @param metadata - Metadata da associare (transactionId, buyerId, etc.)
 */
export async function createEscrowPaymentIntent(params: {
  amountInCents: number
  currency?: string
  metadata: Record<string, string>
  description?: string
}) {
  const { amountInCents, currency = 'eur', metadata, description } = params

  if (amountInCents < 50) {
    throw new Error('Importo minimo Stripe: €0.50 (50 centesimi)')
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency,
    capture_method: 'manual', // FONDAMENTALE: non addebita subito
    metadata,
    description: description || `SafeTrade Escrow - Transaction ${metadata.transactionId || 'unknown'}`,
  })

  return paymentIntent
}

/**
 * Cattura un Payment Intent precedentemente autorizzato.
 * Questa è l'operazione che ADDEBITA realmente il buyer.
 *
 * Chiamare SOLO dopo che l'admin ha approvato il rilascio fondi.
 */
export async function capturePaymentIntent(paymentIntentId: string) {
  return stripe.paymentIntents.capture(paymentIntentId)
}

/**
 * Rimborsa un Payment Intent (totale o parziale).
 *
 * Se il PI non è stato ancora catturato (status = requires_capture),
 * basta cancellarlo. Se è stato catturato, serve un refund.
 */
export async function refundPayment(
  paymentIntentId: string,
  amountInCents?: number // Se omesso, rimborso totale
) {
  // Prima controlla lo stato del PI
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId)

  if (pi.status === 'requires_capture') {
    // Non ancora catturato → cancella (nessun addebito è mai avvenuto)
    return stripe.paymentIntents.cancel(paymentIntentId)
  }

  if (pi.status === 'succeeded') {
    // Già catturato → serve un refund
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    }
    if (amountInCents) {
      refundParams.amount = amountInCents
    }
    return stripe.refunds.create(refundParams)
  }

  throw new Error(
    `Impossibile rimborsare Payment Intent in stato "${pi.status}". ` +
    `Solo "requires_capture" o "succeeded" sono rimborsabili.`
  )
}

/**
 * Converti euro a centesimi (Stripe lavora in centesimi).
 * Arrotonda al centesimo per evitare errori floating point.
 */
export function euroToCents(euroAmount: number): number {
  return Math.round(euroAmount * 100)
}

/**
 * Converti centesimi a euro.
 */
export function centsToEuro(cents: number): number {
  return cents / 100
}
