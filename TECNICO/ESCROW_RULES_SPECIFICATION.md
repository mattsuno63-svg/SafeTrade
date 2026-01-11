# SafeTrade Escrow Rules Specification
## Reverse-Engineering da CardTrader + Adattamento SafeTrade

---

## 0. REGOLE FONDAMENTALI SAFETRADE

### ⚠️ RILASCIO FONDI SEMPRE MANUALE

**NESSUN rilascio automatico di fondi.** Ogni pagamento deve essere:
1. Approvato manualmente da Admin o Moderator
2. Confermato con doppio click ("Sì, sono sicuro!")

### Ruoli di Approvazione

| Ruolo | Può Approvare Rilascio | Può Gestire Dispute | Può Gestire Utenti | Accesso Completo |
|-------|----------------------|-------------------|-------------------|-----------------|
| **USER** | ❌ | ❌ | ❌ | ❌ |
| **MERCHANT** | ❌ | ❌ | ❌ | ❌ |
| **MODERATOR** | ✅ | ✅ | ❌ | ❌ |
| **ADMIN** | ✅ | ✅ | ✅ | ✅ |

### Tipi di Pagamento che Richiedono Approvazione Manuale

1. **Rilascio fondi a seller** (ordine completato)
2. **Rimborso totale a buyer** (dispute/cancellazione)
3. **Rimborso parziale** (dispute risolta)
4. **Pagamento Hub Provider** (commissioni)
5. **Prelievo wallet** (verso conto bancario)

### Workflow Doppia Conferma

```
┌─────────────────────────────────────────────────────────────┐
│  Admin/Moderator clicca "Rilascia Fondi"                   │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  MODAL: "Stai per rilasciare €XX.XX a [Utente]"            │
│                                                             │
│  Dettagli transazione:                                      │
│  - Ordine: #12345                                          │
│  - Importo: €45.50                                         │
│  - Destinatario: seller@email.com                          │
│                                                             │
│  [Annulla]  [✓ Sì, sono sicuro!]                          │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Pagamento eseguito + Log audit                            │
│  - Chi ha approvato                                        │
│  - Quando                                                   │
│  - IP address                                              │
│  - Note opzionali                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. MAPPA DEI FLUSSI

### 1.1 Ordine Diretto Buyer↔Seller CON Spedizione Tracciata

```
BUYER                    ESCROW                      SELLER
  |                         |                           |
  |------ Paga ordine ----->|                           |
  |                         |-- Trattiene fondi ------->|
  |                         |                           |
  |                         |<-- Marca "Spedito" -------|
  |                         |   + tracking number       |
  |                         |                           |
  |<-- Notifica spedizione -|                           |
  |                         |                           |
  |-- Conferma "Arrivato" ->|                           |
  |        OPPURE           |                           |
  |   Timeout auto-release  |                           |
  |                         |                           |
  |                         |-- Rilascia fondi -------->|
```

**Regole chiave:**
- Fondi trattenuti fino a conferma buyer OPPURE tracking = "delivered"
- Se buyer non conferma entro X giorni da tracking delivered → auto-release
- Se tracking non aggiorna per 30+ giorni oltre tempo stimato → buyer può richiedere rimborso

### 1.2 Ordine via Hub Escrow (SafeTrade Hub)

```
BUYER                    HUB                        SELLER
  |                         |                           |
  |------ Paga ordine ----->|                           |
  |                         |-- Trattiene fondi ------->|
  |                         |                           |
  |                         |<-- Spedisce a Hub --------|
  |                         |                           |
  |                         |-- Riceve pacco            |
  |                         |-- Verifica contenuto      |
  |                         |-- Foto verifica           |
  |                         |                           |
  |                         |-- Rilascia fondi -------->| (al seller)
  |                         |                           |
  |                         |-- Rispedisce a buyer ---->|
  |                         |                           |
  |<-- Riceve pacco --------|                           |
```

---

## 2. GESTIONE DISPUTE / "SEGNALA UN PROBLEMA"

### 2.1 Flusso Dispute

```
BUYER apre dispute
       ↓
   DISPUTE_OPEN
       ↓
  ┌────┴────┐
  │         │
Seller    Timeout
risponde  (48h)
  │         │
  ↓         ↓
MEDIAZIONE_RICHIESTA
       ↓
  Admin/Hub valuta
       ↓
  ┌────┼────┐
  │    │    │
REFUND PARTIAL REJECTED
FULL   REFUND
```

### 2.2 Responsabilità per Tipo Ordine

| Tipo Ordine | Chi Gestisce Dispute | Chi è Responsabile |
|-------------|---------------------|-------------------|
| **Diretto (sempre tracciato)** | Buyer↔Seller, poi Admin | Seller fino a consegna |
| **Via Hub** | Hub/Admin | Hub dopo ricezione |

> ⚠️ **IMPORTANTE**: Su SafeTrade TUTTI gli ordini sono tracciati e protetti da escrow. Non esistono ordini "non tracciati".

### 2.3 Casi Dispute Validi

1. **Pacco non arrivato** (tracking fermo o perso)
2. **Contenuto errato** (carta sbagliata, edizione diversa)
3. **Contenuto danneggiato** (carte piegate, buste aperte)
4. **Quantità mancante** (meno carte di quelle ordinate)
5. **Condizione non conforme** (NM dichiarato ma carta rovinata)

---

## 3. RIMBORSI: REGOLE E CONDIZIONI

### 3.1 Quando Rimborso È Permesso

| Condizione | Rimborso | Note |
|-----------|----------|------|
| Non consegnato dopo 30gg + tempo max stimato | ✅ SÌ | Buyer richiede via "Segnala problema" |
| Tracking dice "consegnato" | ❌ NO | Eccezione: modifiche ultimi 10gg |
| Ordine cancellato prima spedizione | ✅ SÌ | Richiede approvazione manuale |
| Contenuto non conforme (via Hub) | ✅ SÌ | Hub verifica e riacquista/rimborsa |
| Dispute risolta a favore buyer | ✅ SÌ | Full o partial, approvazione manuale |

> ⚠️ **NOTA**: Su SafeTrade TUTTI gli ordini sono protetti. Il rimborso è sempre possibile in caso di problemi verificati.

### 3.2 Tempi per Rimborso "Non Consegnato"

```
TEMPO_RIMBORSO = TEMPO_MAX_SPEDIZIONE + 30 giorni

Esempio:
- Spedizione stima 5-7 giorni
- Rimborso possibile dopo: 7 + 30 = 37 giorni
```

### 3.3 Dove Viene Accreditato il Rimborso

1. **Default**: Wallet/Portafoglio interno piattaforma
2. **Su richiesta**: Metodo pagamento originale (carta, PayPal, ecc.)

---

## 4. WALLET / CREDITO

### 4.1 Depositi

| Metodo | Fee | Tempo Accredito |
|--------|-----|-----------------|
| Bonifico bancario | 0% | 1 giorno lavorativo |
| Carta credito/debito | 0.35€ + 5% | Istantaneo |
| Vendita completata | Fee piattaforma | Quando buyer conferma |

### 4.2 Prelievi

| Metodo | Fee | Tempo Elaborazione |
|--------|-----|-------------------|
| Bonifico bancario | 0% | 2-4 giorni lavorativi |

### 4.3 Fee Piattaforma su Vendite

```
FEE_VENDITA = IMPORTO_VENDITA * PERCENTUALE_PIATTAFORMA
```

---

## 5. STATE MACHINE - ORDINI

### 5.1 Stati Order

```
┌─────────────┐
│   CREATED   │ ← Ordine creato, in attesa pagamento
└──────┬──────┘
       │ [buyer_pays]
       ↓
┌─────────────┐
│ PAID_HELD   │ ← Fondi in escrow
└──────┬──────┘
       │ [seller_marks_shipped]
       ↓
┌─────────────┐
│   SHIPPED   │ ← In transito
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
   │   [buyer_confirms_arrived]
   │   [tracking_delivered + timeout]
   │   [hub_verifies_content]
   ↓       ↓
┌─────────────┐     ┌─────────────┐
│  DELIVERED  │     │DISPUTE_OPEN │
└──────┬──────┘     └──────┬──────┘
       │                   │
       │ [auto_release]    │ [resolution]
       ↓                   ↓
┌─────────────┐     ┌─────────────┐
│  COMPLETED  │     │  REFUNDED   │
└─────────────┘     └─────────────┘
                          or
                    ┌─────────────┐
                    │  RESOLVED   │
                    └─────────────┘
```

### 5.2 Stati Aggiuntivi

```
CANCELLED        ← Ordine cancellato prima spedizione
PARTIALLY_REFUNDED ← Rimborso parziale dopo dispute
EXPIRED          ← Timeout senza azione
RETURNED         ← Reso accettato, pacco tornato a seller
```

### 5.3 Eventi e Transizioni

| Stato Corrente | Evento | Guard Condition | Stato Successivo |
|---------------|--------|-----------------|------------------|
| CREATED | buyer_pays | - | PAID_HELD |
| CREATED | timeout_payment | 24h senza pagamento | CANCELLED |
| PAID_HELD | seller_ships | tracking_number provided | SHIPPED |
| PAID_HELD | seller_cancels | - | REFUNDED |
| SHIPPED | buyer_confirms | - | DELIVERED |
| SHIPPED | tracking_delivered | tracking API = delivered | DELIVERED |
| SHIPPED | timeout_30d_over_max | shipping_tracked = true | DISPUTE_OPEN (auto) |
| SHIPPED | buyer_opens_dispute | - | DISPUTE_OPEN |
| DELIVERED | timeout_confirmation | 7 days | COMPLETED |
| DELIVERED | buyer_opens_dispute | within 48h | DISPUTE_OPEN |
| DISPUTE_OPEN | admin_refund | - | REFUNDED |
| DISPUTE_OPEN | admin_partial_refund | - | PARTIALLY_REFUNDED |
| DISPUTE_OPEN | admin_reject | - | COMPLETED |

### 5.4 Guard Conditions Critiche

```python
# Protezione escrow attiva solo se:
ESCROW_PROTECTION_ACTIVE = (
    shipping_method.is_tracked == True
    OR order.via_hub == True
)

# Primi N ordini solo tracked
IF seller.completed_orders < 10:
    REQUIRE shipping_method.is_tracked == True

# Auto-release fondi
IF (
    order.status == DELIVERED
    AND days_since_delivery >= 7
    AND no_dispute_opened
):
    TRIGGER auto_release_funds

# Rimborso per non consegna
IF (
    order.status == SHIPPED
    AND shipping_method.is_tracked == True
    AND days_since_ship >= (shipping_method.max_days + 30)
    AND tracking_status != "DELIVERED"
):
    ALLOW refund_request
```

---

## 6. REGOLE CORE (IF/THEN)

### 6.1 Holding e Rilascio Fondi (MANUALE)

```python
# REGOLA 1: Holding fondi
IF order.paid:
    HOLD funds IN escrow
    # NON rilasciare MAI automaticamente!

# REGOLA 2: Rilascio SEMPRE manuale
IF order.status == DELIVERED:
    IF no_dispute_within(7 days):
        # NON auto-release! Solo notifica admin/moderator
        CREATE pending_release_request
        NOTIFY admins_and_moderators("Ordine pronto per rilascio fondi")
        # Admin/Moderator deve approvare manualmente

# REGOLA 3: Ordine via Hub
IF order.via_hub:
    HOLD funds UNTIL hub_verifies_content
    THEN CREATE pending_release_request  # Non rilascio auto!
    NOTIFY admins_and_moderators("Hub ha verificato, pronto per rilascio")

# REGOLA 4: Doppia conferma obbligatoria
EVERY release_funds_action REQUIRES:
    1. Click "Rilascia Fondi"
    2. Modal conferma con dettagli
    3. Click "Sì, sono sicuro!"
    4. Log audit completo
```

### 6.2 Regola Fondamentale SafeTrade

```python
# REGOLA UNICA: TUTTI gli ordini sono tracciati e protetti
# Non esiste modalità "non tracciato" su SafeTrade

EVERY order ON SafeTrade:
    REQUIRE shipping.is_tracked = True
    REQUIRE escrow_protection = ACTIVE
    REASON: "SafeTrade = Sicurezza. Ogni transazione è protetta."
```

### 6.3 Resi

```python
# REGOLA 6: Reso obbligatorio con tracking
IF return_requested AND return_approved:
    REQUIRE return_shipping.is_tracked = True
    
# REGOLA 7: Chi paga il reso
IF return_reason == SELLER_FAULT:
    CHARGE shipping_cost TO seller
ELIF return_reason == BUYER_REMORSE:
    CHARGE shipping_cost TO buyer
ELIF return_reason == UNCLEAR:
    SPLIT shipping_cost 50/50
```

### 6.4 Tempi

```python
# REGOLA 8: Finestra non consegnato
NON_DELIVERED_THRESHOLD = shipping.max_estimated_days + 30

# REGOLA 9: Eccezione tracking "consegnato"
IF tracking.status == "DELIVERED":
    IF tracking.last_update > (now - 10 days):
        DENY refund_for_non_delivery
    ELSE:
        ALLOW dispute_review  # Caso speciale

# REGOLA 10: Timeout conferma buyer
BUYER_CONFIRMATION_TIMEOUT = 7 days after delivery
```

---

## 7. SPEC TECNICA - DATABASE

### 7.1 Tabelle Minime

```sql
-- ORDINI
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    hub_id UUID REFERENCES escrow_hubs(id),  -- NULL se ordine diretto
    shop_id UUID REFERENCES shops(id),
    
    status VARCHAR(50) NOT NULL DEFAULT 'CREATED',
    -- CREATED, PAID_HELD, SHIPPED, DELIVERED, COMPLETED, 
    -- DISPUTE_OPEN, REFUNDED, CANCELLED, RETURNED
    
    total_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    shipping_method_id UUID REFERENCES shipping_methods(id),
    is_tracked BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    tracking_number VARCHAR(100),
    tracking_status VARCHAR(50),
    tracking_last_update TIMESTAMP,
    
    buyer_confirmed_at TIMESTAMP,
    auto_release_at TIMESTAMP  -- Quando fare auto-release
);

-- ESCROW / PAYMENT INTENT
CREATE TABLE escrow_holds (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'HELD',
    -- HELD, RELEASED, REFUNDED, PARTIAL_REFUNDED
    
    held_at TIMESTAMP DEFAULT NOW(),
    released_at TIMESTAMP,
    released_to VARCHAR(50),  -- 'SELLER', 'BUYER', 'SPLIT'
    
    release_reason VARCHAR(100)
);

-- SPEDIZIONI
CREATE TABLE shipments (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    
    carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    is_tracked BOOLEAN NOT NULL,
    
    estimated_min_days INT,
    estimated_max_days INT,
    
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    -- Per Hub
    received_at_hub TIMESTAMP,
    verified_at_hub TIMESTAMP,
    reshipped_at TIMESTAMP,
    
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
    -- PENDING, IN_TRANSIT, DELIVERED, LOST, RETURNED
);

-- DISPUTE
CREATE TABLE disputes (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    
    opened_by UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    -- NOT_DELIVERED, WRONG_ITEM, DAMAGED, MISSING_ITEMS, CONDITION_MISMATCH
    
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    -- OPEN, SELLER_RESPONSE, IN_MEDIATION, RESOLVED, CLOSED
    
    description TEXT NOT NULL,
    evidence_photos TEXT[],
    
    resolution VARCHAR(50),
    -- REFUND_FULL, REFUND_PARTIAL, REJECTED, RETURN_REQUIRED
    
    resolution_amount DECIMAL(10,2),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    
    opened_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    
    -- Deadlines
    seller_response_deadline TIMESTAMP,
    mediation_deadline TIMESTAMP
);

-- RIMBORSI
CREATE TABLE refunds (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    dispute_id UUID REFERENCES disputes(id),
    escrow_hold_id UUID REFERENCES escrow_holds(id),
    
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    -- FULL, PARTIAL, CANCELLATION
    
    destination VARCHAR(50) NOT NULL,
    -- WALLET, ORIGINAL_PAYMENT
    
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    -- PENDING, PROCESSING, COMPLETED, FAILED
    
    reason TEXT,
    processed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- TRANSAZIONI WALLET
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    
    type VARCHAR(50) NOT NULL,
    -- DEPOSIT, WITHDRAWAL, SALE, PURCHASE, REFUND, FEE
    
    amount DECIMAL(10,2) NOT NULL,
    fee DECIMAL(10,2) DEFAULT 0,
    
    reference_type VARCHAR(50),  -- 'ORDER', 'REFUND', 'DEPOSIT'
    reference_id UUID,
    
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    -- PENDING, COMPLETED, FAILED, CANCELLED
    
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- METODI SPEDIZIONE
CREATE TABLE shipping_methods (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    carrier VARCHAR(100),
    
    is_tracked BOOLEAN NOT NULL,
    estimated_min_days INT NOT NULL,
    estimated_max_days INT NOT NULL,
    
    base_cost DECIMAL(10,2) NOT NULL,
    
    country_from VARCHAR(2),
    country_to VARCHAR(2),
    
    is_active BOOLEAN DEFAULT true
);

-- ============================================
-- SISTEMA APPROVAZIONE MANUALE RILASCIO FONDI
-- ============================================

-- RICHIESTE RILASCIO PENDENTI
CREATE TABLE pending_releases (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    escrow_hold_id UUID NOT NULL REFERENCES escrow_holds(id),
    
    type VARCHAR(50) NOT NULL,
    -- RELEASE_TO_SELLER, REFUND_FULL, REFUND_PARTIAL, HUB_COMMISSION, WITHDRAWAL
    
    amount DECIMAL(10,2) NOT NULL,
    recipient_id UUID NOT NULL REFERENCES users(id),
    recipient_type VARCHAR(50) NOT NULL,  -- 'SELLER', 'BUYER', 'HUB'
    
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    -- PENDING, APPROVED, REJECTED, EXPIRED
    
    reason TEXT,  -- Motivo della richiesta
    
    -- Auto-generated quando condizioni soddisfatte
    triggered_by VARCHAR(50),  -- 'DELIVERY_CONFIRMED', 'HUB_VERIFIED', 'DISPUTE_RESOLVED'
    triggered_at TIMESTAMP DEFAULT NOW(),
    
    -- Approvazione
    approved_by UUID REFERENCES users(id),  -- Admin/Moderator che approva
    approved_at TIMESTAMP,
    approval_notes TEXT,
    
    -- Rejection
    rejected_by UUID REFERENCES users(id),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP  -- Opzionale: scadenza se non processato
);

-- AUDIT LOG PER TUTTE LE AZIONI FINANZIARIE
CREATE TABLE financial_audit_log (
    id UUID PRIMARY KEY,
    
    action_type VARCHAR(50) NOT NULL,
    -- RELEASE_APPROVED, RELEASE_REJECTED, REFUND_APPROVED, 
    -- REFUND_REJECTED, WITHDRAWAL_APPROVED, WITHDRAWAL_REJECTED
    
    pending_release_id UUID REFERENCES pending_releases(id),
    order_id UUID REFERENCES orders(id),
    
    amount DECIMAL(10,2) NOT NULL,
    recipient_id UUID REFERENCES users(id),
    
    -- Chi ha eseguito l'azione
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_by_role VARCHAR(50) NOT NULL,  -- 'ADMIN', 'MODERATOR'
    
    -- Dettagli sicurezza
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Doppia conferma timestamp
    first_click_at TIMESTAMP NOT NULL,
    confirm_click_at TIMESTAMP NOT NULL,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- NOTIFICHE ADMIN/MODERATOR PER RILASCI PENDENTI
CREATE TABLE admin_notifications (
    id UUID PRIMARY KEY,
    
    type VARCHAR(50) NOT NULL,
    -- PENDING_RELEASE, DISPUTE_ESCALATED, WITHDRAWAL_REQUEST
    
    reference_type VARCHAR(50) NOT NULL,  -- 'PENDING_RELEASE', 'DISPUTE', etc.
    reference_id UUID NOT NULL,
    
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'NORMAL',  -- LOW, NORMAL, HIGH, URGENT
    
    -- Targeting
    target_roles VARCHAR(50)[] DEFAULT ARRAY['ADMIN', 'MODERATOR'],
    
    read_by UUID[],  -- Array di user IDs che hanno letto
    actioned_by UUID REFERENCES users(id),
    actioned_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 7.2 Indici Critici

```sql
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_auto_release ON orders(auto_release_at) 
    WHERE status = 'DELIVERED';

CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_deadline ON disputes(seller_response_deadline) 
    WHERE status = 'OPEN';

CREATE INDEX idx_escrow_status ON escrow_holds(status);
```

---

## 8. API ENDPOINTS

### 8.1 Ordini

```yaml
# Crea ordine
POST /api/orders
Body:
  seller_id: "uuid"
  items: [{ listing_id: "uuid", quantity: 1 }]
  shipping_method_id: "uuid"
  hub_id: "uuid"  # opzionale

Response:
  id: "uuid"
  status: "CREATED"
  total_amount: 45.50
  escrow_protected: true

# Paga ordine
POST /api/orders/{id}/pay
Body:
  payment_method: "wallet" | "card"

Response:
  status: "PAID_HELD"
  escrow_hold_id: "uuid"

# Seller marca spedito
POST /api/orders/{id}/ship
Body:
  tracking_number: "IT123456789"
  carrier: "Poste Italiane"

Response:
  status: "SHIPPED"
  auto_release_at: "2026-01-25T10:00:00Z"

# Buyer conferma ricezione
POST /api/orders/{id}/confirm-delivery

Response:
  status: "DELIVERED"
  funds_released: true
```

### 8.2 Dispute

```yaml
# Apri dispute
POST /api/orders/{id}/dispute
Body:
  type: "DAMAGED"
  description: "Carta piegata all'angolo"
  photos: ["url1", "url2"]

Response:
  dispute_id: "uuid"
  status: "OPEN"
  seller_response_deadline: "2026-01-13T10:00:00Z"

# Seller risponde
POST /api/disputes/{id}/respond
Body:
  response: "La carta era in perfette condizioni..."
  photos: ["url3"]
  offer: "partial_refund"
  offer_amount: 5.00

# Admin risolve
POST /api/disputes/{id}/resolve
Body:
  resolution: "REFUND_PARTIAL"
  amount: 10.00
  notes: "Danneggiamento confermato da foto"
```

### 8.3 Hub Operations

```yaml
# Hub conferma ricezione pacco
POST /api/hub/orders/{id}/received
Body:
  photos: ["url1", "url2"]

# Hub verifica contenuto
POST /api/hub/orders/{id}/verify
Body:
  verified: true
  photos: ["url1", "url2", "url3"]
  notes: "Tutte le carte presenti e conformi"

# Hub rispedisce a buyer
POST /api/hub/orders/{id}/reship
Body:
  tracking_number: "IT987654321"
  carrier: "BRT"
```

### 8.4 Wallet

```yaml
# Deposita
POST /api/wallet/deposit
Body:
  amount: 50.00
  method: "card" | "bank_transfer"

# Preleva (crea richiesta pendente)
POST /api/wallet/withdraw
Body:
  amount: 100.00
  iban: "IT60X0542811101000000123456"

Response:
  pending_release_id: "uuid"
  status: "PENDING_APPROVAL"
  message: "Richiesta inviata. Un admin la processerà a breve."

# Storico
GET /api/wallet/transactions?page=1&limit=20
```

### 8.5 Approvazione Manuale (Solo Admin/Moderator)

```yaml
# Lista rilasci pendenti
GET /api/admin/pending-releases?status=PENDING&page=1
Headers:
  Authorization: Bearer <admin_or_moderator_token>

Response:
  items: [
    {
      id: "uuid",
      order_id: "uuid",
      type: "RELEASE_TO_SELLER",
      amount: 45.50,
      recipient: {
        id: "uuid",
        name: "Mario Rossi",
        email: "mario@email.com"
      },
      reason: "Ordine #12345 consegnato, buyer confermato",
      triggered_at: "2026-01-11T10:00:00Z",
      order: {
        id: "uuid",
        items_count: 3,
        delivered_at: "2026-01-04T10:00:00Z"
      }
    }
  ]
  total: 15

# Dettaglio rilascio pendente
GET /api/admin/pending-releases/{id}

# STEP 1: Inizia approvazione (primo click)
POST /api/admin/pending-releases/{id}/initiate-approval
Headers:
  Authorization: Bearer <admin_or_moderator_token>

Response:
  confirmation_token: "temp_token_uuid"  # Valido 5 minuti
  expires_at: "2026-01-11T10:05:00Z"
  details: {
    amount: 45.50,
    recipient: "Mario Rossi (mario@email.com)",
    order_id: "12345",
    type: "RELEASE_TO_SELLER"
  }
  message: "Conferma cliccando 'Sì, sono sicuro!' entro 5 minuti"

# STEP 2: Conferma finale (secondo click - "Sì, sono sicuro!")
POST /api/admin/pending-releases/{id}/confirm-approval
Headers:
  Authorization: Bearer <admin_or_moderator_token>
Body:
  confirmation_token: "temp_token_uuid"
  notes: "Verificato tracking, tutto ok"  # Opzionale

Response:
  status: "APPROVED"
  transaction_id: "uuid"
  amount_released: 45.50
  recipient: "Mario Rossi"
  audit_log_id: "uuid"

# Rifiuta rilascio
POST /api/admin/pending-releases/{id}/reject
Headers:
  Authorization: Bearer <admin_or_moderator_token>
Body:
  reason: "Dispute aperta dal buyer, in attesa verifica"

Response:
  status: "REJECTED"
  audit_log_id: "uuid"

# Dashboard notifiche admin
GET /api/admin/notifications?unread=true

Response:
  items: [
    {
      id: "uuid",
      type: "PENDING_RELEASE",
      title: "Rilascio fondi in attesa - Ordine #12345",
      message: "€45.50 pronti per rilascio a Mario Rossi",
      priority: "NORMAL",
      created_at: "2026-01-11T10:00:00Z",
      is_read: false
    }
  ]
  unread_count: 5

# Audit log
GET /api/admin/audit-log?action_type=RELEASE_APPROVED&page=1
```

---

## 9. CRON JOBS / WORKERS

### 9.1 Crea Richieste Rilascio Pendenti (NO Auto-Release!)

```python
# Esegue ogni ora
CRON: 0 * * * *

def create_pending_releases():
    """
    NON rilascia fondi automaticamente!
    Crea solo richieste pendenti che Admin/Moderator devono approvare.
    """
    orders = Order.query.filter(
        Order.status == 'DELIVERED',
        Order.delivered_at <= now() - timedelta(days=7),
        Order.has_open_dispute == False,
        Order.has_pending_release == False  # Non duplicare
    ).all()
    
    for order in orders:
        # Crea richiesta pendente (NON rilascio automatico!)
        pending = PendingRelease.create(
            order_id=order.id,
            escrow_hold_id=order.escrow_hold.id,
            type='RELEASE_TO_SELLER',
            amount=order.seller_amount,
            recipient_id=order.seller_id,
            recipient_type='SELLER',
            triggered_by='DELIVERY_CONFIRMED_TIMEOUT',
            reason=f"Ordine #{order.id} consegnato da 7+ giorni, nessuna dispute"
        )
        
        # Notifica Admin/Moderator
        AdminNotification.create(
            type='PENDING_RELEASE',
            reference_type='PENDING_RELEASE',
            reference_id=pending.id,
            title=f"Rilascio fondi in attesa - Ordine #{order.id}",
            message=f"€{order.seller_amount} pronti per rilascio a {order.seller.name}",
            priority='NORMAL'
        )
        
        # Email notifica
        notify_admins_moderators(
            "Nuovo rilascio fondi in attesa di approvazione",
            order
        )
```

### 9.2 Timeout Dispute

```python
# Esegue ogni 30 minuti
CRON: */30 * * * *

def check_dispute_deadlines():
    # Seller non risponde in 48h
    expired = Dispute.query.filter(
        Dispute.status == 'OPEN',
        Dispute.seller_response_deadline <= now()
    ).all()
    
    for dispute in expired:
        dispute.status = 'IN_MEDIATION'
        assign_to_admin(dispute)
        notify_parties(dispute, "Escalation a mediazione")
```

### 9.3 Auto-Refund Non Consegnato

```python
# Esegue ogni giorno alle 2:00
CRON: 0 2 * * *

def check_non_delivered():
    orders = Order.query.filter(
        Order.status == 'SHIPPED',
        Order.is_tracked == True,
        Order.shipped_at <= now() - timedelta(days=ORDER_MAX_DAYS + 30),
        Order.tracking_status != 'DELIVERED'
    ).all()
    
    for order in orders:
        create_auto_dispute(order, type='NON_DELIVERED')
        notify_parties(order, "Pacco risulta non consegnato")
```

### 9.4 Tracking Update

```python
# Esegue ogni 4 ore
CRON: 0 */4 * * *

def update_tracking():
    shipments = Shipment.query.filter(
        Shipment.is_tracked == True,
        Shipment.status == 'IN_TRANSIT'
    ).all()
    
    for shipment in shipments:
        status = tracking_api.get_status(
            shipment.carrier, 
            shipment.tracking_number
        )
        
        if status.delivered:
            shipment.status = 'DELIVERED'
            shipment.delivered_at = status.delivered_at
            shipment.order.status = 'DELIVERED'
            shipment.order.auto_release_at = now() + timedelta(days=7)
```

### 9.5 Reminder Conferma

```python
# Esegue ogni giorno alle 9:00
CRON: 0 9 * * *

def send_delivery_reminders():
    orders = Order.query.filter(
        Order.status == 'DELIVERED',
        Order.buyer_confirmed_at == None,
        Order.delivered_at <= now() - timedelta(days=3)
    ).all()
    
    for order in orders:
        notify_buyer(order, 
            "Conferma la ricezione del tuo ordine entro 4 giorni")
```

---

## 10. ADATTAMENTO SAFETRADE: DUE MODALITÀ

### 10.1 Modalità A: Escrow Gestito da Piattaforma (SafeTrade)

```
┌─────────────────────────────────────────────────────────┐
│                    SAFETRADE PLATFORM                    │
│                                                         │
│  - Trattiene fondi                                      │
│  - Monitora tracking                                    │
│  - Gestisce dispute                                     │
│  - Rilascia automaticamente                             │
│  - Responsabile per rimborsi                            │
└─────────────────────────────────────────────────────────┘
         ↑                               ↑
         │                               │
      BUYER                           SELLER
```

**Responsabilità SafeTrade:**
- Holding fondi in escrow
- Auto-release dopo conferma/timeout
- Mediazione dispute
- Rimborsi da wallet piattaforma
- Tracking automatico

**Fee:** Percentuale su ogni transazione

### 10.2 Modalità B: Escrow Gestito da Hub/Negoziante

```
┌─────────────────────────────────────────────────────────┐
│                      HUB PROVIDER                        │
│                   (Tu o Negoziante)                      │
│                                                         │
│  - Riceve pacco fisicamente                             │
│  - Verifica contenuto                                   │
│  - Foto documentazione                                  │
│  - Rispedisce a buyer                                   │
│  - Gestisce dispute locali                              │
└─────────────────────────────────────────────────────────┘
         ↑           ↑            ↑
         │           │            │
      BUYER      PLATFORM      SELLER
                     │
              (Fondi + Tracking)
```

**Responsabilità Hub:**
- Ricezione fisica pacchi
- Verifica contenuto e condizioni
- Foto documentazione
- Rispedizione a buyer
- Prima linea dispute

**Responsabilità Piattaforma:**
- Holding fondi fino a verifica Hub
- Release fondi dopo OK Hub
- Backup dispute escalation
- Tracking globale

**Fee:** Divisa tra Hub e Piattaforma

### 10.3 Tabella Comparativa

| Aspetto | Escrow Piattaforma | Escrow Hub |
|---------|-------------------|------------|
| **Chi tiene i fondi** | Piattaforma | Piattaforma |
| **Chi verifica** | Tracking automatico | Hub fisicamente |
| **Chi rilascia** | Auto/Admin | Dopo OK Hub |
| **Dispute prima linea** | Admin | Hub |
| **Velocità rilascio** | 7 giorni post-consegna | Immediato post-verifica |
| **Protezione buyer** | Media (tracking) | Alta (verifica fisica) |
| **Costo** | Fee piattaforma | Fee piattaforma + Hub |
| **Scalabilità** | Alta | Media (dipende da Hub) |

### 10.4 Quando Usare Quale

**Escrow Piattaforma (default):**
- Transazioni standard
- Seller/Buyer stesso paese
- Spedizione tracciata diretta
- Processo più veloce

**Escrow Hub (opzionale, consigliato per alto valore):**
- Transazioni alto valore (>€100)
- Buyer/Seller paesi diversi
- Carte rare/costose che richiedono verifica fisica
- Massima sicurezza con foto verifica
- Consolidamento più pacchi da seller diversi

> **NOTA**: In entrambi i casi, l'escrow è SEMPRE attivo e il tracking è SEMPRE obbligatorio.

---

## 11. PRINCIPIO FONDAMENTALE SAFETRADE

### ⚠️ OGNI ORDINE È PROTETTO

Su SafeTrade **NON ESISTONO ordini non tracciati**. Il concept del sito è la sicurezza:

| Aspetto | SafeTrade |
|---------|-----------|
| **Escrow attivo** | ✅ SEMPRE |
| **Fondi trattenuti** | ✅ Fino a conferma + approvazione manuale |
| **Tracking obbligatorio** | ✅ SEMPRE |
| **Rimborso possibile** | ✅ SEMPRE (se problema verificato) |
| **Dispute supportata** | ✅ SEMPRE |
| **Protezione buyer** | ✅ MASSIMA |

> **"SafeTrade = Safe Trade"** - Il nome dice tutto. Sicurezza al 100%.

---

## 12. CHECKLIST IMPLEMENTAZIONE

### Database
- [ ] Creare tabelle orders, escrow_holds, shipments, disputes, refunds, wallet_transactions
- [ ] **Creare tabelle pending_releases, financial_audit_log, admin_notifications**
- [ ] Aggiungere indici per query frequenti
- [ ] Trigger per auto-update timestamps
- [ ] **Aggiungere ruolo MODERATOR a UserRole enum**

### API
- [ ] CRUD ordini con state machine
- [ ] Endpoint pagamento con escrow
- [ ] Endpoint conferma spedizione/ricezione
- [ ] API dispute completa
- [ ] API wallet (depositi, prelievi, storico)
- [ ] API Hub operations
- [ ] **API approvazione manuale rilascio fondi**
  - [ ] GET /api/admin/pending-releases
  - [ ] POST /api/admin/pending-releases/{id}/initiate-approval
  - [ ] POST /api/admin/pending-releases/{id}/confirm-approval (doppia conferma)
  - [ ] POST /api/admin/pending-releases/{id}/reject
- [ ] **API notifiche admin**
- [ ] **API audit log**

### Workers
- [ ] ~~Auto-release fondi~~ → **Crea pending_release (NO auto-release!)**
- [ ] Tracking update (every 4h)
- [ ] Dispute timeout (every 30min)
- [ ] Auto-dispute non consegnato (daily)
- [ ] Reminder conferma (daily)
- [ ] **Notifica admin per pending_release in attesa da >24h**
- [ ] **Cleanup confirmation_tokens scaduti**

### Integrazioni
- [ ] Tracking API (17track, AfterShip, o simili)
- [ ] Payment gateway (Stripe, PayPal)
- [ ] Email notifications
- [ ] Push notifications
- [ ] **Email urgenti ad admin per pending releases**

### UI
- [ ] Dashboard ordini buyer/seller
- [ ] Form dispute con upload foto
- [ ] Stato tracking real-time
- [ ] Wallet con storico
- [ ] Hub dashboard (se modalità Hub)
- [ ] **Dashboard Admin/Moderator**
  - [ ] Lista pending releases con filtri
  - [ ] Modal doppia conferma ("Sì, sono sicuro!")
  - [ ] Badge notifiche non lette
  - [ ] Audit log consultabile
  - [ ] Statistiche approvazioni

### Sicurezza Approvazione Manuale
- [ ] **Verifica ruolo ADMIN o MODERATOR per ogni azione**
- [ ] **Confirmation token con scadenza 5 minuti**
- [ ] **Log IP address e user agent**
- [ ] **Rate limiting sulle approvazioni**
- [ ] **Notifica email quando fondi rilasciati**

---

*Documento generato da analisi reverse-engineering CardTrader*
*Adattato per SafeTrade - Gennaio 2026*

