# 🛡️ SafeTrade Escrow System - Analisi Completa e Task List

**Data Creazione**: 2025-01-XX  
**Scopo**: Analisi approfondita dei sistemi Escrow Fisico e Online, identificazione di bug, falle, miglioramenti e task complete per portare i sistemi alla massima potenza.

---

## 📋 Indice

1. [Sistema Escrow Fisico](#1-sistema-escrow-fisico)
2. [Sistema Escrow Online](#2-sistema-escrow-online)
3. [Flussi Comuni e Integrazioni](#3-flussi-comuni-e-integrazioni)
4. [Bug e Falle Identificate](#4-bug-e-falle-identificate)
5. [Miglioramenti e Feature Mancanti](#5-miglioramenti-e-feature-mancanti)
6. [Task List Completa](#6-task-list-completa)
7. [Test Plan](#7-test-plan)

---

## 1. Sistema Escrow Fisico

### 1.1 Overview
Il sistema escrow fisico permette a buyer e seller di incontrarsi in un negozio partner SafeTrade per completare una transazione con verifica fisica delle carte e pagamento in contanti.

### 1.2 Modelli Database Coinvolti

#### `SafeTradeTransaction`
- **Status**: `PENDING` → `CONFIRMED` → `COMPLETED` / `CANCELLED`
- **Campi chiave**:
  - `shopId`: Negozio dove avviene la transazione
  - `scheduledDate`, `scheduledTime`: Appuntamento
  - `verificationCode`: Codice per verifica (opzionale)
  - `status`: Stato transazione
  - `completedAt`: Timestamp completamento

#### `EscrowSession`
- **Status**: `ACTIVE` → `COMPLETED` / `CANCELLED` / `DISPUTED`
- **Campi chiave**:
  - `transactionId`: Link 1:1 con transazione
  - `buyerId`, `sellerId`, `merchantId`: I 3 partecipanti
  - `qrCode`: Codice QR univoco per scansione merchant
  - `qrScannedAt`, `qrScannedBy`: Tracking scansione QR
  - `totalAmount`, `feeAmount`, `finalAmount`: Calcoli fee
  - `paymentMethod`: `CASH` (per escrow fisico)

#### `EscrowPayment`
- **Status**: `PENDING` → `HELD` → `RELEASED` / `REFUNDED`
- **Campi chiave**:
  - `transactionId`: Link 1:1 con transazione
  - `amount`: Importo in escrow
  - `paymentMethod`: `CASH` per escrow fisico
  - `paymentHeldAt`: Quando merchant conferma pagamento
  - `paymentReleasedAt`: Quando fondi rilasciati (via PendingRelease)

#### `EscrowMessage`
- Messaggi nella sessione escrow
- `isSystem`: Messaggi automatici del sistema

### 1.3 Flusso Completo Escrow Fisico

#### **STEP 1: Creazione Transazione**
**Trigger**: Buyer accetta proposta o crea transazione diretta

**API**: `POST /api/transactions`
- Crea `SafeTradeTransaction` con status `PENDING`
- Genera QR code univoco: `ST-{transactionId}-{timestamp}-{random}`
- Crea automaticamente `EscrowSession` con:
  - `buyerId` = `userAId` (proposer)
  - `sellerId` = `userBId` (receiver)
  - `merchantId` = `shop.merchantId`
  - `qrCode` = QR generato
  - `status` = `ACTIVE`
- Calcola fee: `feeAmount = totalAmount * feePercentage / 100`
- Crea messaggio sistema nella sessione
- Notifica buyer, seller, merchant

**✅ Verifiche Necessarie**:
- [ ] Shop esiste e `isApproved = true`
- [ ] QR code è univoco (constraint `@unique`)
- [ ] Fee calcolata correttamente
- [ ] Notifiche inviate a tutti e 3

**❌ Bug Potenziali**:
- [ ] Race condition: QR code duplicato (molto improbabile con crypto.randomBytes)
- [ ] Se shop non ha `merchantId`, creazione sessione fallisce
- [ ] Se `totalAmount` non è passato, fee calcolata su 0

---

#### **STEP 2: Buyer/Seller Mostrano QR Code al Merchant**
**Trigger**: Buyer e Seller arrivano al negozio

**UI**: Buyer/Seller mostrano QR code dalla loro app
- Endpoint: `GET /api/escrow/sessions/[sessionId]/qr`
- Genera immagine QR code con payload JSON:
  ```json
  {
    "type": "ESCROW",
    "sessionId": "...",
    "qrCode": "...",
    "verifyUrl": "/merchant/verify/{qrCode}",
    "amount": 100.00
  }
  ```

**✅ Verifiche Necessarie**:
- [ ] QR code è valido e non scaduto
- [ ] Sessione esiste e status è `ACTIVE`
- [ ] QR code contiene tutte le info necessarie

**❌ Bug Potenziali**:
- [ ] QR code può essere scansionato più volte (non bloccato)
- [ ] Nessuna validazione che QR non sia già stato scansionato
- [ ] QR code non ha scadenza (dovrebbe scadere dopo X giorni?)

---

#### **STEP 3: Merchant Scansiona QR Code**
**Trigger**: Merchant scansiona QR code con scanner o inserisce manualmente

**API**: `POST /api/merchant/verify/scan`
- Accetta `qrData` (JSON string o URL)
- Parse QR data e estrae `qrCode`
- Cerca `EscrowSession` tramite `qrCode`
- Verifica merchant autorizzato (`merchantId === user.id` o `ADMIN`)
- Aggiorna `qrScannedAt` e `qrScannedBy` (solo se non già scansionato)
- Redirect a `/merchant/verify/[qrCode]`

**UI**: `/merchant/verify/[qrCode]`
- Mostra dettagli transazione
- Mostra buyer, seller, listing
- Mostra importo totale e fee
- Bottoni: "Verifica Transazione", "Rifiuta", "Scanner QR"

**✅ Verifiche Necessarie**:
- [ ] Merchant è autorizzato (shop owner o ADMIN)
- [ ] QR code non è già stato scansionato (opzionale, può essere scansionato più volte)
- [ ] Sessione esiste e status è `ACTIVE`
- [ ] Transaction status è `PENDING` o `CONFIRMED`

**❌ Bug Potenziali**:
- [ ] Nessuna validazione che merchant sia del negozio corretto
- [ ] QR code può essere scansionato da merchant non autorizzato (se hanno accesso al QR)
- [ ] Nessun rate limiting su scansione QR (DoS potenziale)

---

#### **STEP 4: Merchant Conferma Pagamento (Hold Funds)**
**Trigger**: Merchant conferma che buyer ha pagato in contanti

**API**: `POST /api/escrow/payments/[paymentId]/hold`
- Verifica payment status è `PENDING`
- Verifica merchant è autorizzato
- Aggiorna `EscrowPayment`:
  - `status` = `HELD`
  - `paymentHeldAt` = now
- Crea messaggio sistema nella sessione
- Notifica buyer e seller

**✅ Verifiche Necessarie**:
- [ ] Payment esiste e status è `PENDING`
- [ ] Merchant è autorizzato
- [ ] Transaction ha shop (shop-based escrow)
- [ ] Payment non è già `HELD`

**❌ Bug Potenziali**:
- [ ] Payment può essere hold più volte (non bloccato)
- [ ] Nessuna validazione che payment amount corrisponda a transaction amount
- [ ] Se payment non esiste, nessun errore chiaro

**⚠️ CRITICO**: Per escrow fisico, il payment dovrebbe essere creato PRIMA di arrivare al negozio, o il merchant dovrebbe poterlo creare al momento.

---

#### **STEP 5: Merchant Verifica Carte e Completa Transazione**
**Trigger**: Merchant verifica fisicamente le carte e conferma tutto OK

**API**: `POST /api/transactions/[id]/verify`
- Body: `{ code?: string, verified: boolean, notes?: string }`
- Se `verified === false`: Cancella transazione e rimborsa
- Se `verified === true` o code valido:
  - Aggiorna `SafeTradeTransaction`:
    - `status` = `COMPLETED`
    - `completedAt` = now
  - Se payment esiste e status è `HELD`:
    - Crea `PendingRelease` per rilascio fondi a seller
    - Tipo: `RELEASE_TO_SELLER`
    - Amount: `payment.amount` (o `payment.finalAmount` se fee già detratta)
  - Aggiorna listing: `isActive = false`, `isSold = true`
  - Crea messaggio sistema
  - Notifica buyer e seller
  - Crea `AdminNotification` per approvazione rilascio

**✅ Verifiche Necessarie**:
- [ ] Transaction status è `PENDING` o `CONFIRMED`
- [ ] Merchant è autorizzato (shop owner o ADMIN)
- [ ] Se code-based: `verificationCode` corrisponde
- [ ] Payment status è `HELD` (se esiste)
- [ ] Non esiste già `PendingRelease` per questa transazione

**❌ Bug Potenziali**:
- [ ] **CRITICO**: Se payment non esiste, transazione può essere completata senza pagamento
- [ ] **CRITICO**: Se payment status non è `HELD`, viene comunque creata PendingRelease
- [ ] Transaction può essere verificata più volte (non idempotente)
- [ ] Se listing non esiste, update fallisce silenziosamente
- [ ] Nessuna validazione che `completedAt` sia dopo `scheduledDate`

---

#### **STEP 6: Admin/Moderator Approva Rilascio Fondi**
**Trigger**: Admin/Moderator approva `PendingRelease`

**API**: `POST /api/admin/pending-releases/[id]/initiate-approval`
- Genera `confirmationToken` (valido 5 minuti)
- Aggiorna `PendingRelease`:
  - `confirmationToken` = token generato
  - `tokenExpiresAt` = now + 5 minuti

**API**: `POST /api/admin/pending-releases/[id]/confirm-approval`
- Verifica token valido e non scaduto
- Aggiorna `PendingRelease`:
  - `status` = `APPROVED`
  - `approvedAt` = now
  - `approvedBy` = user.id
- Aggiorna `EscrowPayment`:
  - `status` = `RELEASED`
  - `paymentReleasedAt` = now
- Aggiorna `EscrowSession`:
  - `status` = `COMPLETED`
- Crea audit log
- Notifica seller (recipient)

**✅ Verifiche Necessarie**:
- [ ] User è ADMIN o MODERATOR
- [ ] PendingRelease status è `PENDING`
- [ ] Token è valido e non scaduto
- [ ] Payment esiste e status è `HELD`
- [ ] Amount corrisponde

**❌ Bug Potenziali**:
- [ ] **CRITICO**: Se payment non esiste, approvazione fallisce ma PendingRelease viene approvata
- [ ] Token può essere riutilizzato (dovrebbe essere invalidato dopo uso)
- [ ] Nessuna validazione che amount non sia negativo o zero
- [ ] Se EscrowSession non esiste, update fallisce silenziosamente

---

#### **STEP 7: Rifiuto Transazione (Merchant)**
**Trigger**: Merchant rifiuta transazione durante verifica

**API**: `POST /api/transactions/[id]/verify` con `verified: false`
- Aggiorna `SafeTradeTransaction`:
  - `status` = `CANCELLED`
  - `notes` = motivo rifiuto
- Se payment esiste e status è `HELD`:
  - Aggiorna `EscrowPayment`:
    - `status` = `REFUNDED`
    - `paymentRefundedAt` = now
  - **PROBLEMA**: Dovrebbe creare `PendingRelease` tipo `REFUND_FULL` invece di rimborsare direttamente!
- Re-attiva listing: `isActive = true`, `isSold = false`
- Notifica buyer e seller

**❌ Bug Critici**:
- [ ] **CRITICO**: Rimborsa direttamente invece di creare PendingRelease
- [ ] Se payment status non è `HELD`, update fallisce silenziosamente
- [ ] Nessuna validazione che payment esista

---

### 1.4 Notifiche Escrow Fisico

**Notifiche da Implementare/Verificare**:
- [ ] `TRANSACTION_CREATED`: Buyer e Seller quando transazione creata
- [ ] `ESCROW_SESSION_CREATED`: Tutti e 3 quando sessione creata
- [ ] `QR_CODE_GENERATED`: Buyer e Seller quando QR code disponibile
- [ ] `QR_CODE_SCANNED`: Buyer e Seller quando merchant scansiona QR
- [ ] `ESCROW_PAYMENT_HELD`: Buyer e Seller quando payment held
- [ ] `TRANSACTION_VERIFIED`: Buyer e Seller quando transazione verificata
- [ ] `TRANSACTION_CANCELLED`: Buyer e Seller quando transazione cancellata
- [ ] `ESCROW_PAYMENT_RELEASED`: Seller quando fondi rilasciati
- [ ] `ESCROW_PAYMENT_REFUNDED`: Buyer quando fondi rimborsati

**❌ Bug Potenziali**:
- [ ] Notifiche duplicate se chiamate multiple volte
- [ ] Notifiche non inviate se errore in creazione
- [ ] Notifiche inviate anche se transazione fallita

---

## 2. Sistema Escrow Online

### 2.1 Overview
Il sistema escrow online permette pagamenti digitali (Stripe, PayPal, etc.) con fondi trattenuti fino a verifica fisica o completamento transazione.

### 2.2 Stato Attuale
**⚠️ ATTENZIONE**: Il sistema escrow online è **PARZIALMENTE IMPLEMENTATO**:
- Modello `EscrowPayment` supporta `paymentMethod: ONLINE`
- Campi `paymentProviderId`, `paymentProvider` esistono
- **MA**: Nessuna integrazione Stripe/PayPal implementata
- **MA**: Nessun flow completo per pagamenti online

### 2.3 Modelli Database Coinvolti

#### `EscrowPayment`
- `paymentMethod`: `ONLINE` (per escrow online)
- `paymentProvider`: `"stripe"`, `"paypal"`, etc.
- `paymentProviderId`: ID transazione provider esterno
- `status`: `PENDING` → `HELD` → `RELEASED` / `REFUNDED`

#### `EscrowWallet` (Futuro)
- Wallet utente per fondi online
- `balance`: Saldo disponibile
- `pendingBalance`: Fondi in transazioni pending

### 2.4 Flusso Previsto Escrow Online

#### **STEP 1: Buyer Inizia Pagamento Online**
**Trigger**: Buyer clicca "Pay Now" nella sessione escrow

**API**: `POST /api/escrow/payments` con `paymentMethod: "ONLINE"`
- Crea `EscrowPayment` con status `PENDING`
- Calcola `riskScore`
- Se `riskScore > 70`, flagga per review
- **DOVREBBE**: Creare Stripe Payment Intent con `capture_method: "manual"`
- **DOVREBBE**: Salvare `paymentProviderId` = Stripe Payment Intent ID
- **DOVREBBE**: Redirect buyer a Stripe Checkout

**❌ Mancante**:
- [ ] Integrazione Stripe SDK
- [ ] Creazione Payment Intent
- [ ] Redirect a Stripe Checkout
- [ ] Webhook handler per eventi Stripe

---

#### **STEP 2: Buyer Completa Pagamento Stripe**
**Trigger**: Buyer completa pagamento su Stripe

**Webhook**: `POST /api/webhooks/stripe`
- Evento: `payment_intent.succeeded`
- Aggiorna `EscrowPayment`:
  - `status` = `HELD` (fondi autorizzati ma non ancora captured)
  - `paymentHeldAt` = now
- Notifica seller e merchant

**❌ Mancante**:
- [ ] Webhook endpoint Stripe
- [ ] Verifica firma webhook (sicurezza)
- [ ] Handler eventi Stripe

---

#### **STEP 3: Verifica Fisica (come Escrow Fisico)**
**Trigger**: Buyer e Seller si incontrano al negozio

**Flow**: Identico a escrow fisico (STEP 3-5)
- Merchant scansiona QR
- Merchant verifica carte
- Merchant completa transazione

**Differenza**: Payment è già `HELD` (fondi autorizzati su Stripe)

---

#### **STEP 4: Rilascio Fondi Online**
**Trigger**: Admin approva `PendingRelease`

**API**: `POST /api/admin/pending-releases/[id]/confirm-approval`
- **DOVREBBE**: Chiamare Stripe API per capture Payment Intent
- **DOVREBBE**: Trasferire fondi a seller (Stripe Connect o transfer)
- Aggiorna `EscrowPayment`:
  - `status` = `RELEASED`
  - `paymentReleasedAt` = now

**❌ Mancante**:
- [ ] Integrazione Stripe Capture API
- [ ] Stripe Connect per trasferimenti
- [ ] Gestione commissioni piattaforma
- [ ] Gestione fee merchant

---

#### **STEP 5: Rimborso Online**
**Trigger**: Transazione cancellata o dispute

**API**: `POST /api/escrow/payments/[paymentId]/refund`
- **DOVREBBE**: Chiamare Stripe API per refund
- Aggiorna `EscrowPayment`:
  - `status` = `REFUNDED`
  - `paymentRefundedAt` = now

**❌ Mancante**:
- [ ] Integrazione Stripe Refund API
- [ ] Gestione refund parziali
- [ ] Timeout automatico per refund (se merchant non risponde)

---

### 2.5 Feature Mancanti Escrow Online

**Integrazione Pagamenti**:
- [ ] Setup Stripe account e API keys
- [ ] Creazione Payment Intent con manual capture
- [ ] Stripe Checkout integration
- [ ] Webhook handler con verifica firma
- [ ] Stripe Connect per seller payouts
- [ ] Gestione commissioni (5% seller, 2% merchant, 3% platform)

**Sicurezza**:
- [ ] Rate limiting su creazione payment
- [ ] Validazione amount (min/max)
- [ ] Fraud detection avanzato
- [ ] 3D Secure per pagamenti high-value

**UX**:
- [ ] UI per pagamento online nella sessione escrow
- [ ] Status payment in real-time
- [ ] Email conferma pagamento
- [ ] Receipt digitale

---

## 3. Flussi Comuni e Integrazioni

### 3.1 Creazione Automatica EscrowSession
**Quando**: Creazione `SafeTradeTransaction`

**Codice**: `src/app/api/transactions/route.ts` (linea 272+)
- ✅ Crea `EscrowSession` automaticamente
- ✅ Genera QR code
- ✅ Calcola fee
- ✅ Crea messaggio sistema

**❌ Bug Potenziali**:
- [ ] Se creazione sessione fallisce, transazione viene comunque creata (inconsistenza)
- [ ] Nessuna transazione DB (dovrebbe essere atomica)
- [ ] Se shop non ha `merchantId`, creazione fallisce silenziosamente

---

### 3.2 Calcolo Fee
**Codice**: `src/lib/escrow-fee.ts` (presumibilmente)

**Formula**:
- `feeAmount = totalAmount * feePercentage / 100`
- Se `feePaidBy === 'SELLER'`: `finalAmount = totalAmount - feeAmount`
- Se `feePaidBy === 'BUYER'`: `finalAmount = totalAmount` (fee aggiunta)
- Se `feePaidBy === 'SPLIT'`: `finalAmount = totalAmount - (feeAmount / 2)`

**❌ Bug Potenziali**:
- [ ] Arrotondamento errori (dovrebbe usare Decimal)
- [ ] Fee negativa se `feePercentage < 0`
- [ ] Fee > 100% non validata

---

### 3.3 Risk Score Calculation
**Codice**: `src/app/api/escrow/payments/route.ts` (linea 207+)

**Fattori**:
- Nuovo utente (< 30 giorni): +20
- Transazione high-value (>€500): +15
- Nessuna transazione precedente: +10
- Shop approvato: -10

**❌ Bug Potenziali**:
- [ ] Risk score non considera dispute precedenti
- [ ] Risk score non considera rating utente
- [ ] Risk score può essere > 100 (clamped ma non ideale)

---

## 4. Bug e Falle Identificate

### 4.1 Bug Critici

#### **BUG #1: Payment Non Creato per Escrow Fisico**
**Problema**: Per escrow fisico, il payment può non esistere quando merchant verifica transazione.

**Scenario**:
1. Buyer crea transazione
2. EscrowSession creata automaticamente
3. Buyer e Seller vanno al negozio
4. Merchant scansiona QR e verifica
5. **PROBLEMA**: Se payment non è stato creato, transazione viene completata senza payment

**Soluzione**:
- [ ] Creare `EscrowPayment` automaticamente quando creata transazione (con status `PENDING`)
- [ ] Oppure: Merchant può creare payment quando conferma pagamento in contanti

**File**: `src/app/api/transactions/route.ts`

---

#### **BUG #2: Rimborso Diretto invece di PendingRelease**
**Problema**: Quando merchant rifiuta transazione, payment viene rimborsato direttamente invece di creare `PendingRelease`.

**Scenario**:
1. Payment status `HELD`
2. Merchant rifiuta transazione
3. **PROBLEMA**: Payment aggiornato direttamente a `REFUNDED` invece di creare `PendingRelease`

**Soluzione**:
- [ ] Creare `PendingRelease` tipo `REFUND_FULL` quando merchant rifiuta
- [ ] Admin deve approvare rimborso

**File**: `src/app/api/transactions/[id]/verify/route.ts` (linea 84-97)

---

#### **BUG #3: Transaction Può Essere Verificata Più Volte**
**Problema**: Nessuna validazione che transaction non sia già `COMPLETED`.

**Scenario**:
1. Merchant verifica transazione → status `COMPLETED`
2. Merchant verifica di nuovo (per errore o attacco)
3. **PROBLEMA**: Viene creata nuova `PendingRelease` duplicata

**Soluzione**:
- [ ] Verificare che transaction status non sia già `COMPLETED` o `CANCELLED`
- [ ] Verificare che non esista già `PendingRelease` per questa transazione

**File**: `src/app/api/transactions/[id]/verify/route.ts` (linea 136)

---

#### **BUG #4: QR Code Può Essere Scansionato da Merchant Non Autorizzato**
**Problema**: Se qualcuno ottiene il QR code, può scansionarlo anche se non è il merchant autorizzato.

**Scenario**:
1. Buyer mostra QR code a qualcuno
2. Qualcuno (non merchant) scansiona QR
3. **PROBLEMA**: Sistema non verifica che scanner sia il merchant autorizzato

**Soluzione**:
- [ ] Verificare che `user.id === session.merchantId` quando si scansiona QR
- [ ] Aggiungere validazione in `POST /api/merchant/verify/scan`

**File**: `src/app/api/merchant/verify/scan/route.ts` (linea 125-131)

---

#### **BUG #5: Payment Amount Non Validato**
**Problema**: Quando si crea payment, amount non viene validato contro transaction amount.

**Scenario**:
1. Transaction amount: €100
2. Buyer crea payment con amount: €50
3. **PROBLEMA**: Payment creato con amount errato

**Soluzione**:
- [ ] Validare che `payment.amount === escrowSession.totalAmount` (o almeno ±5% per negoziazione)
- [ ] Oppure: Usare sempre `escrowSession.totalAmount` per payment

**File**: `src/app/api/escrow/payments/route.ts` (linea 76+)

---

### 4.2 Bug Minori

#### **BUG #6: Nessuna Scadenza QR Code**
**Problema**: QR code non scade mai, può essere usato anche dopo mesi.

**Soluzione**:
- [ ] Aggiungere `qrCodeExpiresAt` a `EscrowSession`
- [ ] Validare scadenza quando si scansiona QR

---

#### **BUG #7: Notifiche Duplicate**
**Problema**: Se API chiamata più volte, notifiche duplicate.

**Soluzione**:
- [ ] Usare idempotency key per notifiche
- [ ] Verificare che notifica non esista già prima di creare

---

#### **BUG #8: Nessun Rate Limiting**
**Problema**: Nessun rate limiting su creazione payment o scansione QR.

**Soluzione**:
- [ ] Implementare rate limiting con Redis o middleware
- [ ] Limite: max 10 payment/ora per utente
- [ ] Limite: max 50 scan QR/ora per merchant

---

## 5. Miglioramenti e Feature Mancanti

### 5.1 Feature Mancanti Escrow Fisico

#### **FEATURE #1: Scheduling Appuntamenti**
**Stato**: Parzialmente implementato (`scheduledDate`, `scheduledTime`)

**Mancante**:
- [ ] UI per selezionare data/ora disponibile
- [ ] Validazione che shop sia aperto in quel momento
- [ ] Notifica reminder 24h prima
- [ ] Possibilità di modificare/cancellare appuntamento

---

#### **FEATURE #2: Verifica Codice Alternativa**
**Stato**: Implementato (`verificationCode`)

**Miglioramenti**:
- [ ] Generazione codice più sicuro (6 cifre invece di 4?)
- [ ] Codice scade dopo X minuti
- [ ] Limite tentativi (max 3)

---

#### **FEATURE #3: Dispute durante Verifica**
**Stato**: Non implementato

**Mancante**:
- [ ] Buyer/Seller possono aprire dispute durante verifica
- [ ] Merchant può vedere dispute e decidere
- [ ] Admin può intervenire

---

#### **FEATURE #4: Multi-Item Transactions**
**Stato**: Non supportato

**Mancante**:
- [ ] Supporto per più listing in una transazione
- [ ] Verifica item per item
- [ ] Payment parziale per item verificati

---

### 5.2 Feature Mancanti Escrow Online

#### **FEATURE #5: Integrazione Stripe Completa**
**Stato**: Non implementato

**Mancante**:
- [ ] Setup Stripe account
- [ ] Payment Intent con manual capture
- [ ] Stripe Checkout
- [ ] Webhook handler
- [ ] Stripe Connect per payouts

---

#### **FEATURE #6: Escrow Wallet**
**Stato**: Modello esiste ma non utilizzato

**Mancante**:
- [ ] UI per depositare fondi nel wallet
- [ ] UI per prelevare fondi
- [ ] Integrazione con Stripe per deposit/withdraw
- [ ] Storico transazioni wallet

---

#### **FEATURE #7: Pagamenti Parziali**
**Stato**: Non supportato

**Mancante**:
- [ ] Supporto per pagare transazione in rate
- [ ] Rilascio fondi parziali
- [ ] Gestione scadenze rate

---

### 5.3 Miglioramenti Generali

#### **IMPROVEMENT #1: Audit Trail Completo**
**Stato**: Parzialmente implementato

**Mancante**:
- [ ] Log tutte le azioni su escrow (chi, quando, cosa)
- [ ] Log modifiche payment status
- [ ] Log accessi QR code
- [ ] Dashboard admin per vedere audit trail

---

#### **IMPROVEMENT #2: Real-time Updates**
**Stato**: Parzialmente implementato (Supabase Realtime)

**Miglioramenti**:
- [ ] Real-time status payment
- [ ] Real-time messaggi sessione
- [ ] Real-time notifiche
- [ ] WebSocket per aggiornamenti istantanei

---

#### **IMPROVEMENT #3: Analytics e Reporting**
**Stato**: Non implementato

**Mancante**:
- [ ] Dashboard merchant con statistiche escrow
- [ ] Report transazioni completate
- [ ] Report fee raccolte
- [ ] Report dispute rate

---

## 6. Task List Completa

### 6.1 Task Critiche (Priorità Alta)

#### **TASK #1: Fix Payment Non Creato per Escrow Fisico**
**File**: `src/app/api/transactions/route.ts`
- [ ] Creare `EscrowPayment` automaticamente quando creata transazione
- [ ] Status: `PENDING`
- [ ] Amount: `escrowSession.totalAmount`
- [ ] PaymentMethod: `CASH`
- [ ] Test: Verificare che payment esista dopo creazione transazione

---

#### **TASK #2: Fix Rimborso Diretto**
**File**: `src/app/api/transactions/[id]/verify/route.ts`
- [ ] Quando merchant rifiuta, creare `PendingRelease` tipo `REFUND_FULL`
- [ ] Non aggiornare direttamente payment status
- [ ] Admin deve approvare rimborso
- [ ] Test: Verificare che rimborso richieda approvazione admin

---

#### **TASK #3: Fix Transaction Verificata Più Volte**
**File**: `src/app/api/transactions/[id]/verify/route.ts`
- [ ] Verificare che transaction status non sia già `COMPLETED` o `CANCELLED`
- [ ] Verificare che non esista già `PendingRelease` per questa transazione
- [ ] Ritornare errore se già verificata
- [ ] Test: Tentare di verificare transazione già completata

---

#### **TASK #4: Fix QR Code Autorizzazione**
**File**: `src/app/api/merchant/verify/scan/route.ts`
- [ ] Verificare che `user.id === session.merchantId` quando si scansiona QR
- [ ] Ritornare errore 403 se merchant non autorizzato
- [ ] Test: Tentare di scansionare QR con merchant non autorizzato

---

#### **TASK #5: Validazione Payment Amount**
**File**: `src/app/api/escrow/payments/route.ts`
- [ ] Validare che `payment.amount === escrowSession.totalAmount` (±5% tolleranza)
- [ ] Oppure: Usare sempre `escrowSession.totalAmount` per payment
- [ ] Test: Tentare di creare payment con amount errato

---

### 6.2 Task Importanti (Priorità Media)

#### **TASK #6: Scadenza QR Code**
**File**: `prisma/schema.prisma`, `src/app/api/transactions/route.ts`, `src/app/api/merchant/verify/scan/route.ts`
- [ ] Aggiungere campo `qrCodeExpiresAt` a `EscrowSession`
- [ ] Impostare scadenza a 7 giorni dalla creazione
- [ ] Validare scadenza quando si scansiona QR
- [ ] Test: Tentare di scansionare QR scaduto

---

#### **TASK #7: Idempotency per Notifiche**
**File**: Tutti i file che creano notifiche
- [ ] Aggiungere idempotency key alle notifiche
- [ ] Verificare che notifica non esista già prima di creare
- [ ] Test: Chiamare API più volte e verificare una sola notifica

---

#### **TASK #8: Rate Limiting**
**File**: Middleware o API routes
- [ ] Implementare rate limiting con Redis
- [ ] Limite: max 10 payment/ora per utente
- [ ] Limite: max 50 scan QR/ora per merchant
- [ ] Test: Tentare di superare limiti

---

#### **TASK #9: Transazione DB per Creazione Sessione**
**File**: `src/app/api/transactions/route.ts`
- [ ] Usare `prisma.$transaction()` per creare transaction e session atomicamente
- [ ] Se creazione session fallisce, rollback transaction
- [ ] Test: Simulare errore creazione session e verificare rollback

---

#### **TASK #10: Validazione Fee Calculation**
**File**: `src/lib/escrow-fee.ts` (se esiste) o `src/app/api/transactions/route.ts`
- [ ] Validare che `feePercentage` sia tra 0 e 100
- [ ] Usare Decimal per calcoli (evitare errori arrotondamento)
- [ ] Test: Calcolare fee con vari valori e verificare correttezza

---

### 6.3 Task Feature (Priorità Bassa)

#### **TASK #11: Scheduling Appuntamenti UI**
**File**: Nuovo componente
- [ ] UI per selezionare data/ora disponibile
- [ ] Integrazione con calendario shop
- [ ] Notifica reminder 24h prima
- [ ] Test: Creare appuntamento e verificare notifica

---

#### **TASK #12: Dispute durante Verifica**
**File**: Nuovi endpoint e UI
- [ ] Endpoint per aprire dispute durante verifica
- [ ] UI per merchant per vedere dispute
- [ ] UI per admin per intervenire
- [ ] Test: Aprire dispute e verificare flow

---

#### **TASK #13: Integrazione Stripe Completa**
**File**: Nuovi file per Stripe
- [ ] Setup Stripe account e API keys
- [ ] Creare Payment Intent con manual capture
- [ ] Integrare Stripe Checkout
- [ ] Webhook handler con verifica firma
- [ ] Stripe Connect per seller payouts
- [ ] Test: Flow completo pagamento online

---

#### **TASK #14: Escrow Wallet UI**
**File**: Nuovi componenti
- [ ] UI per depositare fondi
- [ ] UI per prelevare fondi
- [ ] Integrazione con Stripe
- [ ] Storico transazioni
- [ ] Test: Depositare e prelevare fondi

---

#### **TASK #15: Audit Trail Dashboard**
**File**: Nuova pagina admin
- [ ] Dashboard per vedere audit trail
- [ ] Filtri per tipo azione, utente, data
- [ ] Export log
- [ ] Test: Verificare che tutte le azioni siano loggate

---

## 7. Test Plan

### 7.1 Test Escrow Fisico

#### **Test Case #1: Creazione Transazione Completa**
**Steps**:
1. Buyer crea proposta
2. Seller accetta
3. Buyer crea transazione con shop
4. Verificare:
   - [ ] `SafeTradeTransaction` creata con status `PENDING`
   - [ ] `EscrowSession` creata automaticamente
   - [ ] `EscrowPayment` creata automaticamente (dopo TASK #1)
   - [ ] QR code generato e univoco
   - [ ] Notifiche inviate a buyer, seller, merchant

**Expected**: Tutto creato correttamente

---

#### **Test Case #2: Scansione QR Code**
**Steps**:
1. Merchant scansiona QR code
2. Verificare:
   - [ ] `qrScannedAt` e `qrScannedBy` aggiornati
   - [ ] Merchant può vedere dettagli transazione
   - [ ] Merchant non autorizzato riceve errore 403 (dopo TASK #4)

**Expected**: QR scansionato correttamente

---

#### **Test Case #3: Hold Payment**
**Steps**:
1. Merchant conferma pagamento in contanti
2. Chiama `POST /api/escrow/payments/[id]/hold`
3. Verificare:
   - [ ] Payment status = `HELD`
   - [ ] `paymentHeldAt` impostato
   - [ ] Notifiche inviate

**Expected**: Payment held correttamente

---

#### **Test Case #4: Verifica Transazione**
**Steps**:
1. Merchant verifica carte
2. Chiama `POST /api/transactions/[id]/verify` con `verified: true`
3. Verificare:
   - [ ] Transaction status = `COMPLETED`
   - [ ] `PendingRelease` creata per seller
   - [ ] Listing marcata come sold
   - [ ] Notifiche inviate
   - [ ] Tentare di verificare di nuovo → errore (dopo TASK #3)

**Expected**: Transazione completata correttamente

---

#### **Test Case #5: Rifiuto Transazione**
**Steps**:
1. Merchant rifiuta transazione
2. Chiama `POST /api/transactions/[id]/verify` con `verified: false`
3. Verificare:
   - [ ] Transaction status = `CANCELLED`
   - [ ] `PendingRelease` creata per rimborso buyer (dopo TASK #2)
   - [ ] Listing re-attivata
   - [ ] Notifiche inviate

**Expected**: Transazione cancellata e rimborso richiesto

---

#### **Test Case #6: Approvazione Rilascio Fondi**
**Steps**:
1. Admin approva `PendingRelease`
2. Chiama `POST /api/admin/pending-releases/[id]/initiate-approval`
3. Chiama `POST /api/admin/pending-releases/[id]/confirm-approval` con token
4. Verificare:
   - [ ] `PendingRelease` status = `APPROVED`
   - [ ] `EscrowPayment` status = `RELEASED`
   - [ ] `EscrowSession` status = `COMPLETED`
   - [ ] Notifiche inviate

**Expected**: Fondi rilasciati correttamente

---

### 7.2 Test Escrow Online

#### **Test Case #7: Creazione Payment Online**
**Steps**:
1. Buyer crea payment con `paymentMethod: "ONLINE"`
2. Verificare:
   - [ ] Stripe Payment Intent creato (dopo TASK #13)
   - [ ] `EscrowPayment` creata con `paymentProviderId`
   - [ ] Redirect a Stripe Checkout

**Expected**: Payment Intent creato

---

#### **Test Case #8: Completamento Pagamento Stripe**
**Steps**:
1. Buyer completa pagamento su Stripe
2. Webhook `payment_intent.succeeded` ricevuto
3. Verificare:
   - [ ] `EscrowPayment` status = `HELD`
   - [ ] `paymentHeldAt` impostato
   - [ ] Notifiche inviate

**Expected**: Payment held dopo pagamento Stripe

---

#### **Test Case #9: Rilascio Fondi Online**
**Steps**:
1. Admin approva `PendingRelease`
2. Verificare:
   - [ ] Stripe Payment Intent captured (dopo TASK #13)
   - [ ] Fondi trasferiti a seller (Stripe Connect)
   - [ ] `EscrowPayment` status = `RELEASED`

**Expected**: Fondi rilasciati via Stripe

---

#### **Test Case #10: Rimborso Online**
**Steps**:
1. Transazione cancellata
2. Admin approva rimborso
3. Verificare:
   - [ ] Stripe Refund creato (dopo TASK #13)
   - [ ] `EscrowPayment` status = `REFUNDED`
   - [ ] Fondi rimborsati a buyer

**Expected**: Rimborso completato via Stripe

---

### 7.3 Test Sicurezza

#### **Test Case #11: Autorizzazioni**
**Steps**:
1. Tentare di scansionare QR con merchant non autorizzato
2. Tentare di verificare transazione con utente non merchant
3. Tentare di approvare release con utente non admin
4. Verificare:
   - [ ] Tutti gli accessi non autorizzati ricevono 403

**Expected**: Autorizzazioni funzionano correttamente

---

#### **Test Case #12: Rate Limiting**
**Steps**:
1. Creare 15 payment in un'ora (limite: 10)
2. Scansionare 60 QR in un'ora (limite: 50)
3. Verificare:
   - [ ] Rate limit applicato correttamente
   - [ ] Errori 429 ritornati

**Expected**: Rate limiting funziona

---

#### **Test Case #13: QR Code Scaduto**
**Steps**:
1. Creare transazione
2. Aspettare 8 giorni (scadenza: 7 giorni)
3. Tentare di scansionare QR
4. Verificare:
   - [ ] Errore "QR code scaduto" (dopo TASK #6)

**Expected**: QR scaduto non funziona

---

## 8. Priorità Implementazione

### Fase 1: Fix Critici (Settimana 1)
1. TASK #1: Fix Payment Non Creato
2. TASK #2: Fix Rimborso Diretto
3. TASK #3: Fix Transaction Verificata Più Volte
4. TASK #4: Fix QR Code Autorizzazione
5. TASK #5: Validazione Payment Amount

### Fase 2: Miglioramenti Sicurezza (Settimana 2)
6. TASK #6: Scadenza QR Code
7. TASK #7: Idempotency Notifiche
8. TASK #8: Rate Limiting
9. TASK #9: Transazione DB
10. TASK #10: Validazione Fee

### Fase 3: Feature Escrow Online (Settimana 3-4)
11. TASK #13: Integrazione Stripe Completa
12. TASK #14: Escrow Wallet UI

### Fase 4: Feature Avanzate (Settimana 5+)
13. TASK #11: Scheduling Appuntamenti
14. TASK #12: Dispute durante Verifica
15. TASK #15: Audit Trail Dashboard

---

## 9. Note Finali

### 9.1 Considerazioni Sicurezza
- **QR Code**: Dovrebbe essere criptato o firmato per prevenire manomissioni
- **Payment Amount**: Dovrebbe essere validato lato server (non solo client)
- **Webhook Stripe**: Dovrebbe verificare firma per prevenire attacchi
- **Rate Limiting**: Essenziale per prevenire DoS

### 9.2 Considerazioni Performance
- **Database Indexes**: Verificare che tutti i campi usati in query siano indicizzati
- **Caching**: Considerare caching per sessioni attive
- **Real-time**: Usare Supabase Realtime per aggiornamenti istantanei

### 9.3 Considerazioni UX
- **Loading States**: Mostrare loading durante operazioni async
- **Error Messages**: Messaggi di errore chiari e utili
- **Confirmation Dialogs**: Conferma per azioni critiche (rilascio fondi, rimborso)
- **Notifications**: Notifiche chiare per ogni step

---

**Fine Documento**

**Prossimi Passi**:
1. Rivedere questo documento con il team
2. Prioritizzare task in base a business needs
3. Assegnare task agli sviluppatori
4. Iniziare implementazione Fase 1

