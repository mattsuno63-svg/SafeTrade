# 🛡️ SafeTrade Escrow System - Implementazione Completa

## 📋 Overview

Sistema di escrow completo implementato per SafeTrade che collega venditore, acquirente e negoziante in sessioni sicure con gestione del denaro e protezioni anti-truffa.

---

## 🗄️ Database Schema

### Nuovi Modelli Aggiunti

#### 1. **EscrowSession**
Collega i 3 attori (buyer, seller, merchant) in una sessione di comunicazione sicura.

**Campi principali:**
- `transactionId` - Link alla transazione SafeTrade
- `buyerId`, `sellerId`, `merchantId` - I 3 partecipanti
- `status` - ACTIVE, COMPLETED, CANCELLED, DISPUTED
- `lastActivity` - Timestamp ultima attività

#### 2. **EscrowMessage**
Messaggi nella sessione escrow.

**Campi principali:**
- `sessionId` - Link alla sessione
- `senderId` - Chi ha inviato il messaggio
- `content` - Contenuto del messaggio
- `isSystem` - Se è un messaggio di sistema
- `readBy` - Array di user IDs che hanno letto

#### 3. **EscrowPayment**
Gestione pagamenti in escrow con protezioni anti-truffa.

**Campi principali:**
- `transactionId` - Link alla transazione
- `amount` - Importo in escrow
- `status` - PENDING, HELD, RELEASED, REFUNDED, CANCELLED
- `paymentMethod` - CASH, ONLINE, BANK_TRANSFER
- `riskScore` - Score di rischio (0-100)
- `flaggedForReview` - Se necessita review admin
- `paymentHeldAt`, `paymentReleasedAt`, `paymentRefundedAt` - Timestamps

#### 4. **EscrowWallet** (per future implementazioni online)
Wallet utente per pagamenti online.

#### 5. **EscrowWalletTransaction**
Storico transazioni wallet.

---

## 🔌 API Endpoints

### Sessioni Escrow

#### `GET /api/escrow/sessions`
Ottiene tutte le sessioni dell'utente corrente.

**Query params:**
- `transactionId` - Filtra per transazione specifica

#### `GET /api/escrow/sessions/[sessionId]`
Ottiene una sessione specifica con tutti i dettagli.

#### `POST /api/escrow/sessions`
Crea una nuova sessione escrow (chiamata automaticamente quando si crea una transazione).

#### `GET /api/escrow/sessions/[sessionId]/messages`
Ottiene i messaggi della sessione.

#### `POST /api/escrow/sessions/[sessionId]/messages`
Invia un messaggio nella sessione.

### Pagamenti Escrow

#### `GET /api/escrow/payments`
Ottiene tutti i pagamenti dell'utente.

**Query params:**
- `transactionId` - Filtra per transazione specifica

#### `POST /api/escrow/payments`
Inizia un pagamento escrow.

**Body:**
```json
{
  "transactionId": "string",
  "amount": number,
  "paymentMethod": "CASH" | "ONLINE" | "BANK_TRANSFER"
}
```

#### `POST /api/escrow/payments/[paymentId]/hold`
Trattiene i fondi in escrow (solo merchant, quando conferma il pagamento al negozio).

#### `POST /api/escrow/payments/[paymentId]/release`
Rilascia i fondi al venditore (solo merchant, dopo verifica transazione).

#### `POST /api/escrow/payments/[paymentId]/refund`
Rimborsa i fondi all'acquirente (merchant o admin, in caso di problemi).

**Body:**
```json
{
  "reason": "string (opzionale)"
}
```

---

## 🔄 Flow Completo

### 1. Creazione Transazione → Sessione Escrow
Quando viene creata una `SafeTradeTransaction`:
- ✅ Viene automaticamente creata una `EscrowSession`
- ✅ Vengono notificati tutti e 3 i partecipanti
- ✅ Viene creato un messaggio di sistema nella sessione

### 2. Inizio Pagamento
- Acquirente può iniziare il pagamento tramite UI
- Viene creato un `EscrowPayment` con status `PENDING`
- Viene calcolato un `riskScore` (0-100)
- Se `riskScore > 70`, viene `flaggedForReview`

### 3. Conferma Pagamento al Negozio
- Merchant conferma il pagamento ricevuto
- Chiama `/api/escrow/payments/[id]/hold`
- Status passa a `HELD`
- Fondi sono ora trattenuti in escrow

### 4. Verifica Transazione
- Merchant verifica le carte e completa la transazione
- Chiama `/api/transactions/[id]/verify`
- **Automaticamente** viene rilasciato il pagamento se esiste
- Status pagamento passa a `RELEASED`
- Sessione escrow passa a `COMPLETED`

### 5. Rimborso (se necessario)
- Merchant o Admin può rimborsare i fondi
- Chiama `/api/escrow/payments/[id]/refund`
- Status passa a `REFUNDED`
- Sessione escrow passa a `CANCELLED`

---

## 🛡️ Protezioni Anti-Truffa

### 1. Risk Scoring
Ogni pagamento riceve un `riskScore` basato su:
- **Nuovo utente** (< 30 giorni) = +20 punti
- **Transazione alta** (> €500) = +15 punti
- **Nessuna transazione precedente** = +10 punti
- **Merchant verificato** = -10 punti

**Score > 70** → `flaggedForReview = true`

### 2. Audit Trail Completo
- Tutti i cambiamenti di stato sono tracciati con timestamp
- `paymentHeldAt`, `paymentReleasedAt`, `paymentRefundedAt`
- `reviewNotes` per annotazioni admin

### 3. Permessi Rigidi
- Solo **merchant** può trattenere fondi
- Solo **merchant** può rilasciare fondi (dopo verifica)
- Solo **merchant o admin** può rimborsare
- Solo **partecipanti** possono vedere la sessione

### 4. Verifica Transazione Obbligatoria
- I fondi possono essere rilasciati **solo** se la transazione è `COMPLETED`
- Il sistema verifica automaticamente lo stato prima del rilascio

### 5. Messaggi di Sistema
- Tutte le azioni finanziarie generano messaggi di sistema
- Tracciabilità completa nella chat della sessione

---

## 🎨 UI Implementata

### 1. `/escrow/sessions`
Lista di tutte le sessioni escrow dell'utente con filtri.

### 2. `/escrow/sessions/[sessionId]`
Pagina dettaglio sessione con:
- **Info transazione** - Dettagli carta, partecipanti, negozio
- **Status pagamento** - Importo, metodo, risk score, flag review
- **Chat in tempo reale** - Messaggi tra i 3 partecipanti
- **Azioni merchant** - Hold, Release, Refund (se applicabile)
- **Lista partecipanti** - Buyer, Seller, Merchant con badge

---

## 🔗 Integrazioni

### API Transazioni Modificate

#### `POST /api/transactions`
Ora crea automaticamente:
- ✅ `EscrowSession`
- ✅ Messaggio di sistema iniziale
- ✅ Notifiche a tutti i partecipanti

#### `POST /api/transactions/[id]/verify`
Ora rilascia automaticamente:
- ✅ Pagamento escrow se esiste e è `HELD`
- ✅ Aggiorna sessione a `COMPLETED`
- ✅ Crea messaggio di sistema

---

## 📊 Stati e Transizioni

### EscrowSession Status
```
ACTIVE → COMPLETED (quando transazione completata)
ACTIVE → CANCELLED (quando pagamento rimborsato)
ACTIVE → DISPUTED (futuro: per dispute)
```

### EscrowPayment Status
```
PENDING → HELD (merchant conferma pagamento)
HELD → RELEASED (merchant verifica transazione)
HELD → REFUNDED (merchant/admin rimborsa)
PENDING → CANCELLED (transazione cancellata)
```

---

## 🚀 Funzionalità Future

### Pagamenti Online
- Integrazione con Stripe/PayPal
- `EscrowWallet` per gestire fondi utente
- Trasferimenti automatici
- Commissioni piattaforma

### Dispute
- Sistema di dispute per transazioni problematiche
- Intervento admin
- Risoluzione automatica o manuale

### Notifiche Real-time
- WebSocket per aggiornamenti live
- Notifiche push per mobile

---

## ✅ Checklist Implementazione

- [x] Modelli database (EscrowSession, EscrowPayment, EscrowMessage, EscrowWallet)
- [x] API sessioni escrow (GET, POST, messages)
- [x] API pagamenti escrow (GET, POST, hold, release, refund)
- [x] Integrazione con creazione transazione
- [x] Integrazione con verifica transazione
- [x] Risk scoring automatico
- [x] Protezioni permessi
- [x] UI pagina sessione dettaglio
- [x] UI lista sessioni
- [x] Chat in tempo reale (polling ogni 5s)
- [x] Messaggi di sistema
- [x] Notifiche per tutte le azioni
- [ ] Pagamenti online (futuro)
- [ ] WebSocket real-time (futuro)
- [ ] Sistema dispute (futuro)

---

## 🔒 Sicurezza

### Validazioni Implementate
- ✅ Verifica autenticazione su tutte le API
- ✅ Verifica permessi (solo partecipanti possono vedere)
- ✅ Verifica stato prima di azioni (es. solo HELD può essere RELEASED)
- ✅ Verifica transazione completata prima di rilasciare fondi
- ✅ Sanitizzazione input messaggi
- ✅ Rate limiting (da implementare)

### Audit Trail
- ✅ Tutti i cambiamenti tracciati con timestamp
- ✅ Messaggi di sistema per ogni azione finanziaria
- ✅ Review notes per annotazioni admin
- ✅ Risk score per identificare transazioni sospette

---

## 📝 Note Implementazione

### Risk Score Calculation
La funzione `calculateRiskScore()` in `/api/escrow/payments/route.ts` può essere estesa con:
- Storico transazioni utente
- Rating utente
- Pattern di comportamento
- Machine learning (futuro)

### Messaggi Sistema
I messaggi di sistema sono creati automaticamente per:
- Creazione sessione
- Inizio pagamento
- Trattenimento fondi
- Rilascio fondi
- Rimborso fondi

### Notifiche
Ogni azione importante genera notifiche per:
- Tutti i partecipanti (buyer, seller, merchant)
- Admin (se flaggedForReview)

---

**Ultimo aggiornamento**: 2025-01-29
**Versione**: 1.0
**Status**: ✅ Implementazione Base Completa

