# SafeTrade — Product Requirements Document (PRD)

**Versione:** 3.0  
**Data:** 11 Febbraio 2026  
**Stato:** Aggiornata allo stato attuale del codebase  

---

## Indice

1. [Vision & Overview](#1-vision--overview)
2. [Tech Stack](#2-tech-stack)
3. [Architettura](#3-architettura)
4. [Ruoli Utente](#4-ruoli-utente)
5. [Database Schema](#5-database-schema)
6. [Autenticazione & Sicurezza](#6-autenticazione--sicurezza)
7. [Marketplace P2P](#7-marketplace-p2p)
8. [Sistema Proposte](#8-sistema-proposte)
9. [SafeTrade Escrow — LOCAL](#9-safetrade-escrow--local)
10. [SafeTrade Escrow — VERIFIED](#10-safetrade-escrow--verified)
11. [SafeVault (Consignment)](#11-safevault-consignment)
12. [Vault Case & QR System](#12-vault-case--qr-system)
13. [Merchant System](#13-merchant-system)
14. [Dashboard Utente](#14-dashboard-utente)
15. [Admin Panel](#15-admin-panel)
16. [Community](#16-community)
17. [Premium & Subscriptions](#17-premium--subscriptions)
18. [Sistema Dispute](#18-sistema-dispute)
19. [Assicurazione Pacchi](#19-assicurazione-pacchi)
20. [Notifiche](#20-notifiche)
21. [Tornei & Eventi](#21-tornei--eventi)
22. [Shipping Integration](#22-shipping-integration)
23. [Design System & UI](#23-design-system--ui)
24. [Internazionalizzazione](#24-internazionalizzazione)
25. [API Reference Completa](#25-api-reference-completa)
26. [Page Routes Completa](#26-page-routes-completa)
27. [Componenti](#27-componenti)
28. [State Machines & Enums](#28-state-machines--enums)
29. [Stato Implementazione](#29-stato-implementazione)

---

## 1. Vision & Overview

**SafeTrade** è una piattaforma marketplace dedicata al trading di carte collezionabili (TCG) con un sistema di escrow integrato che garantisce transazioni sicure tra utenti.

### Giochi Supportati
- Pokémon TCG
- Magic: The Gathering
- Yu-Gi-Oh!
- One Piece TCG
- Digimon TCG
- Altro (generico)

### Modalità di Vendita
1. **Local Escrow** — Transazione in-store presso un negozio partner, con verifica dal vivo da parte del merchant
2. **Verified Escrow** — Spedizione tramite hub centrale, verifica professionale e consegna al buyer
3. **SafeVault** — Consignment: l'utente deposita carte fisiche che vengono esposte e vendute nei negozi partner (online + fisico)

### Value Proposition
- **Buyer**: Garanzia di autenticità, protezione fondi con escrow, dispute resolution
- **Seller**: Esposizione marketplace, pagamento garantito, opzione consignment
- **Merchant**: Inventario aggiuntivo (Vault), commissioni sulle vendite, strumenti di gestione
- **Platform**: Fee su transazioni, subscription premium, servizi vault

---

## 2. Tech Stack

| Layer | Tecnologia |
|-------|-----------|
| Framework | Next.js 14.0.4 (App Router) |
| Linguaggio | TypeScript 5.3.3 |
| Database | PostgreSQL + Prisma 5.7.1 |
| Auth | Supabase Auth (@supabase/ssr 0.8.0) |
| Storage | Supabase Storage + Cloudinary |
| UI Framework | Tailwind CSS + Shadcn/ui (Radix UI) |
| State Management | TanStack React Query 5.17.9 |
| Forms | React Hook Form 7.49.2 + Zod 3.22.4 |
| QR Codes | qrcode + html5-qrcode |
| Shipping | Shippo 2.17.4 / SendCloud |
| 3D/Animations | Three.js, Canvas Confetti, GSAP |
| Fonts | Plus Jakarta Sans (display), Inter (sans) |
| Deployment | Vercel |

### Dipendenze Chiave
```
next: 14.0.4
react: 18.2.0
@prisma/client: 5.7.1
@supabase/supabase-js: 2.39.0
@tanstack/react-query: 5.17.9
react-hook-form: 7.49.2
zod: 3.22.4
tailwindcss: 3.4.0
three: 0.160.0
date-fns: 3.2.0
shippo: 2.17.4
cloudinary: (latest)
sharp: (latest)
```

---

## 3. Architettura

### Struttura Cartelle
```
3SafeTrade/
├── prisma/
│   ├── schema.prisma          # Schema database (2305 righe, 50+ modelli)
│   ├── seed.ts                # Seed database
│   └── seed-subscriptions.ts  # Seed subscription plans
├── src/
│   ├── app/                   # Next.js App Router (97+ pagine)
│   │   ├── (marketplace)/     # Pagine marketplace (listings, transaction)
│   │   ├── admin/             # Admin panel
│   │   ├── api/               # API routes (158+ endpoints)
│   │   ├── dashboard/         # Dashboard utente
│   │   ├── escrow/            # Sessioni escrow
│   │   ├── merchant/          # Pannello merchant
│   │   ├── vault/             # SafeVault utente
│   │   └── ...                # Altre pagine
│   ├── components/            # 44+ componenti React
│   │   ├── homepage/          # Homepage components
│   │   ├── layout/            # Header, Footer, NotificationBell
│   │   ├── marketplace/       # Grid, filtri, badges
│   │   ├── ui/                # Shadcn/ui components
│   │   └── ...
│   ├── lib/                   # 31+ utility files
│   │   ├── supabase/          # Client, server, middleware
│   │   ├── escrow/            # State machine, utils
│   │   ├── vault/             # Audit, QR, splits, state machine
│   │   ├── shipping/          # Shippo, SendCloud
│   │   ├── security/          # Audit, validazione importi
│   │   └── ...
│   ├── hooks/                 # Custom React hooks
│   ├── contexts/              # React contexts
│   ├── types/                 # TypeScript types
│   └── locales/               # i18n (IT/EN)
├── scripts/                   # Utility scripts
├── TECNICO/                   # Documentazione tecnica
└── public/                    # Assets statici
```

### Pattern Architetturali
- **Server Components**: Pagine renderizzate lato server con data fetching diretto
- **API Routes**: Route handlers Next.js per tutte le operazioni CRUD
- **State Machine**: Transizioni di stato definite per Escrow, Vault, Dispute
- **Audit Trail**: Logging completo per operazioni finanziarie e vault
- **Rate Limiting**: Protezione su tutti gli endpoint critici
- **Double Confirmation**: Release fondi richiede doppia conferma admin

---

## 4. Ruoli Utente

### Enum `UserRole`
| Ruolo | Descrizione | Accesso |
|-------|-------------|---------|
| `USER` | Utente base | Marketplace, proposte, SafeVault depositi, community |
| `MERCHANT` | Negoziante partner | Tutto USER + shop, inventario, tornei, vault case, verifiche escrow |
| `MODERATOR` | Moderatore | Conferma release fondi, moderazione community |
| `ADMIN` | Amministratore | Accesso completo: approvazioni, gestione utenti, vault, finanze |
| `HUB_STAFF` | Staff hub | Ricezione depositi vault, verifica pacchi |

### Flusso Merchant
1. User si registra come merchant (durante signup o dalla dashboard)
2. Compila `MerchantApplication` con dati aziendali (P.IVA, ragione sociale, indirizzo)
3. Admin riceve notifica → approva/rifiuta
4. Se approvato: ruolo cambiato a MERCHANT, creazione `Shop`
5. Merchant configura shop (nome, descrizione, indirizzo, orari, coordinate)

---

## 5. Database Schema

### Modelli Principali (50+)

#### Core
| Modello | Descrizione |
|---------|-------------|
| `User` | Utente con ruolo, città, provincia, maxDistance, subscription, karma |
| `Shop` | Negozio merchant con geolocalizzazione, rating, orari, vaultCaseAuthorized |
| `Product` | Prodotto inventario shop |
| `ListingP2P` | Listing P2P marketplace (sale/trade/both) |
| `Proposal` | Proposta su listing (offerta/scambio) |
| `SafeTradeTransaction` | Transazione escrow (LOCAL o VERIFIED) |

#### Escrow
| Modello | Descrizione |
|---------|-------------|
| `EscrowSession` | Sessione escrow con stato, QR, partecipanti |
| `EscrowMessage` | Messaggi nella sessione |
| `EscrowPayment` | Pagamento escrow (PENDING → HELD → RELEASED/REFUNDED) |
| `EscrowWallet` | Wallet utente per fondi escrow |
| `EscrowWalletTransaction` | Storico transazioni wallet |
| `VerificationReport` | Report verifica merchant (foto, note, esito) |
| `EscrowAuditLog` | Audit trail completo |
| `EscrowHub` | Provider servizio escrow verificato |
| `EscrowHubReview` | Recensioni hub |

#### SafeVault
| Modello | Descrizione |
|---------|-------------|
| `VaultDeposit` | Deposito utente (CREATED → SHIPPED → RECEIVED → REVIEWED) |
| `VaultItem` | Singola carta nel vault (PENDING_REVIEW → IN_CASE → LISTED → SOLD) |
| `VaultCase` | Teca fisica brandizzata (30 slot) |
| `VaultCaseSlot` | Singolo slot con QR code univoco |
| `VaultSale` | Vendita fisica in negozio |
| `VaultOrder` | Ordine online |
| `VaultFulfillment` | Spedizione ordine online |
| `VaultSplit` | Split ricavi: 70% owner / 20% merchant / 10% platform |
| `VaultPayoutBatch` | Batch di payout |
| `VaultPayoutLine` | Singola riga payout |
| `VaultCaseRequest` | Richiesta teca da merchant |
| `VaultAuditLog` | Audit operazioni vault |

#### Community
| Modello | Descrizione |
|---------|-------------|
| `Topic` | Subreddit-style topic |
| `Post` | Post nella community |
| `Comment` | Commento (nested) |
| `PostVote` / `CommentVote` | Sistema voti |
| `Badge` / `UserBadge` | Sistema badge |
| `UserKarma` | Karma utente (NEW → TRUSTED → ELITE → LEGEND) |

#### Premium
| Modello | Descrizione |
|---------|-------------|
| `SubscriptionPlan` | Piano (FREE, PREMIUM, PRO) |
| `UserSubscription` | Sottoscrizione utente |
| `FeaturedListing` | Listing in evidenza |
| `PriceAlert` / `AlertTrigger` | Avvisi di prezzo |

#### Dispute & Insurance
| Modello | Descrizione |
|---------|-------------|
| `Dispute` | Disputa su transazione |
| `DisputeMessage` | Messaggi disputa |
| `PackageInsurance` | Assicurazione pacco |
| `Package` / `PackageConsolidation` | Gestione pacchi multi-item |

#### Admin & Finanza
| Modello | Descrizione |
|---------|-------------|
| `PendingRelease` | Approvazione release fondi (double confirmation) |
| `FinancialAuditLog` | Audit finanziario |
| `AdminNotification` | Notifiche admin |
| `SecurityAuditLog` | Audit sicurezza |

#### Altro
| Modello | Descrizione |
|---------|-------------|
| `Notification` | Notifiche utente |
| `Conversation` / `Message` | Sistema messaggistica |
| `Tournament` / `TournamentRegistration` | Tornei TCG |
| `CommunityEvent` / `EventRegistration` | Eventi community |
| `MerchantApplication` | Candidature merchant |
| `Promotion` | Promozioni shop |
| `ImportBatch` | Import inventario |
| `ContactMessage` | Messaggi supporto |
| `ShippingLabel` | Etichette spedizione (Shippo/SendCloud) |

---

## 6. Autenticazione & Sicurezza

### Provider
**Supabase Auth** con cookie-based session (base64url encoding)

### Flusso Auth
1. **Signup**: `POST /api/auth/signup`
   - Crea utente Supabase + record Prisma
   - Campi: email, password, name, city (obbligatoria), province, maxDistance
   - Opzione: signup come merchant (crea `MerchantApplication`)
   - Email verification inviata automaticamente

2. **Login**: `POST /api/auth/login`
   - Supabase `signInWithPassword`
   - Imposta session cookies (base64url)

3. **Session Management**:
   - Middleware refresha sessione ad ogni request
   - Route protette: `/dashboard/*`
   - Helper: `requireAuth()`, `requireRole()`, `requireEmailVerified()`

### Sicurezza
- **Rate Limiting**: Su tutti gli endpoint critici (listings: 10/h, proposals: 20/h, payments: 10/h, refunds: 5/h)
- **Email Verification**: Richiesta per creare listing e proposte
- **Double Confirmation**: Release fondi richiede token + conferma admin
- **Audit Trail**: `SecurityAuditLog`, `FinancialAuditLog`, `EscrowAuditLog`, `VaultAuditLog`
- **Amount Validation**: Validazione importi con tolleranza 5% su pagamenti escrow
- **Risk Scoring**: Calcolo rischio su pagamenti

---

## 7. Marketplace P2P

### Creazione Listing
**Pagina**: `/listings/create`  
**API**: `POST /api/listings`

#### Campi
| Campo | Tipo | Obbligatorio |
|-------|------|-------------|
| title | string | ✅ |
| type | SALE / TRADE / BOTH | ✅ |
| price | number | ✅ (se SALE/BOTH) |
| condition | CardCondition | ✅ |
| game | CardGame | ✅ |
| images | string[] (1-5) | ✅ |
| set | string | ❌ |
| description | string | ❌ |
| cardNumber | string | ❌ |
| rarity | string | ❌ |
| language | string | ❌ |
| wants | string | ❌ |
| isVaultListing | boolean | ❌ |

#### Logica Approvazione
- **Auto-approved** se: email verificata OR account ≥ 7 giorni OR karma positivo OR listing precedenti
- **Manual approval** altrimenti → Admin notification

#### Early Access (Premium)
- Utenti PREMIUM/PRO: listing con visibilità `EARLY_ACCESS` per 24h
- Dopo 24h: diventa `PUBLIC`
- Utenti FREE: vedono solo listing `PUBLIC` o con `EARLY_ACCESS` scaduto

#### SafeVault Listing
- Se `isVaultListing = true`: crea automaticamente `VaultDeposit` + `VaultItem`
- Prezzo minimo: 40€
- Split: 70% owner / 20% merchant / 10% piattaforma

### Browse Listings
**Pagina**: `/listings`  
**API**: `GET /api/listings`

#### Filtri Disponibili
- Gioco (Pokemon, Magic, Yu-Gi-Oh, One Piece, Digimon)
- Condizione (Mint → Poor)
- Tipo (Sale, Trade, Both)
- Range prezzo (min/max)
- Ricerca testuale (q)
- Città
- Tipo venditore (sellerType)
- SafeVault (isVault)
- Early Access (earlyAccess)

#### Ordinamento
- Data (più recente)
- Prezzo (crescente/decrescente)
- Popolarità

#### UI
- Grid responsive con card
- Badge condizione (colorati)
- Badge SafeVault (se applicabile)
- Info seller (nome, città)
- Immagine con 3D tilt effect (pagina dettaglio)
- Paginazione

### Listing Detail
**Pagina**: `/listings/[id]`  
**API**: `GET /api/listings/[id]`

- Immagine con effetto 3D tilt
- Dettagli carta (gioco, set, condizione, lingua, rarità)
- Info seller
- Se SafeVault: info vault (negozio, split, stato)
- Azioni owner: Modifica, Elimina, I Miei Listing
- Azioni altri: Proponi Scambio/Offerta, Contatta Seller

---

## 8. Sistema Proposte

### Creazione Proposta
**Pagina**: `/listings/[id]/propose`  
**API**: `POST /api/proposals`

#### Campi
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| listingId | string | Listing target |
| type | SALE / TRADE | Tipo proposta |
| offerPrice | number | Prezzo offerto (se SALE) |
| tradeItems | string | Descrizione carte offerte (se TRADE) |
| message | string | Messaggio opzionale |
| feePaidBy | SELLER / BUYER / SPLIT | Chi paga la fee SafeTrade |

### Stati Proposta
```
PENDING → ACCEPTED → (Transaction creata)
PENDING → REJECTED
PENDING → CANCELLED (dal proposer)
```

### Flusso Post-Accettazione
1. Seller accetta proposta
2. Redirect a selezione metodo escrow (`/select-escrow-method`)
3. Opzioni:
   - **LOCAL**: seleziona store → prenota appuntamento → crea transazione
   - **VERIFIED**: crea transazione immediatamente con hub centrale

---

## 9. SafeTrade Escrow — LOCAL

### Flusso Completo

```
1. Proposta accettata
2. Seller seleziona LOCAL
3. Seller sceglie negozio partner (/select-store)
   - Lista negozi con rating, indirizzo, distanza
   - Filtro per distanza (basato su maxDistance utente)
4. Seller prenota appuntamento (/select-appointment)
   - Calendario: prossimi 7 giorni
   - Slot orari disponibili
   - Riepilogo pagamento con breakdown fee
5. Transazione creata (POST /api/transactions)
   - Genera EscrowSession
   - Genera EscrowPayment
   - Genera QR Token (scadenza 7 giorni)
   - Priority tier basato su subscription (STANDARD/PRIORITY/FAST_TRACK)
6. Entrambi ricevono QR code (/transaction/[id]/status)
7. Incontro in negozio
   - Merchant scansiona QR → Check-in (POST /api/escrow/sessions/[id]/checkin)
   - Buyer conferma presenza
8. Verifica merchant
   - START: inizio verifica
   - COMPLETE: minimo 3 foto, esito PASSED/FAILED
9. Pagamento
   - Buyer crea pagamento (POST /api/escrow/payments)
   - Metodo: CASH / ONLINE / BANK_TRANSFER
   - Fondi in HOLD
10. Rilascio fondi
    - Merchant richiede release (POST /api/escrow/payments/[id]/release)
    - Crea PendingRelease (richiede approvazione admin)
    - Admin approva con double confirmation (initiate → confirm con token)
    - Fondi rilasciati, wallet aggiornato
```

### EscrowSession Status Flow
```
SCHEDULED → CHECKED_IN → VERIFICATION_IN_PROGRESS → VERIFICATION_COMPLETE →
PAYMENT_PENDING → PAYMENT_HELD → COMPLETED
```

### Transaction Status Flow (LOCAL)
```
PENDING_APPOINTMENT → PENDING_ESCROW_SETUP → PENDING_CHECKIN →
VERIFICATION_IN_PROGRESS → PENDING_PAYMENT → PAYMENT_HELD →
COMPLETED → RELEASE_REQUESTED → FUNDS_RELEASED
```

---

## 10. SafeTrade Escrow — VERIFIED

### Flusso Completo

```
1. Proposta accettata
2. Seller seleziona VERIFIED
3. Transazione creata immediatamente
4. Seller genera etichetta spedizione (/transaction/[id]/verified-escrow/generate-label)
   - Input: peso, dimensioni, indirizzo mittente
   - Integrazione Shippo/SendCloud
   - Etichetta PDF scaricabile
5. Seller spedisce all'hub SafeTrade
6. Hub riceve pacco
   - Validazione tracking
   - Inizio verifica
7. Hub verifica carte
   - Foto, report, esito PASSED/FAILED
8. Hub spedisce al buyer
   - Tracking aggiornato
9. Buyer riceve e conferma
10. Auto-release fondi dopo 72h dalla consegna
    - Cron job: POST /api/admin/cron/check-auto-release
    - Crea PendingRelease automatico
```

### HubPackage Status Flow
```
PENDING → LABEL_CREATED → SHIPPED_TO_HUB → RECEIVED_AT_HUB →
VERIFICATION_IN_PROGRESS → VERIFIED → SHIPPED_TO_BUYER →
DELIVERED → AUTO_RELEASED
```

### Admin Cron Jobs
| Endpoint | Funzione |
|----------|----------|
| `POST /api/admin/cron/check-auto-release` | Auto-release dopo 72h |
| `POST /api/admin/cron/create-pending-releases` | Crea pending releases scadute |
| `POST /api/admin/cron/notify-pending-timeout` | Notifica timeout approvazioni |

---

## 11. SafeVault (Consignment)

### Concept
L'utente deposita carte fisiche presso l'hub SafeTrade. Le carte vengono assegnate a negozi partner che le espongono in teche brandizzate. Le carte possono essere vendute sia fisicamente in negozio che online. I ricavi vengono divisi:

- **70%** — Owner (proprietario carta)
- **20%** — Merchant (negozio che espone)
- **10%** — SafeTrade (piattaforma)

### Flusso Deposito

```
1. Utente crea deposito (/vault/deposit/new)
   - Wizard 3 step: Info → Aggiungi Carte → Riepilogo
   - Ogni carta: gioco, nome, set, condizione dichiarata, foto
   - Prezzo minimo: 40€ per carta
   - Accettazione termini (split 70/20/10)

2. Deposito creato (POST /api/vault/deposits)
   - Status: CREATED
   - Items: PENDING_REVIEW

3. Utente spedisce all'hub
   - Inserisce tracking (PATCH /api/vault/deposits/[id]/mark-shipped)
   - Status: SHIPPED (opzionale, basato su tracking)

4. Hub riceve (POST /api/vault/deposits/[id]/receive)
   - Status: RECEIVED
   - Timestamp ricezione
   - Notifica all'utente

5. Hub revisiona (POST /api/vault/deposits/[id]/review)
   - Per ogni item: ACCEPT (con condizione verificata + prezzo finale) o REJECT
   - Deposit status: ACCEPTED / PARTIAL / REJECTED
   - Items accettati: IN_HUB
   - Notifica all'utente

6. Admin assegna items a negozi
   - Item status: ASSIGNED → IN_TRANSIT → IN_SHOP

7. Merchant posiziona in teca
   - Scansiona QR slot → seleziona item → assegna
   - Item status: IN_CASE

8. Vendita
   - Fisica: merchant scansiona → registra vendita con prezzo e proof
   - Online: item listato → buyer ordina → merchant fulfills
   - Item status: SOLD

9. Split & Payout
   - VaultSplit creato automaticamente (70/20/10)
   - VaultPayoutBatch → VaultPayoutLine
   - Owner riceve payout
```

### Vault Deposit Status Flow
```
CREATED → SHIPPED → RECEIVED → UNDER_REVIEW →
ACCEPTED / PARTIAL / REJECTED → CLOSED
```

### Vault Item Status Flow
```
PENDING_REVIEW → IN_HUB → ASSIGNED → IN_TRANSIT →
IN_SHOP → IN_CASE → LISTED_ONLINE → SOLD
(oppure REJECTED / RETURNED)
```

---

## 12. Vault Case & QR System

### Richiesta Teca Merchant

**Pagina merchant**: `/merchant/vault/requests`  
**Pagina admin**: `/admin/vault/requests`

```
1. Merchant richiede teca (POST /api/vault/requests)
   - Validazione: no teca esistente, no richiesta pendente
   - Admin notification

2. Admin review
   - Tab "Richieste": approva/rifiuta con note
   - Se approvata: merchant può procedere al pagamento

3. Pagamento
   - Costo: €299
   - Merchant conferma invio pagamento (POST /api/vault/requests/[id]/confirm-payment)
   - Admin verifica ricezione

4. Admin conferma pagamento (PATCH /api/admin/vault/requests/[id] → PAID)
   - Crea VaultCase automaticamente (30 slot, S01-S30)
   - Ogni slot: QR token univoco
   - Shop: vaultCaseAuthorized = true
   - Request status: COMPLETED
```

### VaultCase Request Status Flow
```
PENDING → APPROVED → PAYMENT_SENT → PAID → COMPLETED
PENDING → REJECTED
```

### Struttura Teca
- **VaultCase**: teca fisica con label, assegnata a shop
- **VaultCaseSlot**: 30 slot (S01-S30), ognuno con QR token univoco
- **Status slot**: FREE / OCCUPIED

### QR System
- Ogni slot ha un QR code univoco generabile/stampabile
- Merchant scansiona QR per:
  - **Posizionare**: assegna item a slot
  - **Spostare**: muove item tra slot
  - **Vendere**: registra vendita fisica
  - **Listare Online**: pubblica item online
  - **Fulfillment**: gestisce ordini online
- Pagina stampa batch QR: `/merchant/vault/cases/[id]/qr-print`
- Vista teca: griglia 6x5 con colori per stato slot

---

## 13. Merchant System

### Candidatura
**Pagina**: `/merchant/apply`  
**API**: `POST /api/merchant/application`

#### Dati Richiesti
| Campo | Obbligatorio |
|-------|-------------|
| shopName | ✅ |
| companyName | ✅ |
| vatNumber (P.IVA) | ✅ |
| taxCode | ❌ |
| uniqueCode | ❌ |
| description | ❌ |
| address | ✅ |
| city | ✅ |
| province | ❌ |
| postalCode | ✅ |
| phone | ✅ |
| email | ❌ |
| website | ❌ |
| legalForm | ❌ |

### Dashboard Merchant
**Pagina**: `/merchant/shop`

#### Sezioni
1. **Inventario** (`/merchant/inventory`) — Gestione prodotti shop
2. **SafeTrade** (`/merchant/appointments`) — Appuntamenti escrow
3. **Tornei** (`/merchant/tournaments`) — Creazione e gestione tornei
4. **Promozioni** (`/merchant/promos`) — Gestione promozioni
5. **Vault** (`/merchant/vault`) — Dashboard SafeVault
6. **Ordini** (`/merchant/orders`) — Ordini ricevuti
7. **Verifica QR** (`/merchant/verify/scan`) — Scanner QR per check-in

### Merchant Vault Dashboard
**Pagina**: `/merchant/vault`

#### Requisiti Accesso
- Ruolo MERCHANT o ADMIN
- Shop con `vaultCaseAuthorized = true` OPPURE `VaultCaseRequest` con status PAID/COMPLETED

#### Statistiche
- Items totali assegnati
- Items in teca
- Items listati online
- Items venduti
- Ricavo totale

#### Quick Actions
- **Scansiona QR** (`/merchant/vault/scan`) — Scanner per tutte le operazioni vault
- **Inventario** — Lista items assegnati
- **Ordini** — Ordini online da fulfillare
- **Vista Teca** (`/merchant/vault/cases/[id]`) — Griglia 6x5 interattiva

### Scanner Vault
**Pagina**: `/merchant/vault/scan`

#### Tab Operations
| Tab | Funzione |
|-----|----------|
| Posiziona | Scansiona slot → seleziona item disponibile → assegna |
| Sposta | Seleziona item → scansiona nuovo slot → sposta |
| Vendi | Scansiona slot → inserisci prezzo + prova → registra vendita |
| Lista Online | Scansiona slot → conferma pubblicazione online |
| Fulfillment | Seleziona ordine → aggiungi tracking → conferma spedizione |

---

## 14. Dashboard Utente

**Pagina**: `/dashboard`

### Sezioni
| Pagina | Descrizione |
|--------|-------------|
| `/dashboard` | Dashboard principale (role-based) |
| `/dashboard/profile` | Profilo utente (città, provincia) |
| `/dashboard/settings` | Impostazioni |
| `/dashboard/listings` | I miei listing (gestione, filtri active/inactive) |
| `/dashboard/listings/[id]/promote` | Promuovi listing |
| `/dashboard/proposals/received` | Proposte ricevute (accetta/rifiuta) |
| `/dashboard/proposals/sent` | Proposte inviate (cancella) |
| `/dashboard/merchant/inventory` | Inventario merchant |
| `/dashboard/merchant/create-offer` | Crea offerta |
| `/dashboard/merchant/offers` | Le mie offerte |

### Proposte Ricevute
- Lista proposte con dettagli (tipo, prezzo, messaggio, fee payment)
- Azioni: Accetta → redirect a escrow method selection
- Se VERIFIED: link diretto a generate label
- Tracking stato transazione

### Sell Page
**Pagina**: `/sell`
- **Per USER**: 3 opzioni (Local Escrow, Verified Escrow, SafeVault)
- **Per MERCHANT/ADMIN**: "Vendi come Merchant" + gestione shop

---

## 15. Admin Panel

**Pagina**: `/admin`

### Dashboard
- Stats: utenti, listing, transazioni, shop, pending
- Quick action cards per ogni sezione

### Sezioni Admin

| Pagina | Funzione |
|--------|----------|
| `/admin/users` | Gestione utenti (ruoli, ban) |
| `/admin/shops` | Gestione negozi |
| `/admin/applications` | Approvazione candidature merchant |
| `/admin/listings` | Moderazione listing (approve/reject) |
| `/admin/transactions` | Monitoraggio transazioni |
| `/admin/disputes` | Gestione dispute |
| `/admin/pending-releases` | Approvazione release fondi (double confirmation) |
| `/admin/insurance` | Gestione assicurazioni |
| `/admin/hub` | Gestione hub escrow verificato |
| `/admin/hub/packages` | Gestione pacchi hub |
| `/admin/hub/packages/[id]/verify` | Verifica pacco |
| `/admin/hub/packages/[id]/ship` | Spedizione pacco |
| `/admin/vault/requests` | Review richieste teca vault |
| `/admin/audit-log` | Log audit completo |
| `/admin/reports` | Report e statistiche |

### Vault Requests Admin
**Pagina**: `/admin/vault/requests`

#### Due Tab
1. **Richieste**: Approvazione/rifiuto richieste teca
   - Review panel con dettagli merchant/shop
   - Admin notes
   - Azioni: Approva / Rifiuta

2. **Pagamenti**: Verifica pagamenti ricevuti
   - Conferma ricezione pagamento €299
   - Crea automaticamente VaultCase (30 slot con QR)
   - Autorizza shop

### Release Fondi (Double Confirmation)
```
1. Merchant richiede release
2. PendingRelease creata (status: PENDING)
3. Admin Step 1: Initiate Approval
   - Genera confirmation_token (scadenza 1h)
4. Admin Step 2: Confirm Approval
   - Valida token + scadenza
   - Transazione atomica:
     - Aggiorna PendingRelease → APPROVED
     - Crea FinancialAuditLog
     - Aggiorna EscrowWallet
     - Crea wallet transaction
     - Aggiorna EscrowPayment → RELEASED
     - Aggiorna transaction status → FUNDS_RELEASED
   - Notifiche a buyer e seller
```

---

## 16. Community

### Struttura
- **Topics**: Subreddit-style (creabili dagli utenti)
- **Posts**: Testo, link, immagini
- **Comments**: Nested (thread)
- **Votes**: Up/Down su post e commenti
- **Karma**: Basato su voti ricevuti

### Pagine
| Pagina | Funzione |
|--------|----------|
| `/community` | Homepage community |
| `/community/posts/[id]` | Dettaglio post con commenti |
| `/community/submit` | Crea nuovo post |
| `/community/create-subreddit` | Crea nuovo topic |

### Karma System
| Livello | Requisito |
|---------|-----------|
| NEW | Default |
| TRUSTED | Karma positivo costante |
| ELITE | Alto karma |
| LEGEND | Karma eccezionale |
| BANNED | Utente bannato |

### Badge System
- Badge assegnabili dagli admin
- Visualizzati nel profilo e nei post
- Gamification per engagement

---

## 17. Premium & Subscriptions

### Piani

| Piano | Prezzo | Funzionalità |
|-------|--------|-------------|
| FREE | €0/mese | Marketplace base, community, 1 listing |
| PREMIUM | TBD | Early Access 24h, Priority SafeTrade, listing multipli |
| PRO | TBD | Tutto Premium + Fast Track, analytics avanzati |

### Funzionalità Premium
- **Early Access**: Listing visibili solo ai premium per 24h
- **Priority SafeTrade**: Tier PRIORITY nelle transazioni
- **Featured Listings**: Listing in evidenza nel marketplace
- **Price Alerts**: Avvisi quando un listing match specifici criteri
- **Premium Community**: Accesso sezioni esclusive

### Featured Listings
**Pagina**: `/featured-listings`  
**API**: `GET /api/listings/featured`
- Listing con prezzo ≥ €100
- Ordinamento per prezzo (desc) poi data (desc)
- Badge speciali nella grid

---

## 18. Sistema Dispute

### Tipi Disputa
| Tipo | Descrizione |
|------|-------------|
| NOT_DELIVERED | Pacco non consegnato |
| DAMAGED_CARDS | Carte danneggiate |
| WRONG_CONTENT | Contenuto errato |
| MISSING_ITEMS | Items mancanti |
| CONDITION_MISMATCH | Condizione non corrispondente |
| DELAY | Ritardo |
| OTHER | Altro |

### Flusso Disputa
```
1. Buyer apre disputa (POST /api/disputes)
   - Status: OPEN
   - Tipo, descrizione, prove fotografiche

2. Seller risponde
   - Status: SELLER_RESPONSE
   - Messaggio + prove

3. Escalation (opzionale)
   - Buyer o seller escala
   - Status: ESCALATED

4. Mediazione admin
   - Status: IN_MEDIATION
   - Admin esamina prove

5. Risoluzione
   - Status: RESOLVED
   - Risoluzioni: REFUND_FULL, REFUND_PARTIAL, REPLACEMENT, RETURN_REQUIRED, IN_FAVOR_BUYER, IN_FAVOR_SELLER
   - Se refund: crea PendingRelease automaticamente
```

### Pagine Dispute
| Pagina | Funzione |
|--------|----------|
| `/disputes/[id]` | Dettaglio disputa con chat |
| `/admin/disputes` | Lista dispute (admin) |

---

## 19. Assicurazione Pacchi

### Funzionalità
- Assicurazione opzionale su transazioni VERIFIED
- Calcolo premio basato su valore dichiarato
- Claim process in caso di danno/smarrimento

### Status Flow
```
NOT_INSURED → ACTIVE → CLAIMED → SETTLED / EXPIRED
```

### API
| Endpoint | Funzione |
|----------|----------|
| `GET /api/transactions/[id]/insurance/calculate` | Calcola premio |
| `POST /api/transactions/[id]/insurance` | Aggiungi assicurazione |
| `GET /api/insurance/[id]` | Dettaglio assicurazione |
| `POST /api/insurance/[id]/claim` | Apri claim |
| `POST /api/insurance/[id]/settle` | Risolvi claim |

---

## 20. Notifiche

### Due Sistemi Paralleli

#### Notifiche Utente (`Notification`)
- **Campanella**: `NotificationBell.tsx` nell'header
- **API**: `GET /api/notifications`, `POST /api/notifications/[id]/read`
- **Polling**: Aggiornamento periodico
- **Tipi**: nuova proposta, proposta accettata/rifiutata, transazione aggiornata, escrow status, vault status

#### Notifiche Admin (`AdminNotification`)
- **Campanella**: `AdminNotificationBell.tsx` nell'header (solo admin)
- **API**: `GET /api/admin/notifications`, `POST /api/admin/notifications/[id]/read`
- **Priorità**: Badge colorati per urgenza
- **Tipi**: nuova candidatura merchant, listing da approvare, release da confermare, vault request, nuova transazione verified

---

## 21. Tornei & Eventi

### Tornei
**Pagina merchant**: `/merchant/tournaments`  
**Pagina pubblica**: `/tournaments`

#### Flusso
1. Merchant crea torneo (gioco, data, luogo, max giocatori, descrizione)
2. Status: DRAFT → PUBLISHED → IN_PROGRESS → COMPLETED
3. Utenti si registrano
4. Merchant gestisce (check-in, risultati)

### Eventi Community
**Pagina pubblica**: `/events`

- Eventi calendario creati da admin/merchant
- Registrazione utenti
- Dettagli (data, luogo, descrizione)

---

## 22. Shipping Integration

### Provider Supportati
| Provider | Utilizzo |
|----------|----------|
| **Shippo** | Generazione etichette, tracking |
| **SendCloud** | Alternativa per carrier italiani |

### Funzionalità
- Generazione etichette PDF
- Calcolo costi spedizione
- Tracking automatico
- Supporto carrier italiani (BRT, SDA, Poste, GLS)

### API
| Endpoint | Funzione |
|----------|----------|
| `POST /api/transactions/[id]/verified-escrow/generate-label` | Genera etichetta |
| `POST /api/transactions/[id]/verified-escrow/track` | Tracking pacco |
| `POST /api/admin/hub/packages/[id]/validate-tracking` | Valida tracking |
| `POST /api/admin/hub/packages/[id]/ship-to-buyer` | Spedisci al buyer |

---

## 23. Design System & UI

### Theme
- **Primary Color**: #FF6B35 (arancione SafeTrade)
- **Dark Mode**: Class-based, default dark
- **Fonts**: Plus Jakarta Sans (headings), Inter (body)
- **Border Radius**: 12px default

### Effetti Speciali
| Effetto | Dove |
|---------|------|
| Liquid Glass | Header, badge, cards speciali |
| 3D Tilt | Immagini listing (dettaglio) |
| Metaball Background | Homepage, onboarding |
| Animated Orbs | Marketplace |
| Confetti | Transazione completata |
| Glow Effects | CTA buttons, badge premium |

### Componenti UI (Shadcn/ui)
Alert, Avatar, Badge (6 varianti), Button (7 varianti + 3 sizes), Card, Dialog, DropdownMenu, Input, Label, Loader, Select, Skeleton, Switch, Textarea, Toast/Toaster

### Custom Components
| Componente | Funzione |
|------------|----------|
| `HeroSection` | Hero homepage con liquid glass |
| `MetaballBackground` | Background Three.js |
| `EscrowAnimation` | Animazione 3 step escrow |
| `EscrowDemo` | Demo interattiva escrow |
| `QRCodeDisplay` | Display QR con download/copy |
| `QRScanner` | Scanner QR camera |
| `CategoryCard` | Card categoria con icone custom |
| `TournamentCard` | Card torneo |
| `AllListingsGrid` | Grid listing con filtri |
| `FeaturedListingsGrid` | Grid listing in evidenza |
| `EmailVerificationBanner` | Banner verifica email |
| `ContactModal` | Modal contatto |
| `ChatWidget` | Widget chat supporto |
| `EarlyAccessBadge` | Badge early access |

---

## 24. Internazionalizzazione

### Lingue Supportate
- 🇮🇹 Italiano (default)
- 🇬🇧 Inglese

### Implementazione
- File traduzioni in `src/locales/`
- `i18n.ts` per utility
- Selettore lingua nell'header
- `LocaleProvider` nel tree componenti

---

## 25. API Reference Completa

### Autenticazione (6 endpoint)
| Metodo | Endpoint | Funzione |
|--------|----------|----------|
| POST | `/api/auth/signup` | Registrazione |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/session` | Sessione corrente |
| GET | `/api/auth/me` | Utente corrente |
| POST | `/api/auth/resend-verification` | Reinvio verifica email |

### Listings (7 endpoint)
| Metodo | Endpoint | Funzione |
|--------|----------|----------|
| GET | `/api/listings` | Lista listing (filtri, paginazione) |
| POST | `/api/listings` | Crea listing |
| GET | `/api/listings/[id]` | Dettaglio listing |
| PATCH | `/api/listings/[id]` | Modifica listing |
| DELETE | `/api/listings/[id]` | Elimina listing |
| GET | `/api/listings/my` | I miei listing |
| GET | `/api/listings/featured` | Listing in evidenza |

### Proposte (5 endpoint)
| Metodo | Endpoint | Funzione |
|--------|----------|----------|
| GET | `/api/proposals` | Lista proposte (sent/received) |
| POST | `/api/proposals` | Crea proposta |
| GET | `/api/proposals/[id]` | Dettaglio proposta |
| PATCH | `/api/proposals/[id]` | Aggiorna stato proposta |
| GET | `/api/proposals/[id]/check-seller` | Verifica seller |

### Transazioni (14 endpoint)
| Metodo | Endpoint | Funzione |
|--------|----------|----------|
| GET | `/api/transactions` | Lista transazioni |
| POST | `/api/transactions` | Crea transazione |
| GET | `/api/transactions/[id]` | Dettaglio transazione |
| PATCH | `/api/transactions/[id]` | Aggiorna transazione |
| POST | `/api/transactions/[id]/verify` | Verifica transazione |
| POST | `/api/transactions/[id]/checkin` | Check-in |
| GET | `/api/transactions/[id]/qr` | Ottieni QR code |
| POST | `/api/transactions/[id]/dispute` | Apri disputa |
| POST | `/api/transactions/[id]/insurance` | Aggiungi assicurazione |
| GET | `/api/transactions/[id]/insurance/calculate` | Calcola assicurazione |
| POST | `/api/transactions/[id]/package/verify` | Verifica pacco |
| POST | `/api/transactions/[id]/package/received` | Segna ricevuto |
| POST | `/api/transactions/[id]/package/confirm-received` | Conferma ricezione |
| POST | `/api/transactions/[id]/verified-escrow/generate-label` | Genera etichetta |

### Escrow Sessions (9 endpoint)
| Metodo | Endpoint | Funzione |
|--------|----------|----------|
| GET | `/api/escrow/sessions` | Lista sessioni |
| GET | `/api/escrow/sessions/[id]` | Dettaglio sessione |
| POST | `/api/escrow/sessions/[id]/checkin` | Check-in sessione |
| POST | `/api/escrow/sessions/[id]/verification` | Verifica (START/COMPLETE) |
| POST | `/api/escrow/sessions/[id]/extend` | Estendi sessione |
| POST | `/api/escrow/sessions/[id]/close` | Chiudi sessione |
| GET | `/api/escrow/sessions/[id]/qr` | QR sessione |
| GET | `/api/escrow/sessions/[id]/messages` | Messaggi sessione |
| POST | `/api/escrow/sessions/[id]/messages` | Invia messaggio |

### Escrow Payments (5 endpoint)
| Metodo | Endpoint | Funzione |
|--------|----------|----------|
| GET | `/api/escrow/payments` | Lista pagamenti |
| POST | `/api/escrow/payments` | Crea pagamento |
| POST | `/api/escrow/payments/[id]/hold` | Hold fondi |
| POST | `/api/escrow/payments/[id]/release` | Release fondi |
| POST | `/api/escrow/payments/[id]/refund` | Refund fondi |

### Vault (27+ endpoint)
| Metodo | Endpoint | Funzione |
|--------|----------|----------|
| GET | `/api/vault/deposits` | Lista depositi |
| POST | `/api/vault/deposits` | Crea deposito |
| GET | `/api/vault/deposits/[id]` | Dettaglio deposito |
| PATCH | `/api/vault/deposits/[id]` | Modifica deposito |
| DELETE | `/api/vault/deposits/[id]` | Elimina deposito |
| PATCH | `/api/vault/deposits/[id]/mark-shipped` | Segna spedito |
| POST | `/api/vault/deposits/[id]/receive` | Segna ricevuto (hub) |
| POST | `/api/vault/deposits/[id]/review` | Revisione items |
| GET | `/api/vault/items` | Lista items |
| POST | `/api/vault/items` | Crea item |
| POST | `/api/vault/items/assign` | Assegna item a shop |
| GET | `/api/vault/cases` | Lista teche |
| POST | `/api/vault/cases` | Crea teca (30 slot) |
| GET | `/api/vault/cases/[id]` | Dettaglio teca |
| POST | `/api/vault/cases/[id]/qr-batch` | Genera batch QR |
| GET | `/api/vault/cases/[id]/slots/[slotId]/qr` | QR singolo slot |
| GET | `/api/vault/requests` | Lista richieste teca |
| POST | `/api/vault/requests` | Crea richiesta teca |
| POST | `/api/vault/requests/[id]/confirm-payment` | Conferma pagamento |
| GET | `/api/vault/merchant/inventory` | Inventario merchant |
| GET | `/api/vault/merchant/available-items` | Items disponibili |
| POST | `/api/vault/merchant/assign-item-to-slot` | Assegna a slot |
| POST | `/api/vault/merchant/items/[id]/move-slot` | Sposta item |
| POST | `/api/vault/merchant/items/[id]/list-online` | Lista online |
| POST | `/api/vault/merchant/scan-slot` | Scansiona slot |
| GET | `/api/vault/merchant/sales` | Vendite vault |
| POST | `/api/vault/merchant/sales` | Registra vendita |
| GET | `/api/vault/merchant/orders` | Ordini vault |
| POST | `/api/vault/merchant/orders/[id]/fulfill` | Fulfillment ordine |
| GET | `/api/vault/orders` | Ordini |
| POST | `/api/vault/orders` | Crea ordine |
| GET | `/api/vault/orders/[id]` | Dettaglio ordine |
| POST | `/api/vault/orders/[id]/pay` | Paga ordine |
| GET | `/api/vault/payouts` | Lista payout |
| GET | `/api/vault/payouts/batches` | Lista batch payout |
| POST | `/api/vault/payouts/batches` | Crea batch |
| POST | `/api/vault/payouts/batches/[id]/pay` | Paga batch |

### Admin (25+ endpoint)
| Metodo | Endpoint | Funzione |
|--------|----------|----------|
| GET | `/api/admin/stats` | Statistiche globali |
| GET | `/api/admin/users` | Lista utenti |
| GET/PUT | `/api/admin/users/[id]` | Dettaglio/Modifica utente |
| GET | `/api/admin/shops` | Lista shops |
| GET/PUT | `/api/admin/shops/[id]` | Dettaglio/Modifica shop |
| POST | `/api/admin/shops/[id]/authorize-vault-case` | Autorizza teca vault |
| GET | `/api/admin/applications` | Candidature |
| GET/PUT | `/api/admin/applications/[id]` | Dettaglio/Approva candidatura |
| GET | `/api/admin/listings` | Listing moderazione |
| GET/PUT | `/api/admin/listings/[id]` | Dettaglio/Approva listing |
| GET | `/api/admin/transactions` | Lista transazioni |
| GET | `/api/admin/pending-releases` | Lista pending releases |
| GET | `/api/admin/pending-releases/[id]` | Dettaglio release |
| POST | `/api/admin/pending-releases/[id]/initiate-approval` | Step 1 approvazione |
| POST | `/api/admin/pending-releases/[id]/confirm-approval` | Step 2 conferma |
| POST | `/api/admin/pending-releases/[id]/reject` | Rifiuta release |
| GET | `/api/admin/notifications` | Notifiche admin |
| POST | `/api/admin/notifications/[id]/read` | Segna letta |
| GET | `/api/admin/audit-log` | Audit log |
| GET | `/api/admin/reports` | Report |
| GET | `/api/admin/hub` | Gestione hub |
| GET | `/api/admin/hub/packages` | Lista pacchi |
| POST | `/api/admin/hub/packages/[id]/receive` | Ricevi pacco |
| POST | `/api/admin/hub/packages/[id]/verify` | Verifica pacco |
| POST | `/api/admin/hub/packages/[id]/ship-to-buyer` | Spedisci al buyer |
| GET/PATCH | `/api/admin/vault/requests/[id]` | Review/Update richiesta teca |
| GET | `/api/admin/insurance` | Assicurazioni |

### Merchant (20+ endpoint)
| Metodo | Endpoint | Funzione |
|--------|----------|----------|
| GET/POST | `/api/merchant/application` | Candidatura merchant |
| GET/PUT | `/api/merchant/shop` | Dettaglio/Modifica shop |
| GET/POST | `/api/merchant/products` | Lista/Crea prodotti |
| GET/PUT/DELETE | `/api/merchant/products/[id]` | Dettaglio/Modifica/Elimina prodotto |
| GET/POST | `/api/merchant/offers` | Lista/Crea offerte |
| GET/PUT | `/api/merchant/offers/[id]` | Dettaglio/Modifica offerta |
| GET/POST | `/api/merchant/promos` | Lista/Crea promozioni |
| GET/PUT | `/api/merchant/promos/[id]` | Dettaglio/Modifica promozione |
| GET | `/api/merchant/appointments` | Appuntamenti |
| GET/POST | `/api/merchant/tournaments` | Lista/Crea tornei |
| GET/PUT | `/api/merchant/tournaments/[id]` | Dettaglio/Modifica torneo |
| GET | `/api/merchant/orders` | Ordini merchant |
| GET | `/api/merchant/verify/scan` | Scansione QR |
| GET | `/api/merchant/verify/[qrCode]` | Verifica QR |

### Community (7 endpoint)
| Metodo | Endpoint | Funzione |
|--------|----------|----------|
| GET | `/api/community` | Lista post |
| POST | `/api/community` | Crea post |
| GET | `/api/community/recent` | Post recenti |
| GET | `/api/community/topics` | Lista topic |
| GET | `/api/community/posts/[id]` | Dettaglio post |
| PUT | `/api/community/posts/[id]` | Modifica post |
| POST | `/api/community/posts/[id]/vote` | Vota post |

### Hub (5 endpoint)
| Metodo | Endpoint | Funzione |
|--------|----------|----------|
| GET | `/api/hub/list` | Lista hub |
| GET | `/api/hub/my` | Il mio hub |
| POST | `/api/hub/register` | Registra hub |
| GET | `/api/hub/[id]` | Dettaglio hub |
| POST | `/api/hub/[id]/review` | Recensisci hub |

### Altro (15+ endpoint)
| Metodo | Endpoint | Funzione |
|--------|----------|----------|
| GET | `/api/shops` | Lista shops pubblici |
| GET | `/api/shops/[slug]` | Shop per slug |
| GET/POST | `/api/conversations` | Messaggistica |
| GET/POST | `/api/conversations/[id]/messages` | Messaggi conversazione |
| GET | `/api/tournaments` | Tornei pubblici |
| POST | `/api/tournaments/[id]/register` | Registrazione torneo |
| GET | `/api/events` | Eventi |
| POST | `/api/events/[id]/register` | Registrazione evento |
| GET/PATCH | `/api/user/profile` | Profilo utente |
| GET | `/api/user/has-shop` | Verifica shop |
| GET | `/api/user/role` | Ruolo utente |
| GET | `/api/subscriptions/plans` | Piani subscription |
| GET | `/api/subscriptions/my` | La mia subscription |
| GET | `/api/notifications` | Notifiche |
| POST | `/api/notifications/[id]/read` | Segna letta |
| GET | `/api/search/listings` | Ricerca listing |
| GET | `/api/featured` | Featured |
| POST | `/api/contact` | Contatto |
| POST | `/api/upload` | Upload file |
| GET | `/api/disputes` | Lista dispute |
| POST | `/api/disputes` | Crea disputa |
| GET/PATCH | `/api/disputes/[id]` | Dettaglio/Update disputa |

---

## 26. Page Routes Completa

### Pagine Pubbliche
| Route | Descrizione |
|-------|-------------|
| `/` | Homepage |
| `/login` | Login |
| `/signup` | Registrazione |
| `/listings` | Browse marketplace |
| `/listings/[id]` | Dettaglio listing |
| `/listings/create` | Crea listing |
| `/listings/[id]/edit` | Modifica listing |
| `/listings/[id]/propose` | Proponi su listing |
| `/shops/[slug]` | Pagina pubblica shop |
| `/stores` | Directory negozi |
| `/tournaments` | Lista tornei |
| `/events` | Calendario eventi |
| `/community` | Community homepage |
| `/community/posts/[id]` | Dettaglio post |
| `/community/submit` | Crea post |
| `/community/create-subreddit` | Crea topic |
| `/safetrade` | Info SafeTrade |
| `/safetrade/info` | Dettagli SafeTrade |
| `/vault` | Info SafeVault |
| `/pricing` | Prezzi |
| `/faq` | FAQ |
| `/terms` | Termini di Servizio |
| `/privacy` | Privacy Policy |
| `/featured-listings` | Listing in evidenza |
| `/sell` | Pagina vendita |
| `/onboarding` | Onboarding flow |
| `/scan/[token]` | Scanner QR generico |

### Flusso Transazione
| Route | Descrizione |
|-------|-------------|
| `/select-escrow-method` | Selezione metodo escrow |
| `/select-store` | Selezione negozio partner |
| `/select-appointment` | Prenotazione appuntamento |
| `/appointment-confirmation` | Conferma appuntamento |
| `/transaction/[id]/welcome` | Welcome transazione |
| `/transaction/[id]/status` | Status + QR code |
| `/transaction/[id]/outcome` | Esito transazione |
| `/transaction/[id]/verified-escrow/setup` | Setup verified (deprecated) |
| `/transaction/[id]/verified-escrow/generate-label` | Genera etichetta |

### Dashboard Utente
| Route | Descrizione |
|-------|-------------|
| `/dashboard` | Dashboard principale |
| `/dashboard/profile` | Profilo |
| `/dashboard/settings` | Impostazioni |
| `/dashboard/listings` | I miei listing |
| `/dashboard/listings/[id]/promote` | Promuovi listing |
| `/dashboard/proposals/received` | Proposte ricevute |
| `/dashboard/proposals/sent` | Proposte inviate |
| `/dashboard/merchant/inventory` | Inventario merchant |
| `/dashboard/merchant/create-offer` | Crea offerta |
| `/dashboard/merchant/offers` | Le mie offerte |
| `/dashboard/vls/appointments` | VLS Appuntamenti |
| `/dashboard/vls/verify/[id]` | VLS Verifica |
| `/dashboard/vls/review/[id]` | VLS Review |

### Merchant
| Route | Descrizione |
|-------|-------------|
| `/merchant/apply` | Candidatura |
| `/merchant/setup` | Setup shop |
| `/merchant/shop` | Dashboard merchant |
| `/merchant/inventory` | Inventario |
| `/merchant/inventory/new` | Nuovo prodotto |
| `/merchant/inventory/[id]/edit` | Modifica prodotto |
| `/merchant/offers` | Offerte |
| `/merchant/promos` | Promozioni |
| `/merchant/social` | Social media |
| `/merchant/tournaments` | Tornei |
| `/merchant/tournaments/new` | Nuovo torneo |
| `/merchant/tournaments/[id]` | Dettaglio torneo |
| `/merchant/appointments` | Appuntamenti SafeTrade |
| `/merchant/orders` | Ordini |
| `/merchant/verify/scan` | Scanner QR |
| `/merchant/verify/[qrCode]` | Verifica QR |
| `/merchant/vault` | Dashboard Vault |
| `/merchant/vault/cases/[id]` | Dettaglio teca |
| `/merchant/vault/cases/[id]/qr-print` | Stampa QR |
| `/merchant/vault/scan` | Scanner Vault |
| `/merchant/vault/sales` | Vendite Vault |
| `/merchant/vault/requests` | Richieste teca |
| `/merchant/vault/statement` | Estratto conto |

### Admin
| Route | Descrizione |
|-------|-------------|
| `/admin` | Dashboard admin |
| `/admin/users` | Gestione utenti |
| `/admin/shops` | Gestione shops |
| `/admin/applications` | Candidature |
| `/admin/listings` | Moderazione listing |
| `/admin/transactions` | Transazioni |
| `/admin/disputes` | Dispute |
| `/admin/pending-releases` | Release fondi |
| `/admin/insurance` | Assicurazioni |
| `/admin/hub` | Hub management |
| `/admin/hub/packages` | Pacchi hub |
| `/admin/hub/packages/[id]/verify` | Verifica pacco |
| `/admin/hub/packages/[id]/ship` | Spedisci pacco |
| `/admin/vault/requests` | Richieste teca |
| `/admin/audit-log` | Audit log |
| `/admin/reports` | Report |

### Escrow
| Route | Descrizione |
|-------|-------------|
| `/escrow/sessions` | Lista sessioni |
| `/escrow/sessions/[id]` | Dettaglio sessione |
| `/escrow/scan/[token]` | Scansione QR pubblica |

### Vault Utente
| Route | Descrizione |
|-------|-------------|
| `/vault` | Homepage vault |
| `/vault/deposits` | I miei depositi |
| `/vault/deposits/[id]` | Dettaglio deposito |
| `/vault/deposit/new` | Nuovo deposito |

---

## 27. Componenti

### Layout (4)
| Componente | Funzione |
|------------|----------|
| `Header` | Navigazione, auth, lingua, notifiche, menu utente |
| `Footer` | Links, social, locale |
| `NotificationBell` | Campanella notifiche utente con polling |
| `AdminNotificationBell` | Campanella admin con priorità |

### Homepage (7)
| Componente | Funzione |
|------------|----------|
| `HeroSection` | Hero con liquid glass, mouse tracking, CTA |
| `FeaturedSection` | Sezione listing evidenza |
| `CategoryCard` | Card categoria con icone custom TCG |
| `TournamentCard` | Card torneo |
| `TournamentsSection` | Sezione tornei con filtro distanza |
| `MetaballBackground` | Background Three.js con interazione cursor |
| `LiquidGlassBadge` | Badge effetto vetro liquido |

### Marketplace (6)
| Componente | Funzione |
|------------|----------|
| `AllListingsGrid` | Grid listing con condizione/vault badges |
| `FeaturedListingsGrid` | Grid listing in evidenza |
| `CategoryIcons` | Icone SVG (Pokemon, OnePiece, Magic, YuGiOh) |
| `DemoCardsSection` | Sezione demo cards |
| `AnimatedOrbs` | Orbs animati GSAP |
| `EarlyAccessBadge` | Badge early access / premium |

### SafeTrade (2)
| Componente | Funzione |
|------------|----------|
| `EscrowAnimation` | Animazione 3-step lock→loading→success |
| `EscrowDemo` | Demo interattiva 4-step escrow |

### QR (2)
| Componente | Funzione |
|------------|----------|
| `QRCodeDisplay` | Visualizza QR con download PNG/SVG e copy |
| `QRScanner` | Scanner camera con selezione fotocamera |

### Auth (1)
| Componente | Funzione |
|------------|----------|
| `EmailVerificationBanner` | Banner verifica email con reinvio |

### Contact (2)
| Componente | Funzione |
|------------|----------|
| `ContactModal` | Modal form contatto (rate limited 5/day) |
| `ChatWidget` | Widget chat supporto |

### Providers (2)
| Componente | Funzione |
|------------|----------|
| `providers` | Root: QueryClient + Locale + Onboarding |
| `OnboardingProvider` | Loader + redirect onboarding |

### UI Shadcn (16)
Alert, Avatar, Badge (6 varianti), Button (7 varianti), Card, Dialog, DropdownMenu, Input, Label, Loader, Select, Skeleton, Switch, Textarea, Toast, Toaster

---

## 28. State Machines & Enums

### Enums Completi

#### Utente & Auth
```
UserRole: USER | MERCHANT | MODERATOR | ADMIN | HUB_STAFF
KarmaLevel: NEW | TRUSTED | ELITE | LEGEND | BANNED
```

#### Listing & Proposte
```
CardGame: POKEMON | MAGIC | YUGIOH | ONEPIECE | DIGIMON | OTHER
CardCondition: MINT | NEAR_MINT | EXCELLENT | GOOD | PLAYED | POOR
ListingType: SALE | TRADE | BOTH
ListingVisibility: EARLY_ACCESS | PUBLIC
ProposalStatus: PENDING | ACCEPTED | REJECTED | CANCELLED
FeePaidBy: SELLER | BUYER | SPLIT
```

#### Transazione & Escrow
```
EscrowType: LOCAL | VERIFIED
PriorityTier: STANDARD | PRIORITY | FAST_TRACK
SafeTradeStatus: PENDING_APPOINTMENT | PENDING_ESCROW_SETUP | PENDING_CHECKIN |
  VERIFICATION_IN_PROGRESS | PENDING_PAYMENT | PAYMENT_HELD |
  COMPLETED | RELEASE_REQUESTED | FUNDS_RELEASED |
  CANCELLED | EXPIRED | DISPUTED |
  LABEL_CREATED | SHIPPED_TO_HUB | RECEIVED_AT_HUB |
  HUB_VERIFICATION | HUB_VERIFIED | SHIPPED_TO_BUYER | DELIVERED
EscrowSessionStatus: SCHEDULED | CHECKED_IN | VERIFICATION_IN_PROGRESS |
  VERIFICATION_COMPLETE | PAYMENT_PENDING | PAYMENT_HELD |
  COMPLETED | CANCELLED | EXPIRED | DISPUTED | EXTENDED | CLOSED
EscrowPaymentStatus: PENDING | HELD | RELEASED | REFUNDED | CANCELLED
EscrowPaymentMethod: CASH | ONLINE | BANK_TRANSFER
VerificationStatus: IN_PROGRESS | PASSED | FAILED
```

#### Vault
```
VaultDepositStatus: CREATED | SHIPPED | RECEIVED | UNDER_REVIEW |
  ACCEPTED | PARTIAL | REJECTED | CLOSED
VaultItemStatus: PENDING_REVIEW | IN_HUB | ASSIGNED | IN_TRANSIT |
  IN_SHOP | IN_CASE | LISTED_ONLINE | SOLD | REJECTED | RETURNED
VaultCaseStatus: IN_HUB | IN_TRANSIT | IN_SHOP_ACTIVE | RETIRED
VaultCaseSlotStatus: FREE | OCCUPIED
VaultOrderStatus: PENDING_PAYMENT | PAID | PROCESSING | SHIPPED |
  DELIVERED | COMPLETED | CANCELLED | REFUNDED
VaultFulfillmentStatus: LABEL_CREATED | SHIPPED | IN_TRANSIT |
  DELIVERED | RETURNED | CANCELLED
VaultSplitStatus: PENDING | CALCULATED | APPROVED | PAID | REVERSED
VaultPayoutBatchStatus: CREATED | PROCESSING | PAID
VaultPayoutLineStatus: PENDING | PAID
VaultCaseRequestStatus: PENDING | APPROVED | REJECTED |
  PAYMENT_SENT | PAID | COMPLETED
```

#### Dispute & Insurance
```
DisputeStatus: OPEN | SELLER_RESPONSE | IN_MEDIATION | RESOLVED | ESCALATED | CLOSED
DisputeType: NOT_DELIVERED | DAMAGED_CARDS | WRONG_CONTENT |
  MISSING_ITEMS | CONDITION_MISMATCH | DELAY | OTHER
DisputeResolution: REFUND_FULL | REFUND_PARTIAL | REPLACEMENT |
  RETURN_REQUIRED | REJECTED | IN_FAVOR_BUYER | IN_FAVOR_SELLER
InsuranceStatus: NOT_INSURED | ACTIVE | CLAIMED | SETTLED | EXPIRED
```

#### Finanza & Admin
```
PendingReleaseType: RELEASE_TO_SELLER | REFUND_FULL | REFUND_PARTIAL |
  HUB_COMMISSION | WITHDRAWAL | INSURANCE_REFUND
PendingReleaseStatus: PENDING | APPROVED | REJECTED | EXPIRED
```

#### Subscription
```
SubscriptionTier: FREE | PREMIUM | PRO
SubscriptionStatus: ACTIVE | CANCELLED | EXPIRED | PAST_DUE
BillingPeriod: MONTHLY | YEARLY
```

#### Hub & Shipping
```
HubPackageStatus: PENDING | LABEL_CREATED | SHIPPED_TO_HUB |
  RECEIVED_AT_HUB | VERIFICATION_IN_PROGRESS | VERIFIED |
  SHIPPED_TO_BUYER | DELIVERED | AUTO_RELEASED |
  DISPUTED | RETURNED | CANCELLED
ShippingLabelStatus: CREATED | VALIDATED | SHIPPED | IN_TRANSIT |
  DELIVERED | CANCELLED
```

---

## 29. Stato Implementazione

### Completato (~85%)

#### Core ✅
- [x] Autenticazione Supabase (signup, login, logout, session)
- [x] Sistema ruoli (USER, MERCHANT, ADMIN, MODERATOR, HUB_STAFF)
- [x] Database schema completo (50+ modelli)
- [x] Middleware e route protection

#### Marketplace ✅
- [x] CRUD listing con immagini
- [x] Sistema filtri e ricerca
- [x] Paginazione
- [x] Early Access (premium)
- [x] Auto-approval logic
- [x] Featured listings
- [x] SafeVault listing integration

#### Proposte ✅
- [x] CRUD proposte (SALE/TRADE)
- [x] Fee payment selection (SELLER/BUYER/SPLIT)
- [x] Accettazione/rifiuto/cancellazione
- [x] Notifiche

#### SafeTrade LOCAL ✅
- [x] Selezione negozio con distanza
- [x] Prenotazione appuntamento
- [x] QR code generation
- [x] Check-in merchant
- [x] Verifica con foto (min 3)
- [x] Pagamento escrow
- [x] Release fondi con double confirmation

#### SafeTrade VERIFIED ✅
- [x] Creazione transazione verified
- [x] Generazione etichetta spedizione (Shippo/SendCloud)
- [x] Tracking pacco
- [x] Hub verification flow
- [x] Auto-release 72h (cron)

#### SafeVault ✅
- [x] Deposito con wizard 3-step
- [x] Mark shipped con tracking
- [x] Ricezione hub
- [x] Review items (accept/reject)
- [x] Teca 30 slot con QR
- [x] Richiesta teca merchant
- [x] Approvazione admin + pagamento €299
- [x] Scanner QR (posiziona, sposta, vendi, lista, fulfillment)
- [x] Griglia teca 6x5 interattiva
- [x] Split 70/20/10
- [x] Vendita fisica e online
- [x] Audit trail completo

#### Merchant ✅
- [x] Candidatura e approvazione
- [x] Dashboard shop
- [x] Inventario prodotti
- [x] Tornei
- [x] Promozioni
- [x] Vault management
- [x] Appuntamenti SafeTrade

#### Admin ✅
- [x] Dashboard con statistiche
- [x] Gestione utenti
- [x] Approvazione listing
- [x] Approvazione merchant
- [x] Release fondi (double confirmation)
- [x] Vault request review
- [x] Hub management
- [x] Audit log

#### Community ✅
- [x] Topics (subreddit-style)
- [x] Posts e commenti
- [x] Sistema voti
- [x] Karma system
- [x] Badge system

#### UI/UX ✅
- [x] Design system completo (Tailwind + Shadcn)
- [x] Dark mode
- [x] Liquid glass effects
- [x] 3D tilt cards
- [x] Metaball backgrounds
- [x] Responsive design
- [x] Animazioni (confetti, glow, float)
- [x] i18n (IT/EN)

### Da Completare (~15%)

#### Critico per Produzione
- [ ] **Integrazione pagamento reale** (Stripe) — Attualmente simulato
- [ ] **Email transazionali** — Template e invio automatico
- [ ] **Push notifications** — Solo polling attualmente

#### Miglioramenti
- [ ] **Search avanzata** — Elasticsearch/Algolia per full-text search
- [ ] **Analytics dashboard** — Metriche merchant avanzate
- [ ] **Mobile app** — React Native o PWA
- [ ] **Stripe Connect** — Payout automatici a merchant/owner
- [ ] **Webhook processing** — Per shipping updates real-time
- [ ] **CDN ottimizzazione** — Immagini ottimizzate via CDN
- [ ] **Testing suite** — Unit + integration tests

---

## Appendice A — Diagramma Flussi Principali

### A1. Flusso Vendita P2P (Local)
```
Seller crea listing → Buyer propone → Seller accetta →
Seller sceglie LOCAL → Seleziona store → Prenota appuntamento →
QR generato → Incontro in store → Merchant verifica (3+ foto) →
Buyer paga → Fondi in hold → Merchant chiede release →
Admin approva (double confirm) → Fondi rilasciati
```

### A2. Flusso Vendita P2P (Verified)
```
Seller crea listing → Buyer propone → Seller accetta →
Seller sceglie VERIFIED → Genera etichetta → Spedisce a hub →
Hub riceve → Hub verifica → Hub spedisce a buyer →
Buyer conferma → Auto-release 72h → Fondi rilasciati
```

### A3. Flusso SafeVault
```
Owner crea deposito (carte min €40) → Spedisce a hub →
Hub riceve → Hub revisiona items → Items accettati →
Admin assegna a shop → Merchant posiziona in teca (QR scan) →
Vendita (fisica o online) → Split 70/20/10 →
Payout batch → Owner riceve 70%
```

### A4. Flusso Disputa
```
Buyer apre disputa → Seller risponde →
[Opzionale: Escalation] → Admin media →
Risoluzione (refund/favor buyer/favor seller) →
[Se refund: PendingRelease → Admin approva → Fondi rimborsati]
```

### A5. Flusso Teca Merchant
```
Merchant richiede teca → Admin approva →
Merchant conferma pagamento (€299) → Admin verifica →
Teca creata (30 slot + QR) → Shop autorizzato →
Merchant gestisce via scanner QR
```

---

*Documento generato automaticamente dall'analisi del codebase SafeTrade — 11 Febbraio 2026*
