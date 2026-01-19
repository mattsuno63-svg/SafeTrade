# 🏛️ SafeTrade Verified Escrow - Sistema Escrow Centralizzato

**Data Creazione**: 2025-01-27  
**Versione**: 1.0  
**Status**: Progettazione - CRITICO (Pagamenti Reali)

---

## ⚠️ AVVISO IMPORTANTE

**Questo sistema gestisce PAGAMENTI REALI. Un singolo errore può causare:**
- Perdite finanziarie significative
- Problemi legali
- Perdita di fiducia degli utenti
- Chiusura del progetto

**Ogni modifica deve essere:**
- ✅ Testata rigorosamente
- ✅ Documentata
- ✅ Auditata per sicurezza
- ✅ Validata con invarianti server-side

---

## 📋 Indice

1. [Panoramica e Nome Servizio](#1-panoramica-e-nome-servizio)
2. [Architettura Sistema](#2-architettura-sistema)
3. [State Machine Completa](#3-state-machine-completa)
4. [Georeferenziazione Negozi](#4-georeferenziazione-negozi)
5. [Flusso Operativo Completo](#5-flusso-operativo-completo)
6. [Sicurezza e Anti-Frodi](#6-sicurezza-e-anti-frodi)
7. [Modello Dati](#7-modello-dati)
8. [API Endpoints](#8-api-endpoints)
9. [Piano di Implementazione](#9-piano-di-implementazione)

---

## 1. Panoramica e Nome Servizio

### 1.1 Nome: **"SafeTrade Verified Escrow"** o **"Verified Escrow"**

**Tagline**: *"Verifica professionale garantita dal team SafeTrade"*

**Differenza con Escrow Locale**:
- **Escrow Locale**: Incontro fisico in negozio VLS, verifica merchant in loco
- **Verified Escrow**: Seller spedisce a SafeTrade Hub, team verifica, rispedisce a buyer

### 1.2 Quando Usare Verified Escrow

✅ **Consigliato per**:
- Transazioni alto valore (>€100)
- Carte rare/costose che richiedono verifica professionale
- Buyer/Seller in zone diverse (geograficamente distanti)
- Massima sicurezza e garanzia

❌ **Non necessario per**:
- Transazioni basso valore (<€50)
- Buyer/Seller stessa città (usare Escrow Locale)
- Carte comuni in buone condizioni

### 1.3 Vantaggi

- ✅ **Verifica Professionale**: Team SafeTrade verifica ogni carta
- ✅ **Sicurezza Massima**: Doppio controllo (team + buyer)
- ✅ **Protezione Completa**: Fondi in escrow fino a conferma buyer
- ✅ **Documentazione**: Foto e report dettagliati per ogni verifica

---

## 2. Architettura Sistema

### 2.1 Componenti Principali

```
┌─────────────────────────────────────────────────────────────┐
│                    SELLER                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Crea Listing                                      │   │
│  │ 2. Accetta Proposta                                  │   │
│  │ 3. Sceglie "Verified Escrow"                        │   │
│  │ 4. Spedisce carta a SafeTrade Hub                   │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ 📦 Tracking Number
                             │
┌────────────────────────────▼────────────────────────────────┐
│              SAFETRADE HUB (CENTRAL ESCROW)                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Riceve pacco (RECEIVED)                          │   │
│  │ 2. Team verifica carta (VERIFICATION_IN_PROGRESS)    │   │
│  │ 3. Foto documentazione (min 3 foto)                 │   │
│  │ 4. Report verifica (VERIFICATION_PASSED/FAILED)      │   │
│  │ 5. Rispedisce a buyer (SHIPPED_TO_BUYER)             │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ 📦 Return Tracking Number
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    BUYER                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Riceve pacco (DELIVERED)                          │   │
│  │ 2. Conferma ricezione (CONFIRMED_RECEIVED)           │   │
│  │ 3. Trigger rilascio fondi (MANUAL_RELEASE)          │   │
│  │    OPPURE                                             │   │
│  │ 4. Auto-release dopo 72h (AUTO_RELEASE)             │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ 💰 Funds Release
                             │
┌────────────────────────────▼────────────────────────────────┐
│              ADMIN/MODERATOR (MANUAL APPROVAL)              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Verifica richiesta rilascio                      │   │
│  │ 2. Doppia conferma (token + click)                  │   │
│  │ 3. Rilascia fondi a seller                          │   │
│  │ 4. Audit trail completo                              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Ruoli e Permessi

| Ruolo | Permessi |
|-------|----------|
| **SELLER** | - Crea listing<br>- Accetta proposta<br>- Sceglie Verified Escrow<br>- Inserisce tracking number<br>- Visualizza stato verifica |
| **BUYER** | - Crea proposta<br>- Conferma ricezione<br>- Visualizza report verifica<br>- Disputa se necessario |
| **HUB_STAFF** | - Marca pacco come ricevuto<br>- Avvia verifica<br>- Carica foto verifica<br>- Compila report<br>- Marca come spedito |
| **ADMIN** | - Approva rilascio fondi<br>- Gestisce dispute<br>- Visualizza audit trail<br>- Modifica stati (emergenza) |
| **MODERATOR** | - Approva rilascio fondi<br>- Gestisce dispute<br>- Visualizza audit trail |

---

## 3. State Machine Completa

### 3.1 Stati Transazione (`SafeTradeTransaction.status`)

```
CREATED
  ↓ (Seller accetta proposta)
PENDING_ESCROW_SETUP
  ↓ (Seller sceglie Verified Escrow)
ESCROW_ACTIVE
  ↓ (Seller inserisce tracking)
AWAITING_HUB_RECEIPT
  ↓ (Hub Staff marca ricevuto)
HUB_RECEIVED
  ↓ (Hub Staff avvia verifica)
VERIFICATION_IN_PROGRESS
  ↓ (Hub Staff completa verifica)
  ├─→ VERIFICATION_PASSED → SHIPPED_TO_BUYER → IN_TRANSIT_TO_BUYER
  │                                                      ↓
  │                                              DELIVERED_TO_BUYER
  │                                                      ↓
  │                                              CONFIRMED_RECEIVED (buyer conferma)
  │                                                      ↓
  │                                              RELEASE_REQUESTED → RELEASE_APPROVED → COMPLETED
  │
  └─→ VERIFICATION_FAILED → RETURNED_TO_SELLER → REFUND_PENDING → REFUNDED
```

### 3.2 Stati Package (`HubPackageStatus` - estendere enum esistente)

```typescript
enum HubPackageStatus {
  PENDING              // In attesa di spedizione seller
  IN_TRANSIT_TO_HUB    // Seller ha spedito, in transito verso hub
  RECEIVED_AT_HUB      // Ricevuto all'hub (marcato da HUB_STAFF)
  VERIFICATION_IN_PROGRESS  // Team sta verificando
  VERIFICATION_PASSED      // Verifica OK, carta conforme
  VERIFICATION_FAILED      // Verifica fallita (danni, non conforme)
  SHIPPED_TO_BUYER         // Rispedito a buyer
  IN_TRANSIT_TO_BUYER      // In transito verso buyer
  DELIVERED_TO_BUYER       // Consegnato a buyer (tracking conferma)
  CONFIRMED_BY_BUYER       // Buyer ha confermato ricezione
  RETURNED_TO_SELLER       // Restituito a seller (verifica fallita)
  LOST_IN_TRANSIT          // Perso in transito (disputa)
}
```

### 3.3 Transizioni e Permessi

| Da Stato | A Stato | Chi Può | Condizioni |
|----------|---------|---------|------------|
| `CREATED` | `PENDING_ESCROW_SETUP` | SELLER | Proposta accettata |
| `PENDING_ESCROW_SETUP` | `ESCROW_ACTIVE` | SELLER | Scelto Verified Escrow |
| `ESCROW_ACTIVE` | `AWAITING_HUB_RECEIPT` | SELLER | Tracking number inserito |
| `AWAITING_HUB_RECEIPT` | `HUB_RECEIVED` | HUB_STAFF | Pacco ricevuto fisicamente |
| `HUB_RECEIVED` | `VERIFICATION_IN_PROGRESS` | HUB_STAFF | Verifica avviata |
| `VERIFICATION_IN_PROGRESS` | `VERIFICATION_PASSED` | HUB_STAFF | Verifica OK (min 3 foto) |
| `VERIFICATION_IN_PROGRESS` | `VERIFICATION_FAILED` | HUB_STAFF | Verifica fallita |
| `VERIFICATION_PASSED` | `SHIPPED_TO_BUYER` | HUB_STAFF | Tracking return inserito |
| `SHIPPED_TO_BUYER` | `IN_TRANSIT_TO_BUYER` | SYSTEM | Tracking aggiornato |
| `IN_TRANSIT_TO_BUYER` | `DELIVERED_TO_BUYER` | SYSTEM/BUYER | Tracking conferma consegna |
| `DELIVERED_TO_BUYER` | `CONFIRMED_BY_BUYER` | BUYER | Buyer conferma ricezione |
| `DELIVERED_TO_BUYER` | `RELEASE_REQUESTED` | SYSTEM | 72h dopo consegna (auto) |
| `CONFIRMED_BY_BUYER` | `RELEASE_REQUESTED` | SYSTEM | Buyer conferma |
| `RELEASE_REQUESTED` | `RELEASE_APPROVED` | ADMIN/MODERATOR | Doppia conferma |
| `RELEASE_APPROVED` | `COMPLETED` | SYSTEM | Fondi rilasciati |
| `VERIFICATION_FAILED` | `RETURNED_TO_SELLER` | HUB_STAFF | Tracking return inserito |
| `RETURNED_TO_SELLER` | `REFUND_PENDING` | SYSTEM | Pacco restituito |
| `REFUND_PENDING` | `REFUNDED` | ADMIN/MODERATOR | Rimborso approvato |

---

## 4. Georeferenziazione Negozi

### 4.1 Requisito

**Mostrare solo negozi fisici locali nella stessa zona geografica del buyer/seller.**

### 4.2 Implementazione

#### **A) Aggiungere Coordinate a Shop**

```prisma
model Shop {
  // ... campi esistenti ...
  
  // Georeferenziazione
  latitude  Float?  // Latitudine negozio
  longitude Float?  // Longitudine negozio
  address   String? // Indirizzo completo (già esiste)
  city      String? // Città (già esiste)
  
  @@index([latitude, longitude]) // Per query geografiche
}
```

#### **B) Calcolo Distanza**

Usare formula Haversine per calcolare distanza tra due coordinate:

```typescript
// src/lib/utils/geolocation.ts
export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371 // Raggio Terra in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distanza in km
}
```

#### **C) Filtro Negozi per Zona**

**Strategia 1: Usare città del buyer/seller**
- Se buyer ha `city` nel profilo, mostra solo negozi in quella città
- Se seller ha `city` nel profilo, mostra solo negozi in quella città
- Se entrambi hanno città diverse, mostra negozi in entrambe le città

**Strategia 2: Usare coordinate (più preciso)**
- Se buyer ha `latitude/longitude` nel profilo, calcola distanza
- Mostra solo negozi entro X km (es. 50 km)
- Se seller ha coordinate, mostra negozi entro X km da seller

**Strategia 3: Usare provincia/regione**
- Raggruppa per provincia
- Mostra negozi nella stessa provincia

**IMPLEMENTAZIONE RACCOMANDATA**: Strategia 1 (città) + Strategia 2 (coordinate se disponibili)

#### **D) Geocoding Indirizzo → Coordinate

Per convertire indirizzo in coordinate:
- **Opzione 1**: Google Maps Geocoding API (più preciso, richiede API key)
- **Opzione 2**: OpenStreetMap Nominatim (gratuito, rate limit)
- **Opzione 3**: Database città italiane (già presente in `src/lib/utils/distance.ts`)

**Per MVP**: Usare database città italiane esistente + geocoding manuale per negozi.

---

## 5. Flusso Operativo Completo

### 5.1 Step 1: Seller Crea Listing e Accetta Proposta

**Come Escrow Locale**, ma con opzione aggiuntiva "Verified Escrow".

### 5.2 Step 2: Seller Sceglie Metodo Escrow

**UI**: `/select-store` o nuova pagina `/select-escrow-method`

**Opzioni**:
1. **Escrow Locale** (negozi fisici locali - georeferenziati)
2. **Verified Escrow** (SafeTrade Hub - nuovo)

**Se sceglie Verified Escrow**:
- Mostra info servizio
- Mostra costi (fee piattaforma + shipping)
- Seller conferma

### 5.3 Step 3: Seller Inserisce Tracking Number

**API**: `POST /api/transactions/[id]/package/track`

**Validazione**:
- Tracking number non vuoto
- Formato valido (dipende corriere)
- Non già inserito
- Transazione in stato `ESCROW_ACTIVE`

**Aggiorna**:
- `SafeTradeTransaction.trackingNumber` = tracking inserito
- `SafeTradeTransaction.packageStatus` = `IN_TRANSIT_TO_HUB`
- `SafeTradeTransaction.status` = `AWAITING_HUB_RECEIPT`

### 5.4 Step 4: Hub Staff Riceve Pacco

**UI**: `/admin/hub/packages` (pagina per HUB_STAFF)

**API**: `POST /api/admin/hub/packages/[id]/receive`

**Validazione**:
- User è HUB_STAFF o ADMIN
- Pacco esiste e stato è `IN_TRANSIT_TO_HUB`
- Tracking number corrisponde

**Aggiorna**:
- `SafeTradeTransaction.packageStatus` = `RECEIVED_AT_HUB`
- `SafeTradeTransaction.packageReceivedAt` = now
- `SafeTradeTransaction.status` = `HUB_RECEIVED`

**Notifica**:
- Seller: "Pacco ricevuto all'hub SafeTrade"
- Buyer: "Pacco ricevuto, verifica in corso"

### 5.5 Step 5: Hub Staff Avvia Verifica

**API**: `POST /api/admin/hub/packages/[id]/start-verification`

**Validazione**:
- User è HUB_STAFF o ADMIN
- Stato è `RECEIVED_AT_HUB`

**Aggiorna**:
- `SafeTradeTransaction.packageStatus` = `VERIFICATION_IN_PROGRESS`
- `SafeTradeTransaction.status` = `VERIFICATION_IN_PROGRESS`

### 5.6 Step 6: Hub Staff Carica Foto e Completa Verifica

**UI**: `/admin/hub/packages/[id]/verify`

**API**: `POST /api/admin/hub/packages/[id]/verify`

**Validazione**:
- Minimo 3 foto obbligatorie
- Foto ottimizzate (resize + compression)
- Stato è `VERIFICATION_IN_PROGRESS`

**Campi**:
- `verificationPhotos`: Array path foto (min 3)
- `verificationNotes`: Note verifica
- `verificationResult`: `PASSED` o `FAILED`
- `conditionVerified`: Condizione carta verificata
- `priceFinal`: Prezzo finale (se diverso da listing)

**Se PASSED**:
- `SafeTradeTransaction.packageStatus` = `VERIFICATION_PASSED`
- `SafeTradeTransaction.packageVerifiedAt` = now
- `SafeTradeTransaction.verificationPhotos` = foto caricate
- Crea `VerificationReport` con foto e note

**Se FAILED**:
- `SafeTradeTransaction.packageStatus` = `VERIFICATION_FAILED`
- `SafeTradeTransaction.verificationNotes` = motivo fallimento
- Notifica seller: "Verifica fallita, pacco verrà restituito"
- Notifica buyer: "Verifica fallita, rimborso in corso"

### 5.7 Step 7: Hub Staff Rispedisce a Buyer

**API**: `POST /api/admin/hub/packages/[id]/ship-to-buyer`

**Validazione**:
- User è HUB_STAFF o ADMIN
- Stato è `VERIFICATION_PASSED`
- Return tracking number inserito

**Campi**:
- `returnTrackingNumber`: Tracking number rispedizione

**Aggiorna**:
- `SafeTradeTransaction.returnTrackingNumber` = tracking inserito
- `SafeTradeTransaction.packageStatus` = `SHIPPED_TO_BUYER`
- `SafeTradeTransaction.packageShippedAt` = now
- `SafeTradeTransaction.status` = `SHIPPED_TO_BUYER`

**Notifica**:
- Buyer: "Pacco rispedito, tracking: XXX"
- Seller: "Pacco rispedito a buyer"

### 5.8 Step 8: Buyer Riceve e Conferma

**Opzione A: Buyer Conferma Manualmente**

**UI**: `/transaction/[id]/status` (mostra bottone "Ho ricevuto il pacco")

**API**: `POST /api/transactions/[id]/package/confirm-received`

**Validazione**:
- User è buyer della transazione
- Stato è `DELIVERED_TO_BUYER` o `IN_TRANSIT_TO_BUYER`
- Non già confermato

**Aggiorna**:
- `SafeTradeTransaction.packageStatus` = `CONFIRMED_BY_BUYER`
- `SafeTradeTransaction.packageDeliveredAt` = now (se non già settato)
- `SafeTradeTransaction.status` = `CONFIRMED_BY_BUYER`
- Crea `PendingRelease` per admin approval

**Opzione B: Auto-Release dopo 72h**

**Cron Job**: Eseguito ogni ora

**Logica**:
```typescript
// Trova transazioni con:
// - packageStatus = DELIVERED_TO_BUYER
// - packageDeliveredAt < now - 72 hours
// - status != CONFIRMED_BY_BUYER
// - status != RELEASE_REQUESTED
// - status != COMPLETED

// Per ogni transazione:
// 1. Aggiorna status = RELEASE_REQUESTED
// 2. Crea PendingRelease
// 3. Notifica admin: "Auto-release dopo 72h"
```

### 5.9 Step 9: Admin/Moderator Approva Rilascio Fondi

**Come Escrow Locale** (doppia conferma con token).

**API**: 
- `POST /api/admin/pending-releases/[id]/initiate-approval` (genera token)
- `POST /api/admin/pending-releases/[id]/confirm-approval` (conferma con token)

**Validazione**:
- User è ADMIN o MODERATOR
- PendingRelease esiste e status è `PENDING`
- Token valido e non scaduto
- Payment esiste e status è `HELD`
- Amount corrisponde

**Aggiorna**:
- `PendingRelease.status` = `APPROVED`
- `EscrowPayment.status` = `RELEASED`
- `SafeTradeTransaction.status` = `COMPLETED`
- Aggiorna wallet seller (aggiunge fondi)
- Crea audit log

---

## 6. Sicurezza e Anti-Frodi

### 6.1 Invarianti Server-Side (Hard Rules)

**CRITICO**: Queste regole NON possono essere bypassate.

1. **Invariante 1: Stato Package**
   - `packageStatus` può cambiare solo seguendo la state machine
   - Transizioni illegali vengono rifiutate con 400

2. **Invariante 2: Verifica Foto**
   - Minimo 3 foto obbligatorie per verifica
   - Foto devono essere caricate su Supabase Storage
   - Foto devono essere ottimizzate (max 2MB ciascuna)

3. **Invariante 3: Rilascio Fondi**
   - Fondi possono essere rilasciati SOLO se:
     - `packageStatus` = `CONFIRMED_BY_BUYER` OPPURE
     - `packageStatus` = `DELIVERED_TO_BUYER` + 72h passate
   - Rilascio richiede doppia conferma admin/moderator
   - Token di conferma valido 5 minuti, usa-una-volta

4. **Invariante 4: Tracking Number**
   - Tracking number può essere inserito solo una volta
   - Formato validato (regex per corrieri comuni)
   - Non può essere modificato dopo inserimento

5. **Invariante 5: Ruoli**
   - Solo HUB_STAFF/ADMIN possono marcare pacco ricevuto
   - Solo HUB_STAFF/ADMIN possono avviare/completare verifica
   - Solo BUYER può confermare ricezione
   - Solo ADMIN/MODERATOR può approvare rilascio fondi

6. **Invariante 6: Amount**
   - Amount non può essere negativo o zero
   - Amount non può superare limite (es. €100,000)
   - Amount deve corrispondere tra Payment e PendingRelease

### 6.2 Anti-Frodi

#### **A) Rate Limiting**

- Max 10 tracking numbers inseriti per ora (per seller)
- Max 20 verifiche avviate per ora (per HUB_STAFF)
- Max 5 rilasci fondi per ora (per admin)

#### **B) Validazione Tracking**

- Formato tracking validato (regex per corrieri: DHL, Poste Italiane, SDA, GLS, ecc.)
- Tracking number univoco (non può essere riutilizzato)
- Verifica tracking con API corriere (opzionale, futuro)

#### **C) Audit Trail Completo**

Ogni azione critica viene loggata:
- Chi ha fatto cosa
- Quando
- Da quale IP
- Con quale user agent
- Stato prima/dopo

#### **D) Doppia Conferma Rilascio Fondi**

- Token generato con `crypto.randomBytes(32)`
- Token valido 5 minuti
- Token usa-una-volta (invalidato dopo uso)
- Richiede click esplicito su "Conferma Rilascio"

#### **E) Verifica Foto**

- Hash SHA-256 di ogni foto (per prevenire duplicati)
- Metadata foto (dimensione, width, height, EXIF rimosso)
- Storage sicuro (Supabase Storage con accesso controllato)

#### **F) Timeout e Auto-Release**

- Se buyer non conferma entro 72h, auto-release
- Notifica admin prima di auto-release (24h prima)
- Admin può bloccare auto-release se necessario

### 6.3 Monitoring e Alerting

**Metriche da Monitorare**:
- Numero transazioni Verified Escrow al giorno
- Tempo medio verifica (target: < 24h)
- Tasso di verifica fallite
- Numero dispute
- Tempo medio rilascio fondi

**Alert Critici**:
- Tentativo di bypass state machine
- Tentativo di rilascio fondi non autorizzato
- Tracking number duplicato
- Verifica senza foto
- Rilascio fondi senza doppia conferma

---

## 7. Modello Dati

### 7.1 Estensioni Schema Esistente

**SafeTradeTransaction** (già esiste, aggiungere campi):

```prisma
model SafeTradeTransaction {
  // ... campi esistenti ...
  
  // Verified Escrow specific
  escrowType          EscrowType @default(LOCAL) // LOCAL o VERIFIED
  hubId               String? // NULL per Verified Escrow (usa hub centrale)
  
  // Package tracking (già esiste, verificare)
  packageStatus       HubPackageStatus?
  trackingNumber      String?
  returnTrackingNumber String?
  packageReceivedAt   DateTime?
  packageVerifiedAt   DateTime?
  packageShippedAt    DateTime?
  packageDeliveredAt  DateTime?
  verificationPhotos  String[]
  verificationNotes   String?
  conditionVerified   CardCondition?
  priceFinal          Float?
  
  // Auto-release
  autoReleaseAt       DateTime? // Quando fare auto-release (72h dopo consegna)
  confirmedReceivedAt DateTime? // Quando buyer ha confermato
}
```

**Nuovo Enum**:

```prisma
enum EscrowType {
  LOCAL    // Escrow locale (negozio fisico)
  VERIFIED // Verified Escrow (hub centrale)
}
```

**VerificationReport** (già esiste, verificare se adatto):

```prisma
model VerificationReport {
  // ... campi esistenti ...
  
  // Aggiungere per Verified Escrow
  transactionId       String? // Link diretto a transaction (oltre a sessionId)
  verifiedByRole      String? // 'HUB_STAFF', 'ADMIN'
  conditionVerified   CardCondition?
  priceFinal          Float?
  photosHash          String[] // Hash SHA-256 delle foto
}
```

### 7.2 Nuovo Modello (se necessario)

**HubPackage** (già esiste in schema, verificare):

```prisma
model Package {
  id                  String @id @default(cuid())
  transactionId       String @unique
  transaction         SafeTradeTransaction @relation(...)
  
  // Tracking
  trackingNumber      String?
  returnTrackingNumber String?
  status              HubPackageStatus @default(PENDING)
  
  // Verification
  verifiedById        String? // HUB_STAFF che ha verificato
  verifiedAt          DateTime?
  verificationPhotos  String[]
  verificationNotes   String?
  
  // Timestamps
  receivedAt          DateTime?
  shippedAt           DateTime?
  deliveredAt         DateTime?
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

---

## 8. API Endpoints

### 8.1 Seller Endpoints

**POST `/api/transactions/[id]/select-escrow-type`**
- Seller sceglie tipo escrow (LOCAL o VERIFIED)
- Body: `{ escrowType: "VERIFIED" }`
- Validazione: Seller è userB della transazione

**POST `/api/transactions/[id]/package/track`**
- Seller inserisce tracking number
- Body: `{ trackingNumber: "ABC123..." }`
- Validazione: Formato tracking, stato corretto

### 8.2 Hub Staff Endpoints

**POST `/api/admin/hub/packages/[id]/receive`**
- Marca pacco come ricevuto
- Validazione: User è HUB_STAFF/ADMIN

**POST `/api/admin/hub/packages/[id]/start-verification`**
- Avvia verifica
- Validazione: Stato è RECEIVED_AT_HUB

**POST `/api/admin/hub/packages/[id]/verify`**
- Completa verifica con foto e note
- Body: `{ photos: [...], notes: "...", result: "PASSED" }`
- Validazione: Min 3 foto, stato corretto

**POST `/api/admin/hub/packages/[id]/ship-to-buyer`**
- Rispedisce a buyer
- Body: `{ returnTrackingNumber: "XYZ789..." }`
- Validazione: Stato è VERIFICATION_PASSED

### 8.3 Buyer Endpoints

**POST `/api/transactions/[id]/package/confirm-received`**
- Buyer conferma ricezione
- Validazione: User è buyer, stato corretto

### 8.4 Admin/Moderator Endpoints

**POST `/api/admin/pending-releases/[id]/initiate-approval`**
- Genera token per doppia conferma
- Validazione: User è ADMIN/MODERATOR

**POST `/api/admin/pending-releases/[id]/confirm-approval`**
- Conferma rilascio con token
- Body: `{ confirmationToken: "..." }`
- Validazione: Token valido, non scaduto

### 8.5 System Endpoints (Cron)

**POST `/api/admin/cron/check-auto-release`**
- Verifica transazioni per auto-release (72h)
- Eseguito ogni ora
- Crea PendingRelease se necessario

---

## 9. Piano di Implementazione

### Fase 1: Database e Schema (PRIORITÀ ALTA)
- [ ] Aggiungere `EscrowType` enum
- [ ] Aggiungere campi georeferenziazione a `Shop` (latitude, longitude)
- [ ] Verificare/estendere `HubPackageStatus` enum
- [ ] Verificare `VerificationReport` model
- [ ] Migration database

### Fase 2: Georeferenziazione Negozi (PRIORITÀ ALTA)
- [ ] Utility calcolo distanza (Haversine)
- [ ] Filtro negozi per città/coordinate
- [ ] UI selezione escrow type (LOCAL vs VERIFIED)
- [ ] Aggiornare `/select-store` per mostrare solo negozi locali

### Fase 3: API Seller (PRIORITÀ ALTA)
- [ ] `POST /api/transactions/[id]/select-escrow-type`
- [ ] `POST /api/transactions/[id]/package/track`
- [ ] Validazione tracking number
- [ ] Rate limiting

### Fase 4: API Hub Staff (PRIORITÀ ALTA)
- [ ] `POST /api/admin/hub/packages/[id]/receive`
- [ ] `POST /api/admin/hub/packages/[id]/start-verification`
- [ ] `POST /api/admin/hub/packages/[id]/verify` (con upload foto)
- [ ] `POST /api/admin/hub/packages/[id]/ship-to-buyer`
- [ ] Validazione invarianti
- [ ] Audit trail

### Fase 5: API Buyer (PRIORITÀ ALTA)
- [ ] `POST /api/transactions/[id]/package/confirm-received`
- [ ] UI bottone "Ho ricevuto"
- [ ] Notifiche

### Fase 6: Auto-Release e Cron (PRIORITÀ MEDIA)
- [ ] Cron job per auto-release (72h)
- [ ] `POST /api/admin/cron/check-auto-release`
- [ ] Notifiche admin prima di auto-release

### Fase 7: UI Hub Staff (PRIORITÀ MEDIA)
- [ ] `/admin/hub/packages` (lista pacchi)
- [ ] `/admin/hub/packages/[id]/verify` (pagina verifica con upload foto)
- [ ] Dashboard statistiche

### Fase 8: UI Buyer/Seller (PRIORITÀ MEDIA)
- [ ] Aggiornare `/transaction/[id]/status` per Verified Escrow
- [ ] Mostrare report verifica
- [ ] Mostrare tracking numbers
- [ ] Bottone "Ho ricevuto"

### Fase 9: Testing e Sicurezza (PRIORITÀ CRITICA)
- [ ] Test state machine (tutte le transizioni)
- [ ] Test invarianti (tentativi di bypass)
- [ ] Test rate limiting
- [ ] Test doppia conferma rilascio fondi
- [ ] Test auto-release
- [ ] Security audit completo

---

## 10. Conclusioni

Questo sistema è **CRITICO** perché gestisce pagamenti reali. Ogni implementazione deve essere:

1. ✅ **Testata rigorosamente** prima del deploy
2. ✅ **Documentata** completamente
3. ✅ **Auditata** per sicurezza
4. ✅ **Monitorata** in produzione

**Prossimi Passi**: Iniziare con Fase 1 (Database) e procedere step-by-step.

---

**Documento creato**: 2025-01-27  
**Ultima modifica**: 2025-01-27  
**Status**: Pronto per implementazione

