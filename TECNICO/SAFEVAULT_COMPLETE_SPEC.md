# 🔐 SafeVault - Specifica Completa Sistema Teche

**Data**: 2025-01-27  
**Obiettivo**: Sistema completo e scalabile per gestione teche SafeTrade  
**Priorità**: 🔴 CRITICA - Completamento da A a Z

---

## 📋 INDICE

1. [Panoramica Sistema](#panoramica-sistema)
2. [Architettura e Scalabilità](#architettura-e-scalabilità)
3. [Problemi Critici con Molte Teche](#problemi-critici-con-molte-teche)
4. [State Machine e Transizioni](#state-machine-e-transizioni)
5. [API Endpoints Completi](#api-endpoints-completi)
6. [UI/UX Completa](#uiux-completa)
7. [Sicurezza e Validazioni](#sicurezza-e-validazioni)
8. [Performance e Ottimizzazioni](#performance-e-ottimizzazioni)
9. [Test Plan](#test-plan)
10. [Piano Implementazione](#piano-implementazione)

---

## 🎯 Panoramica Sistema

### Flusso Completo SafeVault

```
1. UTENTE → Crea Deposito → Invia Carte all'Hub
2. HUB_STAFF → Riceve Deposito → Verifica Carte → Accetta/Rifiuta
3. HUB_STAFF → Assegna Carte a Negozi → (Opzionale) Assegna a Teca/Slot
4. MERCHANT → Riceve Carte → Posiziona in Teca (Scan QR Slot)
5. MERCHANT → Lista Online → Vende Fisico/Online
6. SISTEMA → Split Ricavi 70/20/10 → Payout Batch
```

### Entità Principali

- **VaultDeposit**: Deposito di carte inviato all'hub
- **VaultItem**: Singola carta nel sistema
- **VaultCase**: Teca fisica con 30 slot (S01..S30)
- **VaultCaseSlot**: Slot singolo con QR univoco
- **VaultSale**: Vendita fisica in negozio
- **VaultOrder**: Ordine online
- **VaultSplit**: Split ricavi (70/20/10)
- **VaultPayoutBatch**: Batch payout per statement

---

## 🏗️ Architettura e Scalabilità

### Scenario Target
- **100+ Teche** attive
- **3,000+ Slot** totali (100 teche × 30 slot)
- **10,000+ Carte** in gestione
- **100+ Negozi** partecipanti
- **1,000+ Operazioni/giorno** (scan, vendite, spostamenti)

### Problemi Critici con Molte Teche

#### 1. **Performance Query**
**Problema**: Query su tutte le teche/slot possono essere lente
```sql
-- Query lenta senza ottimizzazione
SELECT * FROM VaultCase WHERE status = 'IN_SHOP_ACTIVE'
-- Include JOIN con 30 slot per ogni teca = 3000+ righe
```

**Soluzione**:
- ✅ Paginazione obbligatoria (max 50 teche per pagina)
- ✅ Lazy loading slot (carica solo quando necessario)
- ✅ Indici database ottimizzati
- ✅ Cache Redis per query frequenti (opzionale futuro)

#### 2. **Concorrenza Slot**
**Problema**: Due merchant potrebbero assegnare la stessa carta allo stesso slot simultaneamente
```typescript
// RACE CONDITION!
const slot = await prisma.vaultCaseSlot.findUnique({ where: { id: slotId } })
if (slot.status === 'FREE') {
  // ⚠️ Tra questo punto e l'update, un altro processo potrebbe occupare lo slot
  await prisma.vaultCaseSlot.update({ where: { id: slotId }, data: { status: 'OCCUPIED' } })
}
```

**Soluzione**:
- ✅ Transazioni database atomiche
- ✅ Lock pessimistico su slot durante assegnazione
- ✅ Unique constraint su `slotId` in `VaultItem`
- ✅ Validazione doppia (prima e durante update)

#### 3. **Integrità Dati**
**Problema**: Inconsistenze tra `VaultItem.slotId`, `VaultCaseSlot.status`, `VaultCaseSlot.itemId`
```typescript
// Scenario problematico:
// - VaultItem.slotId = "slot-123"
// - VaultCaseSlot.status = "FREE" ❌
// - VaultCaseSlot.itemId = null ❌
```

**Soluzione**:
- ✅ Trigger database per sincronizzazione automatica
- ✅ Validazione server-side prima di ogni operazione
- ✅ Audit log per tracciare tutte le modifiche
- ✅ Job periodico per verificare integrità (cron)

#### 4. **Cache Invalidation**
**Problema**: Cache obsoleta quando slot cambia stato
```typescript
// Cache mostra slot libero, ma in realtà è occupato
const cachedSlot = cache.get(`slot:${slotId}`) // Status: FREE
// Nel frattempo, un altro processo ha occupato lo slot
```

**Soluzione**:
- ✅ Cache TTL breve (5 minuti max)
- ✅ Invalidation immediata su update slot
- ✅ Versioning cache key (timestamp)
- ✅ Fallback a database se cache mancante

#### 5. **Query N+1**
**Problema**: Caricare lista teche con slot causa query multiple
```typescript
const cases = await prisma.vaultCase.findMany() // 1 query
for (const case_ of cases) {
  const slots = await prisma.vaultCaseSlot.findMany({ where: { caseId: case_.id } }) // N query!
}
```

**Soluzione**:
- ✅ Include Prisma per eager loading
- ✅ Batch loading con `findMany` con `where: { caseId: { in: caseIds } }`
- ✅ DataLoader pattern per batch requests

---

## 🔄 State Machine e Transizioni

### VaultDeposit Status
```
CREATED → RECEIVED → IN_REVIEW → [ACCEPTED | PARTIAL | REJECTED] → DISTRIBUTED → CLOSED
```

**Permessi**:
- `CREATED`: Utente può modificare/cancellare
- `RECEIVED`: HUB_STAFF può iniziare review
- `IN_REVIEW`: HUB_STAFF può accettare/rifiutare item
- `ACCEPTED/PARTIAL/REJECTED`: HUB_STAFF può assegnare a shop
- `DISTRIBUTED`: Sistema può chiudere dopo assegnazione completa
- `CLOSED`: Finale, nessuna modifica

### VaultItem Status
```
PENDING_REVIEW → [ACCEPTED | REJECTED] → ASSIGNED_TO_SHOP → IN_CASE → LISTED_ONLINE → [RESERVED → SOLD | RETURNED]
```

**Permessi**:
- `PENDING_REVIEW`: HUB_STAFF può accettare/rifiutare
- `ACCEPTED`: HUB_STAFF può assegnare a shop
- `ASSIGNED_TO_SHOP`: MERCHANT può posizionare in teca
- `IN_CASE`: MERCHANT può vendere/listare online
- `LISTED_ONLINE`: Utente può acquistare
- `RESERVED`: MERCHANT può evadere ordine
- `SOLD`: Finale, split ricavi creato
- `RETURNED`: Finale, carta restituita

### VaultCase Status
```
IN_HUB → IN_TRANSIT → IN_SHOP_ACTIVE → RETIRED
```

**Permessi**:
- `IN_HUB`: ADMIN/HUB_STAFF può assegnare a shop
- `IN_TRANSIT`: Sistema marca automaticamente
- `IN_SHOP_ACTIVE`: MERCHANT può gestire slot
- `RETIRED`: ADMIN può ritirare teca

### VaultCaseSlot Status
```
FREE → OCCUPIED
```

**Transizioni**:
- `FREE → OCCUPIED`: Quando item assegnato (MERCHANT/HUB_STAFF)
- `OCCUPIED → FREE`: Quando item rimosso/venduto (MERCHANT/HUB_STAFF)

**Validazioni**:
- ✅ Slot deve appartenere a teca attiva (`IN_SHOP_ACTIVE`)
- ✅ Slot deve essere libero prima di occupare
- ✅ Item deve essere `ASSIGNED_TO_SHOP` o `IN_CASE` prima di assegnare
- ✅ Transazione atomica per evitare race conditions

---

## 🔌 API Endpoints Completi

### Hub (ADMIN/HUB_STAFF)

#### Depositi
- ✅ `GET /api/vault/deposits` - Lista depositi (paginata, filtri)
- ✅ `GET /api/vault/deposits/[id]` - Dettaglio deposito con item
- ✅ `POST /api/vault/deposits` - Crea deposito (utente)
- ✅ `POST /api/vault/deposits/[id]/receive` - Marca ricevuto
- ✅ `POST /api/vault/deposits/[id]/review` - Review item (accept/reject)
- ✅ `POST /api/vault/deposits/[id]/close` - Chiudi deposito

#### Item
- ✅ `GET /api/vault/items` - Lista item (paginata, filtri)
- ✅ `GET /api/vault/items/[id]` - Dettaglio item
- ✅ `POST /api/vault/items/assign` - Assegna item a shop/case/slot
- ✅ `POST /api/vault/items/[id]/reject` - Rifiuta item
- ✅ `POST /api/vault/items/[id]/return` - Restituisci item a owner

#### Teche
- ✅ `GET /api/vault/cases` - Lista teche (paginata, filtri)
- ✅ `POST /api/vault/cases` - Crea teca con 30 slot
- ✅ `GET /api/vault/cases/[id]` - Dettaglio teca con slot
- ✅ `PATCH /api/vault/cases/[id]` - Aggiorna teca (status, shopId)
- ✅ `POST /api/vault/cases/[id]/assign-shop` - Assegna teca a shop
- ✅ `POST /api/vault/cases/[id]/retire` - Ritira teca
- ✅ `GET /api/vault/cases/[id]/qr-batch` - Genera QR batch per stampa

### Merchant

#### Inventario
- ✅ `GET /api/vault/merchant/inventory` - Inventario item assegnati
- ✅ `GET /api/vault/merchant/cases` - Lista teche del merchant
- ✅ `GET /api/vault/merchant/cases/[id]` - Dettaglio teca con slot

#### Scan e Gestione Slot
- ✅ `POST /api/vault/merchant/scan-slot` - Scan QR slot
- ✅ `POST /api/vault/merchant/assign-item-to-slot` - Assegna carta a slot
- ✅ `POST /api/vault/merchant/move-item` - Sposta carta tra slot
- ✅ `POST /api/vault/merchant/remove-item-from-slot` - Rimuovi carta da slot

#### Vendite
- ✅ `POST /api/vault/merchant/sell-item` - Registra vendita fisica
- ✅ `GET /api/vault/merchant/sales` - Lista vendite
- ✅ `GET /api/vault/merchant/sales/[id]` - Dettaglio vendita

#### Ordini Online
- ✅ `GET /api/vault/merchant/orders` - Lista ordini da evadere
- ✅ `POST /api/vault/merchant/orders/[id]/fulfill` - Evadi ordine
- ✅ `POST /api/vault/merchant/orders/[id]/ship` - Marca spedito

### Pubblico

#### Scan QR
- ✅ `GET /api/vault/public/scan/[token]` - Info slot pubblico (senza auth)

### Utente

#### Depositi
- ✅ `GET /api/vault/user/deposits` - Lista miei depositi
- ✅ `GET /api/vault/user/deposits/[id]` - Dettaglio deposito
- ✅ `POST /api/vault/user/deposits` - Crea deposito

#### Item e Ricavi
- ✅ `GET /api/vault/user/items` - Lista miei item
- ✅ `GET /api/vault/user/splits` - Lista split ricavi
- ✅ `GET /api/vault/user/payouts` - Lista payout ricevuti

---

## 🎨 UI/UX Completa

### Hub (ADMIN/HUB_STAFF)

#### Pagine
- ✅ `/admin/vault/deposits` - Lista depositi con filtri
- ✅ `/admin/vault/deposits/[id]` - Dettaglio deposito, review item
- ✅ `/admin/vault/items` - Lista item con filtri avanzati
- ✅ `/admin/vault/cases` - Lista teche, crea nuova teca
- ✅ `/admin/vault/cases/[id]` - Dettaglio teca, gestione slot
- ✅ `/admin/vault/assignments` - Assegnazioni item a shop

### Merchant

#### Pagine
- ✅ `/merchant/vault` - Dashboard vault (stats, inventario)
- ✅ `/merchant/vault/scan` - Scan QR slot (tabs: Posiziona, Sposta, Vendi)
- ✅ `/merchant/vault/cases` - Lista teche del merchant
- ✅ `/merchant/vault/cases/[id]` - Vista teca completa (30 slot griglia)
- ✅ `/merchant/vault/cases/[id]/qr-print` - Genera/stampa QR
- ✅ `/merchant/vault/inventory` - Inventario item assegnati
- ✅ `/merchant/vault/sales` - Lista vendite fisiche
- ✅ `/merchant/vault/orders` - Ordini online da evadere

### Utente

#### Pagine
- ✅ `/dashboard/vault` - Dashboard utente (depositi, item, ricavi)
- ✅ `/dashboard/vault/deposits` - Lista miei depositi
- ✅ `/dashboard/vault/deposits/new` - Crea nuovo deposito
- ✅ `/dashboard/vault/items` - Lista miei item
- ✅ `/dashboard/vault/payouts` - Lista payout ricevuti

---

## 🔒 Sicurezza e Validazioni

### Validazioni Critiche

#### Assegnazione Item a Slot
```typescript
// 1. Slot esiste e appartiene a teca attiva
const slot = await prisma.vaultCaseSlot.findUnique({ where: { id: slotId } })
if (!slot || slot.case.status !== 'IN_SHOP_ACTIVE') throw Error('Slot non valido')

// 2. Slot è libero (con lock pessimistico)
const lockedSlot = await prisma.vaultCaseSlot.findUnique({
  where: { id: slotId },
  include: { case: true, item: true }
})
if (lockedSlot.status !== 'FREE' || lockedSlot.item) throw Error('Slot occupato')

// 3. Item può essere assegnato
if (item.status !== 'ASSIGNED_TO_SHOP' && item.status !== 'IN_CASE') {
  throw Error('Item non può essere assegnato')
}

// 4. Merchant autorizzato
if (slot.case.shopId !== merchantShopId) throw Error('Non autorizzato')

// 5. Transazione atomica
await prisma.$transaction([
  prisma.vaultCaseSlot.update({ where: { id: slotId }, data: { status: 'OCCUPIED' } }),
  prisma.vaultItem.update({ 
    where: { id: itemId }, 
    data: { slotId, caseId: slot.caseId, status: 'IN_CASE' } 
  })
])
```

#### Vendita Fisica
```typescript
// 1. Item esiste e appartiene a merchant
if (item.shopIdCurrent !== merchantShopId) throw Error('Non autorizzato')

// 2. Item è in teca
if (item.status !== 'IN_CASE' || !item.slotId) throw Error('Item non in teca')

// 3. Prezzo valido
if (soldPrice <= 0 || soldPrice > item.priceFinal * 2) {
  throw Error('Prezzo non valido')
}

// 4. Vendite > €500 richiedono conferma esplicita
if (soldPrice > 500 && !explicitConfirmation) {
  throw Error('Conferma esplicita richiesta per vendite > €500')
}

// 5. Transazione atomica: vendita + libera slot + split ricavi
await prisma.$transaction([
  prisma.vaultSale.create({ data: { ... } }),
  prisma.vaultItem.update({ where: { id: itemId }, data: { status: 'SOLD' } }),
  prisma.vaultCaseSlot.update({ where: { id: item.slotId }, data: { status: 'FREE' } }),
  createVaultSplits(itemId, soldPrice, ownerId, shopId)
])
```

### Rate Limiting
- ✅ Scan QR: 60 richieste/minuto per merchant
- ✅ Assegnazione slot: 30 richieste/minuto per merchant
- ✅ Vendite: 20 richieste/minuto per merchant
- ✅ Creazione depositi: 10 richieste/ora per utente

### Audit Log
Ogni operazione critica deve essere loggata:
- Assegnazione item a slot
- Spostamento item tra slot
- Vendita fisica
- Creazione ordine online
- Modifica status teca

---

## ⚡ Performance e Ottimizzazioni

### Database Indexes
```prisma
// VaultCase
@@index([shopId])
@@index([status])
@@index([status, shopId]) // Composite per query frequenti

// VaultCaseSlot
@@index([caseId])
@@index([qrToken]) // Unique già presente
@@index([status])
@@index([caseId, status]) // Composite per filtri

// VaultItem
@@index([shopIdCurrent])
@@index([caseId])
@@index([slotId]) // Unique già presente
@@index([status])
@@index([shopIdCurrent, status]) // Composite
```

### Query Ottimizzate

#### Lista Teche con Slot Count
```typescript
// ❌ LENTO: N+1 query
const cases = await prisma.vaultCase.findMany()
for (const case_ of cases) {
  const occupied = await prisma.vaultCaseSlot.count({ 
    where: { caseId: case_.id, status: 'OCCUPIED' } 
  })
}

// ✅ VELOCE: Aggregazione SQL
const cases = await prisma.vaultCase.findMany({
  include: {
    _count: {
      select: {
        slots: { where: { status: 'OCCUPIED' } }
      }
    }
  }
})
```

#### Vista Teca Completa (30 Slot)
```typescript
// ✅ Carica tutto in una query
const case_ = await prisma.vaultCase.findUnique({
  where: { id: caseId },
  include: {
    slots: {
      include: {
        item: {
          include: {
            owner: { select: { id: true, email: true } }
          }
        }
      },
      orderBy: { slotCode: 'asc' } // S01, S02, ..., S30
    }
  }
})
```

### Paginazione
- ✅ Lista teche: max 50 per pagina
- ✅ Lista item: max 100 per pagina
- ✅ Lista depositi: max 50 per pagina
- ✅ Cursor-based pagination per grandi dataset

### Cache Strategy
- ✅ Cache slot info (TTL 5 minuti)
- ✅ Cache lista teche merchant (TTL 2 minuti)
- ✅ Invalidation immediata su update

---

## 🧪 Test Plan

### Unit Tests
- ✅ Validazione assegnazione slot (race condition)
- ✅ Calcolo split ricavi (70/20/10)
- ✅ Transizioni state machine
- ✅ Generazione QR token

### Integration Tests
- ✅ Flusso completo: Deposito → Review → Assegnazione → Posizionamento → Vendita
- ✅ Spostamento item tra slot
- ✅ Vendita fisica con split ricavi
- ✅ Ordine online con fulfillment

### Load Tests
- ✅ 1000+ scan QR simultanei
- ✅ 100+ assegnazioni slot simultanee
- ✅ Query lista teche con 100+ teche

### Edge Cases
- ✅ Slot occupato quando si tenta di assegnare
- ✅ Item già venduto quando si tenta di vendere
- ✅ Teca ritirata quando si tenta di usare slot
- ✅ Doppia assegnazione stessa carta

---

## 📅 Piano Implementazione

### Fase 1: Core Robustezza (PRIORITÀ 1)
1. ✅ Transazioni atomiche per assegnazione slot
2. ✅ Lock pessimistico su slot durante operazioni
3. ✅ Validazioni complete server-side
4. ✅ Audit log per tutte le operazioni critiche

### Fase 2: Performance (PRIORITÀ 2)
1. ✅ Ottimizzazione query con include/aggregation
2. ✅ Paginazione su tutte le liste
3. ✅ Indici database ottimizzati
4. ✅ Cache per query frequenti

### Fase 3: UI Completa (PRIORITÀ 3)
1. ✅ Dashboard hub completa
2. ✅ Dashboard merchant completa
3. ✅ Vista teca con griglia 30 slot
4. ✅ Generazione/stampa QR

### Fase 4: Test e Validazione (PRIORITÀ 4)
1. ✅ Test unitari critici
2. ✅ Test integrazione flussi completi
3. ✅ Load test con molte teche
4. ✅ Validazione edge cases

---

## ✅ Checklist Implementazione

### Database
- [x] Schema completo con tutti i modelli
- [x] Indici ottimizzati
- [ ] Trigger per sincronizzazione automatica (opzionale)
- [ ] Job cron per verifica integrità (opzionale)

### API
- [x] Endpoint hub completi
- [x] Endpoint merchant completi
- [x] Endpoint pubblico scan QR
- [ ] Rate limiting implementato
- [ ] Validazioni complete

### UI
- [x] Pagine hub base
- [x] Pagine merchant base
- [ ] Dashboard complete con stats
- [ ] Vista teca completa
- [ ] Generazione QR stampa

### Sicurezza
- [x] Validazioni server-side
- [x] Autorizzazioni per ruolo
- [ ] Audit log completo
- [ ] Rate limiting

### Performance
- [x] Query ottimizzate
- [x] Paginazione
- [ ] Cache implementata
- [ ] Load test eseguiti

---

**Prossimo Step**: Iniziare implementazione Fase 1 (Core Robustezza)

