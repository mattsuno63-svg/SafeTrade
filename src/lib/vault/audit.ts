/**
 * Vault Audit Trail - Log all operations
 */

import { prisma } from '@/lib/db'

export type VaultAuditAction =
  | 'DEPOSIT_CREATED'
  | 'DEPOSIT_RECEIVED'
  | 'DEPOSIT_REVIEWED'
  | 'ITEM_ACCEPTED'
  | 'ITEM_REJECTED'
  | 'ITEM_ASSIGNED_TO_SHOP'
  | 'ITEM_MOVED_TO_SLOT'
  | 'ITEM_REMOVED_FROM_SLOT'
  | 'ITEM_LISTED_ONLINE'
  | 'ITEM_RESERVED'
  | 'ITEM_SOLD'
  | 'CASE_CREATED'
  | 'SLOT_OCCUPIED'
  | 'SLOT_FREED'
  | 'ORDER_CREATED'
  | 'ORDER_PAID'
  | 'ORDER_FULFILLING'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_DISPUTED'
  | 'ORDER_REFUNDED'
  | 'SALE_CREATED'
  | 'SPLIT_GENERATED'
  | 'SPLIT_ELIGIBLE'
  | 'SPLIT_IN_PAYOUT'
  | 'SPLIT_PAID'
  | 'PAYOUT_BATCH_CREATED'
  | 'PAYOUT_BATCH_PAID'

interface CreateAuditLogParams {
  actionType: VaultAuditAction
  performedBy: { id: string } // Solo id necessario
  depositId?: string
  itemId?: string
  orderId?: string
  saleId?: string
  caseId?: string
  slotId?: string
  oldValue?: any
  newValue?: any
  notes?: string
}

/**
 * Create audit log entry
 */
export async function createVaultAuditLog(params: CreateAuditLogParams) {
  const { actionType, performedBy, oldValue, newValue, notes, ...refs } = params

  return prisma.vaultAuditLog.create({
    data: {
      actionType,
      performedById: performedBy.id,
      depositId: refs.depositId,
      itemId: refs.itemId,
      orderId: refs.orderId,
      saleId: refs.saleId,
      caseId: refs.caseId,
      slotId: refs.slotId,
      oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
      newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
      notes,
    },
  })
}

