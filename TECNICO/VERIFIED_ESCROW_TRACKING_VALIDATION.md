# 🔒 Verified Escrow - Sistema Validazione Tracking

**Data**: 2025-01-27  
**Obiettivo**: Prevenire tracking number falsi/errati e mantenere controllo admin sulle spedizioni

---

## 🎯 Problema Risolto

**Prima**:
- Seller inseriva tracking → immediatamente attivo (`AWAITING_HUB_RECEIPT`)
- Admin non sapeva quando tracking veniva inserito
- Tracking falsi/errati potevano essere inseriti senza controllo
- Perdita controllo spedizioni

**Dopo**:
- Seller inserisce tracking → crea `AdminNotification` per validazione
- Status rimane `PENDING_ESCROW_SETUP` finché admin non valida
- Admin deve validare tracking prima che diventi "attivo"
- Tracking validati → status diventa `AWAITING_HUB_RECEIPT`

---

## 🔄 Flusso Completo

### **Step 1: Transazione Verified Escrow Creata**
- Seller sceglie Verified Escrow
- **Transazione creata** con status `PENDING_ESCROW_SETUP`
- **✅ AdminNotification creata**: `URGENT_ACTION` / `TRANSACTION`
- Admin riceve notifica: "Nuova Transazione Verified Escrow"

### **Step 2: Seller Inserisce Tracking**
- Seller va a `/transaction/[id]/verified-escrow/setup`
- Seller inserisce tracking number dal corriere
- **Tracking salvato** in `transaction.trackingNumber`
- **Status rimane `PENDING_ESCROW_SETUP`** (non cambia!)
- **✅ AdminNotification creata**: `URGENT_ACTION` / `TRANSACTION`, priority `HIGH`
- Admin riceve notifica: "Tracking Inserito - Validazione Richiesta"

### **Step 3: Admin Valida Tracking**
- Admin va a `/admin/hub/packages/[id]`
- Admin vede tracking number inserito
- Admin clicca "Valida Tracking" o "Rifiuta Tracking"
- **Se VALIDATO**:
  - Status diventa `AWAITING_HUB_RECEIPT`
  - `packageStatus` diventa `IN_TRANSIT_TO_HUB`
  - Notifiche buyer/seller: "Tracking Validato"
- **Se RIFIUTATO**:
  - `trackingNumber` rimosso (null)
  - Notifica seller: "Tracking Rifiutato - Inserisci Nuovo Tracking"
  - Seller può inserire nuovo tracking

### **Step 4: Hub Staff Riceve Pacco**
- Pacco arriva fisicamente all'hub
- Hub Staff marca pacco come ricevuto
- Status diventa `HUB_RECEIVED`
- `packageStatus` diventa `RECEIVED_AT_HUB`

---

## 🛠️ Implementazione

### **1. API: Transazione Creata**
**File**: `src/app/api/transactions/route.ts`

```typescript
// Quando transazione VERIFIED viene creata
await prisma.adminNotification.create({
  data: {
    type: 'URGENT_ACTION',
    referenceType: 'TRANSACTION',
    referenceId: transaction.id,
    title: `📦 Nuova Transazione Verified Escrow - Ordine #${transaction.id.slice(0, 8)}`,
    message: `Nuova transazione Verified Escrow creata. Seller: ${transaction.userB.name || transaction.userB.email}, Buyer: ${transaction.userA.name || transaction.userA.email}, Importo: €${feeCalculation.totalAmount.toFixed(2)}. Il seller inserirà il tracking number a breve - organizzare ricezione pacchi.`,
    priority: 'NORMAL',
    targetRoles: ['ADMIN', 'HUB_STAFF'],
  },
})
```

### **2. API: Tracking Inserito**
**File**: `src/app/api/transactions/[id]/verified-escrow/track/route.ts`

```typescript
// Seller inserisce tracking - NON cambia status!
const updatedTransaction = await prisma.safeTradeTransaction.update({
  where: { id },
  data: {
    trackingNumber: trackingNumber.trim(),
    // Status rimane PENDING_ESCROW_SETUP
    notes: `Tracking number inserito da seller: ${trackingNumber.trim()} (${new Date().toISOString()}). In attesa di validazione admin.`,
  },
})

// Crea AdminNotification per validazione
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
```

### **3. API: Validazione Tracking**
**File**: `src/app/api/admin/hub/packages/[id]/validate-tracking/route.ts`

**POST** `/api/admin/hub/packages/[id]/validate-tracking`

**Body**:
```json
{
  "validated": true, // true = valida, false = rifiuta
  "rejectionReason": "Tracking number non valido" // Opzionale, solo se validated: false
}
```

**Validato**:
- Status → `AWAITING_HUB_RECEIPT`
- `packageStatus` → `IN_TRANSIT_TO_HUB`
- Notifiche buyer/seller: "Tracking Validato"

**Rifiutato**:
- `trackingNumber` → `null`
- Notifica seller: "Tracking Rifiutato - Inserisci Nuovo Tracking"

---

## 🔐 Sicurezza

### **Validazioni Implementate**:
- ✅ Solo seller può inserire tracking
- ✅ Tracking deve essere unico (no duplicati)
- ✅ Formato tracking valido (8-20 caratteri alfanumerici)
- ✅ Solo admin/hub_staff può validare
- ✅ Status corretto per validazione (`PENDING_ESCROW_SETUP`)
- ✅ `escrowPayment.status === 'HELD'` prima di permettere tracking

### **Prevenzione Tracking Falsi**:
- ✅ Tracking non diventa "attivo" fino a validazione admin
- ✅ Admin può verificare tracking con corriere
- ✅ Admin può rifiutare tracking e richiedere nuovo
- ✅ Audit trail completo (tutti i cambiamenti loggati)

---

## 📋 Notifiche Admin

### **Quando Vengono Create**:

1. **Transazione Verified Escrow Creata**
   - Tipo: `URGENT_ACTION`
   - Priority: `NORMAL`
   - Message: "Nuova transazione Verified Escrow creata..."

2. **Tracking Inserito**
   - Tipo: `URGENT_ACTION`
   - Priority: `HIGH`
   - Message: "Seller ha inserito tracking number: XXX..."

### **Click Notifica**:
- Notifiche di tipo `TRANSACTION` → `/admin/hub/packages/[id]`
- Admin può vedere dettagli transazione e validare tracking

---

## ✅ Vantaggi

1. **Controllo Totale**: Admin sa sempre quando transazioni vengono create e quando tracking vengono inseriti
2. **Prevenzione Frodi**: Tracking falsi vengono bloccati prima di diventare "attivi"
3. **Organizzazione Spedizioni**: Admin può organizzare ricezione pacchi in anticipo
4. **Tracciabilità**: Audit trail completo di tutte le azioni
5. **Flessibilità**: Admin può rifiutare tracking errati e richiedere nuovi

---

**Ultimo aggiornamento**: 2025-01-27

