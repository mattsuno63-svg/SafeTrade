# SafeTrade Vault System - Documentazione Implementazione

## Overview

Sistema di conto vendita multicanale "SafeTrade Vault" implementato con:
- Hub centrale per ricezione e verifica depositi
- Teche fisiche brandizzate con 30 slot (S01..S30) con QR
- Vendita online e fisica
- Split ricavi 70/20/10 (owner/merchant/platform)
- Sistema payout batch

## Modelli Database

### VaultDeposit
Deposito di carte inviato all'hub dall'utente.

**Stati**: CREATED → RECEIVED → IN_REVIEW → ACCEPTED/PARTIAL/REJECTED → DISTRIBUTED → CLOSED

### VaultItem
Singola carta nel sistema.

**Stati**: PENDING_REVIEW → ACCEPTED/REJECTED → ASSIGNED_TO_SHOP → IN_CASE → LISTED_ONLINE → RESERVED → SOLD/RETURNED

### VaultCase
Teca fisica brandizzata con 30 slot.

**Stati**: IN_HUB → IN_TRANSIT → IN_SHOP_ACTIVE → RETIRED

### VaultCaseSlot
Slot nella teca (S01..S30) con QR univoco.

**Stati**: FREE → OCCUPIED

### VaultSale
Vendita fisica in negozio.

### VaultOrder
Ordine online con fulfillment dal merchant.

**Stati**: PENDING_PAYMENT → PAID → FULFILLING → SHIPPED → DELIVERED → (DISPUTED/REFUNDED)

### VaultSplit
Split ricavi 70/20/10.

**Stati**: PENDING → ELIGIBLE → IN_PAYOUT → PAID → REVERSED

### VaultPayoutBatch
Batch di payout raggruppati per statement.

**Stati**: CREATED → PROCESSING → PAID

## API Routes

### Hub (Admin/HUB_STAFF)

- `GET /api/vault/deposits` - Lista depositi
- `GET /api/vault/deposits/[id]` - Dettaglio deposito
- `POST /api/vault/deposits/[id]/receive` - Marca deposito ricevuto
- `POST /api/vault/deposits/[id]/review` - Review item (accept/reject con pricing)
- `POST /api/vault/items/assign` - Assegna item a shop (opzionalmente case/slot)
- `GET /api/vault/cases` - Lista teche
- `POST /api/vault/cases` - Crea teca con 30 slot
- `GET /api/vault/cases/[id]` - Dettaglio teca

### Merchant

- `GET /api/vault/merchant/inventory` - Inventario item assegnati
- `POST /api/vault/merchant/items/[id]/move-slot` - Sposta item in slot
- `POST /api/vault/merchant/items/[id]/list-online` - Lista item online
- `GET /api/vault/merchant/orders` - Ordini da evadere
- `POST /api/vault/merchant/orders/[id]/fulfill` - Aggiorna tracking/spedizione
- `POST /api/vault/merchant/sales` - Registra vendita fisica

### User

- `GET /api/vault/deposits` - I propri depositi
- `GET /api/vault/deposits/[id]` - Dettaglio deposito
- `POST /api/vault/deposits` - Crea deposito
- `POST /api/vault/orders` - Crea ordine (checkout)
- `POST /api/vault/orders/[id]/pay` - Marca ordine pagato
- `GET /api/vault/payouts` - I propri payout

### Admin

- `GET /api/vault/payouts` - Tutti i payout
- `POST /api/vault/payouts/batches` - Crea batch payout
- `POST /api/vault/payouts/batches/[id]/pay` - Marca batch pagato

## State Machine

### VaultItem Transitions

```
PENDING_REVIEW → ACCEPTED/REJECTED (solo HUB)
ACCEPTED → ASSIGNED_TO_SHOP (solo HUB)
ASSIGNED_TO_SHOP → IN_CASE (solo MERCHANT, richiede slot libero)
ASSIGNED_TO_SHOP/IN_CASE → LISTED_ONLINE (solo MERCHANT)
LISTED_ONLINE → RESERVED (solo sistema: ordine PAID)
RESERVED → SOLD (solo se ordine DELIVERED o vendita fisica)
SOLD → terminale
```

### Invarianti

- Uno slot può contenere massimo 1 item (slot.status = OCCUPIED)
- Un item può avere massimo 1 location attiva (caseId+slotId)
- Se item.status = RESERVED non può essere venduto fisicamente
- Se item è in IN_CASE, lo slot deve essere OCCUPIED

## Split Ricavi

Split fisso 70/20/10:
- `ownerAmount = floor(grossAmount * 0.70 * 100) / 100`
- `merchantAmount = floor(grossAmount * 0.20 * 100) / 100`
- `platformAmount = round((grossAmount - ownerAmount - merchantAmount) * 100) / 100`

Vendite fisiche: split ELIGIBLE immediatamente.
Ordini online: split PENDING, diventa ELIGIBLE dopo 7 giorni da DELIVERED.

## Notifiche

Notifiche realtime inviate per:
- Deposito ricevuto (utente)
- Review completata (utente)
- Item assegnati (merchant)
- Nuovo ordine online (merchant)
- Tracking inserito (buyer)
- Vendita completata (owner + merchant)
- Payout eseguito (owner + merchant)

## Audit Trail

Ogni operazione Vault genera log in `VaultAuditLog` con:
- Tipo azione
- Chi ha eseguito
- Valori vecchi/nuovi
- Note

## QR Codes

- Slot QR: `VAULT_SLOT_{caseId}_{slotCode}_{random}`
- Item QR: `VAULT_ITEM_{itemId}_{random}`

## Prossimi Passi

1. Eseguire migration Prisma: `npx prisma db push` o `npx prisma migrate dev`
2. Creare UI pages per User, Merchant e Admin
3. Implementare scanner QR per slot/item
4. Test end-to-end del workflow completo

