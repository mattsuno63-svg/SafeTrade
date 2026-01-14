/**
 * Vault Notifications - Send notifications for Vault events
 */

import { prisma } from '@/lib/db'

/**
 * Send notification to user
 */
async function sendNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
      },
    })
  } catch (error) {
    console.error('[Vault Notification] Error sending notification:', error)
    // Don't throw - notifications are non-critical
  }
}

/**
 * Notify depositor that deposit was received
 */
export async function notifyDepositReceived(depositId: string) {
  const deposit = await prisma.vaultDeposit.findUnique({
    where: { id: depositId },
    include: { depositor: true },
  })

  if (deposit) {
    await sendNotification(
      deposit.depositorUserId,
      'VAULT_DEPOSIT_RECEIVED',
      '📦 Deposito Ricevuto',
      `Il tuo deposito SafeTrade Vault #${depositId.slice(0, 8)} è stato ricevuto all'hub e sarà verificato a breve.`,
      `/vault/deposits/${depositId}`
    )
  }
}

/**
 * Notify depositor that review is complete
 */
export async function notifyDepositReviewed(depositId: string) {
  const deposit = await prisma.vaultDeposit.findUnique({
    where: { id: depositId },
    include: {
      depositor: true,
      items: true,
    },
  })

  if (deposit) {
    const acceptedCount = deposit.items.filter((i) => i.status === 'ACCEPTED').length
    const rejectedCount = deposit.items.filter((i) => i.status === 'REJECTED').length

    await sendNotification(
      deposit.depositorUserId,
      'VAULT_DEPOSIT_REVIEWED',
      '✅ Verifica Completata',
      `La verifica del tuo deposito è completata: ${acceptedCount} carte accettate${rejectedCount > 0 ? `, ${rejectedCount} rifiutate` : ''}.`,
      `/vault/deposits/${depositId}`
    )
  }
}

/**
 * Notify merchant that items were assigned
 */
export async function notifyItemsAssigned(shopId: string, itemIds: string[]) {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
  })

  if (shop) {
    await sendNotification(
      shop.merchantId,
      'VAULT_ITEMS_ASSIGNED',
      '📦 Nuove Carte Assegnate',
      `${itemIds.length} ${itemIds.length === 1 ? 'carta è stata' : 'carte sono state'} assegnate al tuo negozio.`,
      `/merchant/vault`
    )
  }
}

/**
 * Notify merchant of new online order
 */
export async function notifyNewOrder(orderId: string) {
  const order = await prisma.vaultOrder.findUnique({
    where: { id: orderId },
    include: {
      shop: true,
      item: true,
    },
  })

  if (order) {
    await sendNotification(
      order.shop.merchantId,
      'VAULT_NEW_ORDER',
      '🛒 Nuovo Ordine Online',
      `Nuovo ordine per ${order.item.name}. Prepara la spedizione!`,
      `/merchant/vault/orders/${orderId}`
    )
  }
}

/**
 * Notify buyer that tracking was added
 */
export async function notifyTrackingAdded(orderId: string) {
  const order = await prisma.vaultOrder.findUnique({
    where: { id: orderId },
    include: {
      fulfillment: true,
    },
  })

  if (order && order.fulfillment?.trackingCode) {
    await sendNotification(
      order.buyerUserId,
      'VAULT_TRACKING_ADDED',
      '📦 Spedizione in Corso',
      `Il tuo ordine è stato spedito! Tracking: ${order.fulfillment.trackingCode}`,
      `/vault/orders/${orderId}`
    )
  }
}

/**
 * Notify owner and merchant that sale is complete and split generated
 */
export async function notifySaleComplete(saleId: string) {
  const sale = await prisma.vaultSale.findUnique({
    where: { id: saleId },
    include: {
      item: {
        include: {
          owner: true,
        },
      },
      shop: true,
    },
  })

  if (sale) {
    const split = await prisma.vaultSplit.findFirst({
      where: {
        sourceType: 'SALE',
        sourceId: saleId,
      },
    })

    if (split) {
      // Notify owner
      await sendNotification(
        sale.item.ownerUserId,
        'VAULT_SALE_COMPLETE',
        '💰 Vendita Completata',
        `La tua carta "${sale.item.name}" è stata venduta per €${sale.soldPrice.toFixed(2)}. Il tuo ricavo: €${split.ownerAmount.toFixed(2)}.`,
        `/vault/payouts`
      )

      // Notify merchant
      await sendNotification(
        sale.shop.merchantId,
        'VAULT_SALE_COMPLETE',
        '💰 Vendita Registrata',
        `Vendita completata: ${sale.item.name} per €${sale.soldPrice.toFixed(2)}. La tua commissione: €${split.merchantAmount.toFixed(2)}.`,
        `/merchant/vault/statement`
      )
    }
  }
}

/**
 * Notify owner and merchant that payout was executed
 */
export async function notifyPayoutPaid(batchId: string) {
  const batch = await prisma.vaultPayoutBatch.findUnique({
    where: { id: batchId },
    include: {
      lines: {
        include: {
          split: {
            include: {
              item: true,
            },
          },
        },
      },
    },
  })

  if (batch) {
    // Group by payee
    const payeeMap = new Map<string, { amount: number; count: number }>()

    for (const line of batch.lines) {
      const existing = payeeMap.get(line.payeeId) || { amount: 0, count: 0 }
      existing.amount += line.amount
      existing.count += 1
      payeeMap.set(line.payeeId, existing)
    }

    // Send notifications
    for (const [payeeId, { amount, count }] of payeeMap.entries()) {
      await sendNotification(
        payeeId,
        'VAULT_PAYOUT_PAID',
        '💳 Payout Eseguito',
        `Il tuo payout SafeTrade Vault è stato eseguito: €${amount.toFixed(2)} (${count} ${count === 1 ? 'transazione' : 'transazioni'}).`,
        batch.type === 'USER' ? '/vault/payouts' : '/merchant/vault/statement'
      )
    }
  }
}

