# 🎯 SafeVault - Piano di Implementazione Completo

**Data Creazione**: 2025-01-19  
**Obiettivo**: Implementare sistema completo SafeVault con integrazione nel marketplace  
**Priorità**: 🔴 CRITICA - Implementazione da A a Z

---

## 📋 INDICE

1. [Panoramica Sistema](#panoramica-sistema)
2. [Integrazione con Marketplace](#integrazione-con-marketplace)
3. [Fasi di Implementazione](#fasi-di-implementazione)
4. [Dettagli Tecnici per Fase](#dettagli-tecnici-per-fase)
5. [Dipendenze e Ordine di Implementazione](#dipendenze-e-ordine-di-implementazione)
6. [Checklist Completa](#checklist-completa)

---

## 🎯 Panoramica Sistema

### Flusso Completo End-to-End

```
1. UTENTE → Crea Listing → Sceglie "Vendita Vault" → Crea Deposito Automatico
2. UTENTE → Invia Carte all'Hub (tracking)
3. HUB_STAFF → Riceve Deposito → Verifica Carte → Accetta/Rifiuta con Pricing
4. HUB_STAFF → Assegna Carte a Negozi → (Opzionale) Assegna a Teca/Slot
5. MERCHANT → Riceve Notifica → Posiziona in Teca (Scan QR Slot)
6. MERCHANT → Lista Online (automatico se da listing) → Vende Fisico/Online
7. SISTEMA → Split Ricavi 70/20/10 → Payout Batch
8. UTENTE → Riceve Payout → Statement Completo
```

### Entità e Relazioni

- **ListingP2P**: Può essere collegato a un `VaultItem` (se vendita Vault)
- **VaultDeposit**: Deposito di carte inviato all'hub
- **VaultItem**: Singola carta nel sistema (collegata a ListingP2P se da listing)
- **VaultCase**: Teca fisica con 30 slot
- **VaultCaseSlot**: Slot singolo con QR univoco
- **VaultSale**: Vendita fisica in negozio
- **VaultOrder**: Ordine online (collegato a ListingP2P se da listing)
- **VaultSplit**: Split ricavi (70/20/10)
- **VaultPayoutBatch**: Batch payout per statement

---

## 🔗 Integrazione con Marketplace

### Scenario: Utente Crea Listing con Vendita Vault

**Flusso Utente:**
1. Utente va su `/listings/create`
2. Compila form listing (nome, set, condizione, prezzo, foto)
3. **NUOVO**: Sezione "Modalità di Vendita"
   - Opzione 1: "Vendita Diretta P2P" (default, esistente)
   - Opzione 2: "Vendita in Contovendita SafeVault" (nuovo)
4. Se sceglie SafeVault:
   - Mostra info: "Le tue carte verranno inviate all'hub SafeTrade per verifica professionale e vendita multicanale"
   - Mostra split: "Riceverai il 70% del prezzo di vendita"
   - Mostra indirizzo hub per spedizione
   - Genera automaticamente `VaultDeposit` con `VaultItem` collegato al `ListingP2P`
5. Listing creato con flag `isVaultListing = true` e `vaultItemId` collegato

**Flusso Automatico:**
- Listing appare nel marketplace con badge "SafeVault"
- Quando hub verifica e accetta → Listing diventa "Disponibile"
- Quando merchant posiziona in teca → Listing diventa "In Negozio"
- Quando venduto → Listing diventa "Venduto" e split automatico

---

## 📦 Fasi di Implementazione

### **FASE 1: Integrazione Listing → Vault** 🔴 CRITICA
**Obiettivo**: Permettere agli utenti di creare listing con vendita Vault

**Componenti:**
1. Modifica Schema Database
2. UI Form Creazione Listing
3. API Endpoint Listing con Vault
4. Logica Creazione Deposito Automatico
5. Badge e Filtri Marketplace

**Durata Stimata**: 2-3 giorni

---

### **FASE 2: Sistema Depositi Utente** 🔴 CRITICA
**Obiettivo**: Permettere agli utenti di creare e gestire depositi

**Componenti:**
1. Pagina Creazione Deposito (`/vault/deposit/new`)
2. Pagina Lista Depositi (`/vault/deposits`)
3. Pagina Dettaglio Deposito (`/vault/deposits/[id]`)
4. API Endpoints Depositi (già esistenti, da verificare)
5. Notifiche Deposito

**Durata Stimata**: 2-3 giorni

---

### **FASE 3: Hub - Gestione Depositi e Review** 🔴 CRITICA
**Obiettivo**: Permettere a HUB_STAFF di gestire depositi e verificare carte

**Componenti:**
1. Pagina Lista Depositi Hub (`/admin/vault/deposits`)
2. Pagina Dettaglio Deposito Hub (`/admin/vault/deposits/[id]`)
3. UI Review Carte (accetta/rifiuta con pricing)
4. API Review Items
5. Notifiche Review

**Durata Stimata**: 3-4 giorni

---

### **FASE 4: Hub - Assegnazione a Negozi** 🟡 IMPORTANTE
**Obiettivo**: Permettere a HUB_STAFF di assegnare carte ai negozi

**Componenti:**
1. UI Assegnazione Carte (`/admin/vault/items/assign`)
2. Selezione Negozio e Teca (opzionale)
3. API Assegnazione
4. Notifiche Assegnazione

**Durata Stimata**: 2-3 giorni

---

### **FASE 5: Merchant - Gestione Inventario e Teche** 🟡 IMPORTANTE
**Obiettivo**: Completare funzionalità merchant per gestire carte e teche

**Componenti:**
1. Dashboard Inventario (`/merchant/vault/inventory`) - DA CREARE
2. Vista Teca Completa (`/merchant/vault/cases/[id]`) - DA MIGLIORARE
3. Gestione Slot (già implementato)
4. Spostamento Carte (già implementato)
5. Vendita Fisica (già implementato)

**Durata Stimata**: 2-3 giorni

---

### **FASE 6: Marketplace - Lista Online Automatica** 🟡 IMPORTANTE
**Obiettivo**: Quando merchant posiziona carta in teca, listing diventa disponibile online

**Componenti:**
1. Logica Auto-Listing quando item diventa `IN_CASE`
2. Sincronizzazione Listing ↔ VaultItem
3. Badge "In Negozio" su listing
4. Filtri Marketplace per Vault listings

**Durata Stimata**: 2 giorni

---

### **FASE 7: Sistema Ordini Online Vault** 🟡 IMPORTANTE
**Obiettivo**: Permettere acquisto online di carte Vault con fulfillment merchant

**Componenti:**
1. Checkout Vault Order (`/checkout/vault/[itemId]`)
2. Pagamento Ordine (Stripe o wallet)
3. Notifiche Ordine (buyer, merchant)
4. Fulfillment Merchant (già implementato)
5. Tracking Spedizione

**Durata Stimata**: 3-4 giorni

---

### **FASE 8: Sistema Split Ricavi** 🟢 MEDIA
**Obiettivo**: Calcolo automatico split 70/20/10 e gestione payout

**Componenti:**
1. Calcolo Split su Vendita Fisica
2. Calcolo Split su Ordine Online (con hold period 7 giorni)
3. API Split Calculator
4. Pagina Statement Utente (`/vault/statement`)
5. Pagina Statement Merchant (`/merchant/vault/statement`)

**Durata Stimata**: 3-4 giorni

---

### **FASE 9: Sistema Payout Batch** 🟢 MEDIA
**Obiettivo**: Gestione payout batch per utenti e merchant

**Componenti:**
1. Pagina Admin Payout (`/admin/vault/payouts`)
2. Creazione Batch Payout
3. Conferma Pagamento Batch
4. Notifiche Payout
5. Statement Completo

**Durata Stimata**: 2-3 giorni

---

### **FASE 10: Ottimizzazioni e Polish** 🔵 BASSA
**Obiettivo**: Ottimizzazioni performance, UI/UX, test

**Componenti:**
1. Paginazione Liste
2. Cache Query Frequenti
3. Indici Database
4. Test End-to-End
5. Documentazione Utente

**Durata Stimata**: 2-3 giorni

---

## 🔧 Dettagli Tecnici per Fase

### **FASE 1: Integrazione Listing → Vault**

#### 1.1 Modifica Schema Database

**File**: `prisma/schema.prisma`

```prisma
model ListingP2P {
  // ... campi esistenti ...
  
  // NUOVO: Collegamento Vault
  isVaultListing     Boolean     @default(false)
  vaultItemId        String?     @unique
  vaultItem          VaultItem?  @relation("ListingVaultItem", fields: [vaultItemId], references: [id], onDelete: SetNull)
  vaultDepositId     String?     // Deposito da cui proviene (se da listing)
  
  @@index([isVaultListing])
  @@index([vaultItemId])
}

model VaultItem {
  // ... campi esistenti ...
  
  // NUOVO: Collegamento Listing
  listingId          String?     @unique
  listing            ListingP2P?  @relation("ListingVaultItem", fields: [listingId], references: [id], onDelete: SetNull)
  
  @@index([listingId])
}
```

**Migration**: `npx prisma migrate dev --name add_vault_listing_integration`

---

#### 1.2 UI Form Creazione Listing

**File**: `src/app/(marketplace)/listings/create/page.tsx`

**Modifiche:**
1. Aggiungere sezione "Modalità di Vendita" dopo upload immagini
2. Radio buttons:
   - "Vendita Diretta P2P" (default)
   - "Vendita in Contovendita SafeVault"
3. Se SafeVault selezionato:
   - Mostra info box con:
     - "Le tue carte verranno inviate all'hub SafeTrade per verifica professionale"
     - "Riceverai il 70% del prezzo di vendita finale"
     - "Vendita multicanale: online e nei negozi fisici"
   - Mostra indirizzo hub (da env)
   - Checkbox: "Ho letto e accetto i termini del servizio SafeVault"
4. Validazione: Se SafeVault, checkbox obbligatorio

**Componente**: `VaultListingOption.tsx` (nuovo)

---

#### 1.3 API Endpoint Listing con Vault

**File**: `src/app/api/listings/route.ts` (POST)

**Modifiche:**
1. Aggiungere `isVaultListing` e `vaultDepositId` al body
2. Se `isVaultListing === true`:
   - Crea `VaultDeposit` con status `CREATED`
   - Crea `VaultItem` collegato al listing:
     - `ownerUserId = user.id`
     - `game, name, set, conditionDeclared` da form
     - `photos` da immagini upload
     - `status = PENDING_REVIEW`
     - `listingId = listing.id`
   - Collega `listing.vaultItemId = vaultItem.id`
   - Collega `listing.vaultDepositId = deposit.id`
3. Notifica admin: "Nuovo deposito Vault da listing"

**Validazioni:**
- Se `isVaultListing`, almeno 1 foto obbligatoria
- Se `isVaultListing`, prezzo è "suggerito" (hub può modificare)

---

#### 1.4 Badge e Filtri Marketplace

**File**: `src/app/(marketplace)/marketplace/page.tsx`

**Modifiche:**
1. Aggiungere badge "SafeVault" su listing con `isVaultListing = true`
2. Aggiungere filtro "Solo SafeVault" / "Solo P2P"
3. Badge colori:
   - "SafeVault" → Purple/Violet
   - "In Negozio" → Blue (se `vaultItem.status = IN_CASE`)
   - "Verificato" → Green (se `vaultItem.conditionVerified != null`)

**File**: `src/app/(marketplace)/listings/[id]/page.tsx`

**Modifiche:**
1. Mostrare sezione "SafeVault Info" se `isVaultListing`
2. Mostrare:
   - Status carta (PENDING_REVIEW, ACCEPTED, IN_CASE, etc.)
   - Prezzo suggerito vs prezzo finale (se verificato)
   - Condizione verificata (se disponibile)
   - Negozio dove si trova (se `IN_CASE`)
3. Se `IN_CASE`, mostrare "Disponibile in Negozio" con indirizzo

---

### **FASE 2: Sistema Depositi Utente**

#### 2.1 Pagina Creazione Deposito

**File**: `src/app/vault/deposit/new/page.tsx` (NUOVO)

**Componenti:**
1. Form multi-step:
   - **Step 1**: Info Generali
     - Note deposito (opzionale)
     - Tracking in (opzionale, se già spedito)
   - **Step 2**: Aggiungi Carte
     - Form per ogni carta:
       - Gioco (select)
       - Nome carta (input)
       - Set (input opzionale)
       - Condizione dichiarata (select)
       - Foto (1-5 immagini)
     - Pulsante "Aggiungi Altra Carta"
     - Lista carte aggiunte (con possibilità di rimuovere)
   - **Step 3**: Riepilogo
     - Lista carte
     - Indirizzo hub
     - Istruzioni spedizione
     - Checkbox termini
2. Submit → Crea `VaultDeposit` con `VaultItem[]`

**Validazioni:**
- Almeno 1 carta obbligatoria
- Ogni carta: nome, gioco, condizione obbligatori
- Ogni carta: almeno 1 foto

---

#### 2.2 Pagina Lista Depositi

**File**: `src/app/vault/deposits/page.tsx` (NUOVO o migliorare esistente)

**Componenti:**
1. Lista depositi utente con:
   - Status badge (CREATED, RECEIVED, IN_REVIEW, ACCEPTED, etc.)
   - Numero carte
   - Data creazione
   - Tracking in (se presente)
2. Filtri: Status, Data
3. Card per ogni deposito con:
   - Link a dettaglio
   - Azioni rapide (se CREATED: "Modifica", "Elimina")

---

#### 2.3 Pagina Dettaglio Deposito

**File**: `src/app/vault/deposits/[id]/page.tsx` (NUOVO o migliorare esistente)

**Componenti:**
1. Info deposito:
   - Status
   - Data creazione/ricezione/review
   - Tracking in
   - Note
2. Lista carte con:
   - Status ogni carta
   - Condizione verificata (se disponibile)
   - Prezzo finale (se verificato)
   - Negozio assegnato (se `ASSIGNED_TO_SHOP`)
   - Link a listing (se da listing)
3. Timeline eventi
4. Azioni:
   - Se CREATED: "Modifica", "Elimina", "Marca come Spedito"
   - Se RECEIVED: "In Verifica"
   - Se ACCEPTED: "Visualizza Assegnazioni"

---

### **FASE 3: Hub - Gestione Depositi e Review**

#### 3.1 Pagina Lista Depositi Hub

**File**: `src/app/admin/vault/deposits/page.tsx` (NUOVO)

**Componenti:**
1. Lista tutti i depositi con:
   - Utente depositor
   - Status
   - Numero carte
   - Data creazione/ricezione
   - Priorità (se RECEIVED o IN_REVIEW)
2. Filtri: Status, Data, Utente
3. Badge priorità:
   - RECEIVED → Red (da processare)
   - IN_REVIEW → Yellow (in lavorazione)
4. Link a dettaglio

---

#### 3.2 Pagina Dettaglio Deposito Hub

**File**: `src/app/admin/vault/deposits/[id]/page.tsx` (NUOVO)

**Componenti:**
1. Info deposito (come utente, ma con più dettagli)
2. **Sezione Review Carte** (se status = RECEIVED o IN_REVIEW):
   - Per ogni carta:
     - Foto (carousel)
     - Info dichiarate (nome, set, condizione)
     - Form review:
       - Accetta/Rifiuta (radio)
       - Condizione verificata (select, se accetta)
       - Prezzo finale (input, se accetta)
       - Note (textarea)
     - Pulsante "Salva Review"
3. **Azioni Deposito**:
   - "Marca come Ricevuto" (se CREATED)
   - "Inizia Review" (se RECEIVED)
   - "Completa Review" (se tutte le carte reviewate)
   - "Assegna a Negozio" (se ACCEPTED)

**API**: `POST /api/vault/deposits/[id]/review` (già esiste, da verificare)

---

### **FASE 4: Hub - Assegnazione a Negozi**

#### 4.1 UI Assegnazione Carte

**File**: `src/app/admin/vault/items/assign/page.tsx` (NUOVO)

**Componenti:**
1. Lista carte da assegnare (status = ACCEPTED, shopIdCurrent = null)
2. Filtri: Gioco, Set, Condizione
3. Per ogni carta:
   - Foto thumbnail
   - Info carta
   - Form assegnazione:
     - Select negozio (solo con teca autorizzata)
     - Select teca (opzionale, filtra per negozio)
     - Select slot (opzionale, filtra per teca, solo FREE)
   - Pulsante "Assegna"
4. Assegnazione multipla:
   - Checkbox per selezionare più carte
   - Assegna tutte a stesso negozio/teca

**API**: `POST /api/vault/items/assign` (già esiste, da verificare)

---

### **FASE 5: Merchant - Gestione Inventario e Teche**

#### 5.1 Dashboard Inventario

**File**: `src/app/merchant/vault/inventory/page.tsx` (NUOVO)

**Componenti:**
1. Statistiche:
   - Totale carte assegnate
   - In teca
   - Listate online
   - Vendute
2. Lista carte con:
   - Foto
   - Nome, gioco, set
   - Status
   - Prezzo finale
   - Slot (se in teca)
   - Azioni rapide:
     - "Posiziona in Teca" (se ASSIGNED_TO_SHOP)
     - "Lista Online" (se IN_CASE)
     - "Vendi Fisicamente" (se IN_CASE)
3. Filtri: Status, Gioco, Set
4. Search per nome carta

---

#### 5.2 Vista Teca Completa

**File**: `src/app/merchant/vault/cases/[id]/page.tsx` (MIGLIORARE)

**Miglioramenti:**
1. Griglia 30 slot interattiva:
   - Slot liberi: grigio, mostra codice (S01, S02, etc.)
   - Slot occupati: colore, mostra foto carta + nome
   - Hover: mostra dettagli completi
   - Click: modal con dettagli carta + azioni
2. Azioni slot:
   - Se libero: "Assegna Carta" → redirect a scan
   - Se occupato: "Dettagli", "Sposta", "Vendi", "Lista Online"
3. Filtri vista:
   - Mostra solo occupati
   - Mostra solo liberi
   - Cerca per nome carta

---

### **FASE 6: Marketplace - Lista Online Automatica**

#### 6.1 Logica Auto-Listing

**File**: `src/app/api/vault/merchant/assign-item-to-slot/route.ts` (MODIFICARE)

**Modifiche:**
1. Dopo assegnazione a slot (status → IN_CASE):
   - Se `vaultItem.listingId` esiste:
     - Aggiorna `listing.isApproved = true` (se non già approvato)
     - Aggiorna `listing.price = vaultItem.priceFinal` (se disponibile)
     - Notifica utente: "La tua carta è disponibile in negozio!"
   - Se `vaultItem.listingId` non esiste:
     - Opzionale: Crea listing automatico (da configurare)

**File**: `src/app/api/vault/merchant/items/[id]/list-online/route.ts` (già esiste)

**Modifiche:**
1. Se `vaultItem.listingId` esiste:
   - Aggiorna listing status
   - Notifica utente: "La tua carta è ora disponibile online!"

---

#### 6.2 Sincronizzazione Listing ↔ VaultItem

**File**: `src/app/api/listings/[id]/route.ts` (MODIFICARE)

**Modifiche GET:**
1. Se `listing.isVaultListing`:
   - Include `vaultItem` con:
     - Status
     - Condizione verificata
     - Prezzo finale
     - Negozio corrente
     - Slot (se in teca)

**Modifiche PATCH:**
1. Se `listing.isVaultListing`:
   - Non permettere modifica prezzo (gestito da hub)
   - Permettere solo modifica descrizione/note

---

### **FASE 7: Sistema Ordini Online Vault**

#### 7.1 Checkout Vault Order

**File**: `src/app/checkout/vault/[itemId]/page.tsx` (NUOVO)

**Componenti:**
1. Info carta:
   - Foto
   - Nome, set, condizione verificata
   - Prezzo finale
2. Info negozio:
   - Nome negozio
   - Indirizzo
   - Tempi spedizione stimati
3. Form spedizione:
   - Indirizzo completo
   - Note spedizione
4. Riepilogo:
   - Subtotal
   - Spedizione
   - Totale
5. Pagamento (Stripe o wallet)
6. Submit → Crea `VaultOrder` con status `PENDING_PAYMENT`

**API**: `POST /api/vault/orders` (già esiste, da verificare)

---

#### 7.2 Pagamento Ordine

**File**: `src/app/api/vault/orders/[id]/pay/route.ts` (già esiste)

**Modifiche:**
1. Dopo pagamento:
   - Aggiorna `vaultOrder.status = PAID`
   - Aggiorna `vaultItem.status = RESERVED`
   - Notifica merchant: "Nuovo ordine da evadere"
   - Notifica buyer: "Ordine confermato, in preparazione"

---

### **FASE 8: Sistema Split Ricavi**

#### 8.1 Calcolo Split

**File**: `src/lib/vault/split-calculator.ts` (già esiste, da verificare)

**Funzioni:**
1. `calculateSplit(grossAmount)`: Calcola 70/20/10
2. `createSplitForSale(saleId)`: Crea split per vendita fisica (ELIGIBLE immediato)
3. `createSplitForOrder(orderId)`: Crea split per ordine (PENDING, diventa ELIGIBLE dopo 7 giorni da DELIVERED)

**Trigger:**
- Vendita fisica → Split immediato ELIGIBLE
- Ordine DELIVERED → Split PENDING, dopo 7 giorni → ELIGIBLE

---

#### 8.2 Statement Utente

**File**: `src/app/vault/statement/page.tsx` (NUOVO)

**Componenti:**
1. Riepilogo:
   - Totale guadagnato
   - In attesa (ELIGIBLE)
   - Ricevuto (PAID)
2. Lista split:
   - Data vendita
   - Carta venduta
   - Prezzo vendita
   - Split (70%)
   - Status
   - Data payout (se PAID)
3. Filtri: Periodo, Status

---

### **FASE 9: Sistema Payout Batch**

#### 9.1 Pagina Admin Payout

**File**: `src/app/admin/vault/payouts/page.tsx` (NUOVO)

**Componenti:**
1. Lista batch payout:
   - ID batch
   - Periodo
   - Totale
   - Numero beneficiari
   - Status
2. Creazione batch:
   - Seleziona periodo
   - Filtra split ELIGIBLE
   - Preview beneficiari e importi
   - Crea batch
3. Gestione batch:
   - Visualizza dettagli
   - Conferma pagamento
   - Esporta CSV

**API**: `POST /api/vault/payouts/batches` (già esiste, da verificare)

---

## 🔗 Dipendenze e Ordine di Implementazione

### Ordine Consigliato:

1. **FASE 1** (Listing → Vault) → Base per tutto
2. **FASE 2** (Depositi Utente) → Necessario per FASE 3
3. **FASE 3** (Hub Review) → Necessario per FASE 4
4. **FASE 4** (Assegnazione) → Necessario per FASE 5
5. **FASE 5** (Merchant Inventario) → Necessario per FASE 6
6. **FASE 6** (Lista Online) → Necessario per FASE 7
7. **FASE 7** (Ordini Online) → Necessario per FASE 8
8. **FASE 8** (Split Ricavi) → Necessario per FASE 9
9. **FASE 9** (Payout Batch) → Completa il ciclo
10. **FASE 10** (Ottimizzazioni) → Polish finale

### Dipendenze Critiche:

- **FASE 1** dipende da: Schema database
- **FASE 2** dipende da: FASE 1 (schema)
- **FASE 3** dipende da: FASE 2 (depositi creati)
- **FASE 4** dipende da: FASE 3 (carte accettate)
- **FASE 5** dipende da: FASE 4 (carte assegnate)
- **FASE 6** dipende da: FASE 1 (listing) + FASE 5 (inventario)
- **FASE 7** dipende da: FASE 6 (listing online)
- **FASE 8** dipende da: FASE 7 (ordini) + vendite fisiche
- **FASE 9** dipende da: FASE 8 (split)

---

## ✅ Checklist Completa

### FASE 1: Integrazione Listing → Vault
- [ ] Modifica schema `ListingP2P` e `VaultItem`
- [ ] Migration database
- [ ] UI sezione "Modalità di Vendita" in form listing
- [ ] Componente `VaultListingOption`
- [ ] API POST `/api/listings` con logica Vault
- [ ] Creazione automatica `VaultDeposit` e `VaultItem`
- [ ] Badge "SafeVault" su marketplace
- [ ] Filtri marketplace per Vault
- [ ] Pagina dettaglio listing con info Vault
- [ ] Test creazione listing Vault

### FASE 2: Sistema Depositi Utente
- [ ] Pagina `/vault/deposit/new`
- [ ] Form multi-step creazione deposito
- [ ] Upload foto carte
- [ ] Pagina `/vault/deposits` (lista)
- [ ] Pagina `/vault/deposits/[id]` (dettaglio)
- [ ] API GET `/api/vault/deposits` (user)
- [ ] API POST `/api/vault/deposits` (verificare esistente)
- [ ] Notifiche deposito creato
- [ ] Test flusso deposito utente

### FASE 3: Hub - Gestione Depositi e Review
- [ ] Pagina `/admin/vault/deposits` (lista)
- [ ] Pagina `/admin/vault/deposits/[id]` (dettaglio)
- [ ] UI review carte (accetta/rifiuta)
- [ ] Form pricing e condizione verificata
- [ ] API POST `/api/vault/deposits/[id]/receive` (verificare)
- [ ] API POST `/api/vault/deposits/[id]/review` (verificare)
- [ ] Notifiche review completata
- [ ] Test flusso review hub

### FASE 4: Hub - Assegnazione a Negozi
- [ ] Pagina `/admin/vault/items/assign`
- [ ] Lista carte da assegnare
- [ ] Form assegnazione (negozio, teca, slot)
- [ ] Assegnazione multipla
- [ ] API POST `/api/vault/items/assign` (verificare)
- [ ] Notifiche assegnazione
- [ ] Test assegnazione

### FASE 5: Merchant - Gestione Inventario e Teche
- [ ] Pagina `/merchant/vault/inventory`
- [ ] Dashboard inventario con stats
- [ ] Lista carte con filtri
- [ ] Migliorare `/merchant/vault/cases/[id]`
- [ ] Griglia 30 slot interattiva
- [ ] Modal dettagli slot
- [ ] Test inventario merchant

### FASE 6: Marketplace - Lista Online Automatica
- [ ] Logica auto-listing quando `IN_CASE`
- [ ] Sincronizzazione listing ↔ vaultItem
- [ ] Badge "In Negozio" su listing
- [ ] Notifiche disponibilità
- [ ] Test auto-listing

### FASE 7: Sistema Ordini Online Vault
- [ ] Pagina `/checkout/vault/[itemId]`
- [ ] Form spedizione
- [ ] Integrazione pagamento (Stripe)
- [ ] API POST `/api/vault/orders` (verificare)
- [ ] API POST `/api/vault/orders/[id]/pay` (verificare)
- [ ] Notifiche ordine
- [ ] Test checkout e pagamento

### FASE 8: Sistema Split Ricavi
- [ ] Verificare `split-calculator.ts`
- [ ] Trigger split su vendita fisica
- [ ] Trigger split su ordine DELIVERED
- [ ] Hold period 7 giorni per ordini
- [ ] Pagina `/vault/statement` (utente)
- [ ] Pagina `/merchant/vault/statement` (merchant)
- [ ] Test split e statement

### FASE 9: Sistema Payout Batch
- [ ] Pagina `/admin/vault/payouts`
- [ ] UI creazione batch
- [ ] Preview beneficiari
- [ ] API POST `/api/vault/payouts/batches` (verificare)
- [ ] API POST `/api/vault/payouts/batches/[id]/pay` (verificare)
- [ ] Esportazione CSV
- [ ] Notifiche payout
- [ ] Test payout batch

### FASE 10: Ottimizzazioni e Polish
- [ ] Paginazione tutte le liste
- [ ] Indici database ottimizzati
- [ ] Cache query frequenti (opzionale)
- [ ] Test end-to-end completo
- [ ] Documentazione utente
- [ ] Performance testing

---

## 📝 Note Importanti

### Sicurezza
- ✅ Validazione input su tutte le API
- ✅ Verifica permessi (solo owner può vedere propri depositi)
- ✅ Rate limiting su creazione depositi
- ✅ Audit log su tutte le operazioni critiche

### Performance
- ✅ Paginazione obbligatoria (max 50 items per pagina)
- ✅ Lazy loading immagini
- ✅ Indici database su campi frequenti
- ✅ Cache per query frequenti (opzionale)

### UX
- ✅ Feedback chiaro su ogni azione
- ✅ Notifiche realtime per eventi importanti
- ✅ Loading states su tutte le operazioni
- ✅ Error handling user-friendly

---

## 🎯 Prossimi Passi

1. **Revisione Piano**: Rivedere questo documento e confermare approccio
2. **Priorità**: Decidere se implementare tutto o solo fasi critiche iniziali
3. **Inizio FASE 1**: Modifica schema e form listing
4. **Test Incrementali**: Testare ogni fase prima di passare alla successiva

---

**Totale Durata Stimata**: 25-35 giorni di sviluppo

**Priorità Immediate**:
- FASE 1 (Listing → Vault): 🔴 CRITICA
- FASE 2 (Depositi Utente): 🔴 CRITICA
- FASE 3 (Hub Review): 🔴 CRITICA

**Buon lavoro! 🚀**

