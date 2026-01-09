# 🛒 Marketplace Flow - SafeTrade

## Overview
Il flusso del marketplace permette agli utenti di cercare, visualizzare e acquistare carte collezionabili tramite transazioni P2P o da negozi verificati.

---

## 📋 Flow 1: Ricerca e Visualizzazione Listings

### Step 1: Accesso Marketplace
**Pagina**: `/marketplace`

**Componenti**:
- Barra ricerca
- Filtri (categoria, prezzo, condizione, set)
- Grid/List view toggle
- Sort options

**Azioni utente**:
- Cerca per nome carta
- Applica filtri
- Ordina risultati
- Clicca su listing → Dettaglio

**Stato**: ✅ Completato (API implementata)

---

### Step 2: Dettaglio Listing
**Pagina**: `/listings/[id]`

**Componenti**:
- Immagini carta (carousel)
- Informazioni carta (nome, set, condizione, prezzo)
- Descrizione venditore
- Informazioni venditore (profilo, rating)
- Bottoni azione

**Azioni utente**:
- Visualizza immagini
- Legge descrizione
- Controlla profilo venditore
- Clicca "Propose Trade" → Flow proposte
- Clicca "Contact Seller" (opzionale)

**Stato**: ✅ Completato (API implementata)

---

## 📋 Flow 2: Creazione Listing (Vendita P2P)

### Step 1: Accesso Sell Page
**Pagina**: `/sell`

**Componenti**:
- Due card: "Sell as Collector" e "Sell as Merchant"
- Descrizione differenze

**Azioni utente**:
- Clicca "Sell as Collector" → `/listings/create`
- Clicca "Sell as Merchant" → `/dashboard/merchant/create-offer`

**Stato**: ✅ Completato

---

### Step 2: Form Creazione Listing
**Pagina**: `/listings/create` (da creare)

**Componenti**:
- Form multi-step o single page
- Upload immagini (multiple)
- Informazioni carta
- Prezzo e condizioni
- Descrizione

**Campi form**:
- Nome carta (obbligatorio)
- Set/Expansion (obbligatorio)
- Condizione (Mint, Near Mint, Played, etc.)
- Prezzo (obbligatorio)
- Descrizione (opzionale)
- Immagini (min 1, max 5)

**Validazione**:
- Tutti i campi obbligatori compilati
- Prezzo > 0
- Almeno 1 immagine
- Immagini formato valido (jpg, png, webp)

**Azioni**:
- Submit → Crea listing in database
- Upload immagini a Supabase Storage
- Redirect a `/listings/[id]` (nuovo listing)

**Stato**: ⏳ Da implementare

---

### Step 3: Conferma Listing
**Pagina**: `/listings/[id]` (appena creato)

**Componenti**:
- Preview listing creato
- Messaggio successo
- Link "Edit" e "View in Marketplace"

**Azioni**:
- Utente può modificare o pubblicare

**Stato**: ⏳ Da implementare

---

## 📋 Flow 3: Proposte di Acquisto

### Step 1: Invia Proposta
**Pagina**: `/listings/[id]` → Clicca "Propose Trade"

**Componenti**:
- Modale o pagina dedicata
- Form proposta

**Campi**:
- Prezzo offerto (obbligatorio)
- Messaggio (opzionale)
- Proposta scambio (opzionale, se supportato)

**Validazione**:
- Prezzo offerto > 0
- Prezzo offerto <= prezzo listing (o gestire offerte superiori)

**Azioni**:
- Submit → Crea `Proposal` in database
- Notifica real-time a venditore
- Redirect a `/dashboard/proposals/sent`

**Stato**: ⏳ Da implementare

---

### Step 2: Gestione Proposte (Venditore)
**Pagina**: `/dashboard/proposals/received`

**Componenti**:
- Lista proposte ricevute
- Filtri (pending, accepted, rejected)
- Card proposta con:
  - Info carta
  - Prezzo offerto
  - Messaggio acquirente
  - Profilo acquirente
  - Bottoni "Accept" / "Reject"

**Azioni**:
- Clicca "Accept" → Crea `SafeTradeTransaction`
- Clicca "Reject" → Aggiorna status proposta
- Notifica real-time ad acquirente

**Stato**: ✅ Completato (API implementata)

---

### Step 3: Conferma Proposta Accettata
**Pagina**: `/dashboard/proposals/sent` (per acquirente)

**Componenti**:
- Lista proposte inviate
- Status (pending, accepted, rejected)
- Se accettata → Link "Complete Transaction"

**Azioni**:
- Se accettata → Vai a SafeTrade flow
- Se rifiutata → Può inviare nuova proposta

**Stato**: ⏳ Da implementare

---

## 📋 Flow 4: Ricerca Avanzata

### Step 1: Filtri Marketplace
**Pagina**: `/marketplace`

**Filtri disponibili**:
- Categoria (Pokemon, Magic, Yu-Gi-Oh, etc.)
- Prezzo range (min-max)
- Condizione (Mint, Near Mint, etc.)
- Set/Expansion
- Disponibilità (tutti, disponibili, venduti)
- Location (per SafeTrade)

**Azioni**:
- Applica filtri → Aggiorna risultati
- Salva preferenze (opzionale)
- Reset filtri

**Stato**: ⏳ Da implementare

---

### Step 2: Full-Text Search
**Componenti**:
- Barra ricerca con autocomplete
- Suggerimenti mentre digiti
- Ricerca fuzzy (tollerante errori)

**Query**:
- Cerca in: nome carta, set, descrizione
- Usa PostgreSQL full-text search + pg_trgm

**Stato**: ⏳ Da implementare

---

## 🔄 Flussi Alternativi

### Listing Non Trovato
- 404 page con suggerimenti ricerca

### Nessun Risultato
- Messaggio "No listings found"
- Suggerimenti per modificare filtri

### Listing Venduto
- Badge "Sold" su listing
- Non più disponibile per proposte

---

## ✅ Checklist Marketplace

- [x] Pagina marketplace base
- [x] Dettaglio listing UI
- [x] Sell page con scelta tipo
- [ ] Form creazione listing
- [ ] Upload immagini multipli
- [ ] Ricerca e filtri funzionanti
- [ ] Sistema proposte completo
- [ ] Notifiche real-time proposte
- [ ] Gestione proposte (accept/reject)
- [ ] Full-text search avanzata

---

## 🎯 Prossimi Step

Dopo marketplace, utente può:
1. Completare transazione → Vedi `03-SAFETRADE.md`
2. Gestire listing → Dashboard
3. Gestire proposte → Dashboard

