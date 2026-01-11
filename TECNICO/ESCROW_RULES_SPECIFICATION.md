# SafeTrade Escrow Rules Specification
## Reverse-Engineering da CardTrader + Adattamento SafeTrade

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

### 1.2 Ordine Diretto Buyer↔Seller SENZA Spedizione Tracciata

```
BUYER                    ESCROW                      SELLER
  |                         |                           |
  |------ Paga ordine ----->|                           |
  |                         |-- Trasferisce SUBITO --->|
  |                         |   quando seller marca    |
  |                         |   "Spedito"              |
  |                         |                           |
  |<-- Notifica spedizione -|                           |
  |                         |                           |
  |   ⚠️ NESSUNA PROTEZIONE                            |
```

**Regole chiave:**
- Fondi rilasciati IMMEDIATAMENTE quando seller marca "Shipped"
- **NESSUNA protezione escrow** - buyer assume il rischio
- Nessun rimborso disponibile tramite piattaforma

### 1.3 Ordine via Hub Escrow (SafeTrade Hub)

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
| Diretto tracciato | Buyer↔Seller, poi Admin | Seller fino a consegna |
| Diretto non tracciato | Buyer↔Seller | Seller (ma no protezione) |
| Via Hub | Hub/Admin | Hub dopo ricezione |

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
| Spedizione tracciata + non consegnato dopo 30gg + tempo max | ✅ SÌ | Buyer richiede via "Segnala problema" |
| Tracking dice "consegnato" | ❌ NO | Eccezione: modifiche ultimi 10gg |
| Spedizione non tracciata | ❌ NO | Nessuna protezione |
| Ordine cancellato prima spedizione | ✅ SÌ | Rimborso automatico |
| Contenuto non conforme (via Hub) | ✅ SÌ | Hub verifica e riacquista/rimborsa |
| Dispute risolta a favore buyer | ✅ SÌ | Full o partial |

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

### 6.1 Holding e Rilascio Fondi

```python
# REGOLA 1: Holding fondi
IF order.paid:
    IF shipping.is_tracked:
        HOLD funds IN escrow
        RELEASE WHEN (buyer_confirms OR tracking_delivered + 7d)
    ELSE:
        RELEASE funds WHEN seller_marks_shipped

# REGOLA 2: Rilascio automatico
IF order.status == DELIVERED:
    IF no_dispute_within(7 days):
        AUTO_RELEASE funds TO seller

# REGOLA 3: Ordine via Hub
IF order.via_hub:
    HOLD funds UNTIL hub_verifies_content
    THEN RELEASE TO seller
    THEN ship_to_buyer
```

### 6.2 Soglie e Limitazioni

```python
# REGOLA 4: Nuovi venditori
IF seller.completed_tracked_orders < 10:
    FORCE shipping_method = TRACKED_ONLY
    REASON: "Protezione buyer per nuovi seller"

# REGOLA 5: Limite valore senza tracking
IF order.total > MAX_UNTRACKED_VALUE:
    REQUIRE shipping.is_tracked = True
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

# Preleva
POST /api/wallet/withdraw
Body:
  amount: 100.00
  iban: "IT60X0542811101000000123456"

# Storico
GET /api/wallet/transactions?page=1&limit=20
```

---

## 9. CRON JOBS / WORKERS

### 9.1 Auto-Release Fondi

```python
# Esegue ogni ora
CRON: 0 * * * *

def auto_release_funds():
    orders = Order.query.filter(
        Order.status == 'DELIVERED',
        Order.auto_release_at <= now(),
        Order.has_open_dispute == False
    ).all()
    
    for order in orders:
        release_escrow(order)
        order.status = 'COMPLETED'
        notify_seller(order, "Fondi rilasciati")
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

**Usa Escrow Piattaforma quando:**
- Transazioni a basso valore
- Seller/Buyer stesso paese
- Spedizione tracciata affidabile
- Volume alto, margini bassi

**Usa Escrow Hub quando:**
- Transazioni alto valore
- Buyer/Seller paesi diversi
- Carte rare/costose che richiedono verifica
- Buyer vuole massima sicurezza
- Consolidamento più pacchi

---

## 11. DIFFERENZE CHIAVE: TRACCIATO vs NON TRACCIATO

| Aspetto | Tracciato | Non Tracciato |
|---------|-----------|---------------|
| **Escrow attivo** | ✅ Sì | ❌ No |
| **Fondi trattenuti** | Fino a consegna | Rilascio immediato a ship |
| **Rimborso possibile** | ✅ Sì | ❌ No |
| **Dispute supportata** | ✅ Sì | Solo tra parti |
| **Timeout auto-release** | 7gg post-consegna | N/A |
| **Soglia non consegnato** | max_days + 30 | N/A |
| **Nuovi seller** | ✅ Permesso | ❌ Bloccato primi 10 ordini |

---

## 12. CHECKLIST IMPLEMENTAZIONE

### Database
- [ ] Creare tabelle orders, escrow_holds, shipments, disputes, refunds, wallet_transactions
- [ ] Aggiungere indici per query frequenti
- [ ] Trigger per auto-update timestamps

### API
- [ ] CRUD ordini con state machine
- [ ] Endpoint pagamento con escrow
- [ ] Endpoint conferma spedizione/ricezione
- [ ] API dispute completa
- [ ] API wallet (depositi, prelievi, storico)
- [ ] API Hub operations

### Workers
- [ ] Auto-release fondi (hourly)
- [ ] Tracking update (every 4h)
- [ ] Dispute timeout (every 30min)
- [ ] Auto-dispute non consegnato (daily)
- [ ] Reminder conferma (daily)

### Integrazioni
- [ ] Tracking API (17track, AfterShip, o simili)
- [ ] Payment gateway (Stripe, PayPal)
- [ ] Email notifications
- [ ] Push notifications

### UI
- [ ] Dashboard ordini buyer/seller
- [ ] Form dispute con upload foto
- [ ] Stato tracking real-time
- [ ] Wallet con storico
- [ ] Hub dashboard (se modalità Hub)

---

*Documento generato da analisi reverse-engineering CardTrader*
*Adattato per SafeTrade - Gennaio 2026*

