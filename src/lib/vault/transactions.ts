/**
 * SafeVault Transaction Utilities
 * 
 * Funzioni helper per transazioni atomiche e lock pessimistici
 * per evitare race conditions con molte teche
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

/**
 * Lock pessimistico su slot durante operazioni critiche
 * Usa SELECT FOR UPDATE per garantire esclusività
 */
export async function lockSlotForUpdate(
  tx: Prisma.TransactionClient,
  slotId: string
) {
  // Prisma non supporta direttamente SELECT FOR UPDATE, ma possiamo usare
  // una query raw per PostgreSQL
  const result = await tx.$queryRaw<Array<{ id: string; status: string; caseId: string }>>`
    SELECT id, status, "caseId"
    FROM "VaultCaseSlot"
    WHERE id = ${slotId}
    FOR UPDATE
  `
  
  if (!result || result.length === 0) {
    throw new Error('Slot not found')
  }
  
  return result[0]
}

/**
 * Lock pessimistico su item durante operazioni critiche
 */
export async function lockItemForUpdate(
  tx: Prisma.TransactionClient,
  itemId: string
) {
  const result = await tx.$queryRaw<Array<{ id: string; status: string; slotId: string | null; shopIdCurrent: string | null }>>`
    SELECT id, status, "slotId", "shopIdCurrent"
    FROM "VaultItem"
    WHERE id = ${itemId}
    FOR UPDATE
  `
  
  if (!result || result.length === 0) {
    throw new Error('Item not found')
  }
  
  return result[0]
}

/**
 * Valida e assegna item a slot con lock pessimistico
 * Tutte le validazioni sono dentro la transazione per evitare race conditions
 */
export async function assignItemToSlotAtomic(
  tx: Prisma.TransactionClient,
  params: {
    itemId: string
    slotId: string
    shopId: string
  }
) {
  const { itemId, slotId, shopId } = params
  
  // 1. Lock item e slot simultaneamente (ordine importante per evitare deadlock)
  const [lockedItem, lockedSlot] = await Promise.all([
    lockItemForUpdate(tx, itemId),
    lockSlotForUpdate(tx, slotId),
  ])
  
  // 2. Validazioni dentro la transazione (dopo lock)
  if (lockedItem.status !== 'ASSIGNED_TO_SHOP' && lockedItem.status !== 'IN_CASE') {
    throw new Error(`Item non può essere assegnato. Stato corrente: ${lockedItem.status}`)
  }
  
  if (lockedItem.shopIdCurrent !== shopId) {
    throw new Error('Item non assegnato a questo negozio')
  }
  
  if (lockedSlot.status !== 'FREE') {
    throw new Error('Slot già occupato')
  }
  
  // 3. Verifica che slot appartenga a teca autorizzata del shop
  const case_ = await tx.vaultCase.findUnique({
    where: { id: lockedSlot.caseId },
    select: { authorizedShopId: true, status: true },
  })
  
  if (!case_) {
    throw new Error('Teca non trovata')
  }
  
  if (case_.authorizedShopId !== shopId) {
    throw new Error('Slot non appartiene alla teca autorizzata del negozio')
  }
  
  if (case_.status !== 'IN_SHOP_ACTIVE') {
    throw new Error('Teca non attiva')
  }
  
  // 4. Se item è già in uno slot, liberalo prima
  if (lockedItem.slotId && lockedItem.slotId !== slotId) {
    await tx.vaultCaseSlot.update({
      where: { id: lockedItem.slotId },
      data: { status: 'FREE' },
    })
  }
  
  // 5. Aggiorna item e slot atomically
  const [updatedItem, updatedSlot] = await Promise.all([
    tx.vaultItem.update({
      where: { id: itemId },
      data: {
        status: 'IN_CASE',
        caseId: lockedSlot.caseId,
        slotId: slotId,
      },
    }),
    tx.vaultCaseSlot.update({
      where: { id: slotId },
      data: { status: 'OCCUPIED' },
    }),
  ])
  
  return { item: updatedItem, slot: updatedSlot }
}

/**
 * Sposta item tra slot con lock pessimistico
 */
export async function moveItemBetweenSlotsAtomic(
  tx: Prisma.TransactionClient,
  params: {
    itemId: string
    fromSlotId: string
    toSlotId: string
    shopId: string
  }
) {
  const { itemId, fromSlotId, toSlotId, shopId } = params
  
  // Lock tutti e tre simultaneamente (item + entrambi gli slot)
  const [lockedItem, lockedFromSlot, lockedToSlot] = await Promise.all([
    lockItemForUpdate(tx, itemId),
    lockSlotForUpdate(tx, fromSlotId),
    lockSlotForUpdate(tx, toSlotId),
  ])
  
  // Validazioni
  if (lockedItem.status !== 'IN_CASE') {
    throw new Error(`Item non può essere spostato. Stato corrente: ${lockedItem.status}`)
  }
  
  if (lockedItem.slotId !== fromSlotId) {
    throw new Error('Item non è nello slot origine specificato')
  }
  
  if (lockedFromSlot.status !== 'OCCUPIED') {
    throw new Error('Slot origine non è occupato')
  }
  
  if (lockedToSlot.status !== 'FREE') {
    throw new Error('Slot destinazione già occupato')
  }
  
  // Verifica che entrambi gli slot appartengano alla stessa teca autorizzata
  const [fromCase, toCase] = await Promise.all([
    tx.vaultCase.findUnique({
      where: { id: lockedFromSlot.caseId },
      select: { authorizedShopId: true },
    }),
    tx.vaultCase.findUnique({
      where: { id: lockedToSlot.caseId },
      select: { authorizedShopId: true },
    }),
  ])
  
  if (!fromCase || !toCase) {
    throw new Error('Teca non trovata')
  }
  
  if (fromCase.authorizedShopId !== shopId || toCase.authorizedShopId !== shopId) {
    throw new Error('Slot non appartengono alla teca autorizzata del negozio')
  }
  
  // Sposta atomically
  const [updatedItem, freedFromSlot, occupiedToSlot] = await Promise.all([
    tx.vaultItem.update({
      where: { id: itemId },
      data: {
        slotId: toSlotId,
        caseId: lockedToSlot.caseId,
      },
    }),
    tx.vaultCaseSlot.update({
      where: { id: fromSlotId },
      data: { status: 'FREE' },
    }),
    tx.vaultCaseSlot.update({
      where: { id: toSlotId },
      data: { status: 'OCCUPIED' },
    }),
  ])
  
  return { item: updatedItem, fromSlot: freedFromSlot, toSlot: occupiedToSlot }
}

/**
 * Rimuovi item da slot con lock pessimistico
 */
export async function removeItemFromSlotAtomic(
  tx: Prisma.TransactionClient,
  params: {
    itemId: string
    slotId: string
    shopId: string
  }
) {
  const { itemId, slotId, shopId } = params
  
  // Lock item e slot
  const [lockedItem, lockedSlot] = await Promise.all([
    lockItemForUpdate(tx, itemId),
    lockSlotForUpdate(tx, slotId),
  ])
  
  // Validazioni
  if (lockedItem.slotId !== slotId) {
    throw new Error('Item non è nello slot specificato')
  }
  
  if (lockedItem.shopIdCurrent !== shopId) {
    throw new Error('Item non appartiene a questo negozio')
  }
  
  if (lockedSlot.status !== 'OCCUPIED') {
    throw new Error('Slot non è occupato')
  }
  
  // Verifica teca autorizzata
  const case_ = await tx.vaultCase.findUnique({
    where: { id: lockedSlot.caseId },
    select: { authorizedShopId: true },
  })
  
  if (!case_ || case_.authorizedShopId !== shopId) {
    throw new Error('Slot non appartiene alla teca autorizzata del negozio')
  }
  
  // Rimuovi atomically
  const [updatedItem, freedSlot] = await Promise.all([
    tx.vaultItem.update({
      where: { id: itemId },
      data: {
        status: 'ASSIGNED_TO_SHOP',
        slotId: null,
        caseId: null,
      },
    }),
    tx.vaultCaseSlot.update({
      where: { id: slotId },
      data: { status: 'FREE' },
    }),
  ])
  
  return { item: updatedItem, slot: freedSlot }
}

