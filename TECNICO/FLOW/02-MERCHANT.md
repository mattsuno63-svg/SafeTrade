# 🏬 Merchant Flow - SafeTrade

## Overview
Il flusso merchant permette ai negozi verificati di gestire inventario, creare offerte esclusive e verificare transazioni SafeTrade.

---

## 📋 Flow 1: Setup Negozi

### Step 1: Registrazione Merchant
**Pagina**: `/signup` → Seleziona "MERCHANT"

**Componenti**:
- Form registrazione base
- Form informazioni negozio (dopo signup)

**Campi negozio**:
- Nome negozio (obbligatorio)
- Indirizzo completo (obbligatorio)
- Città, CAP, Provincia (obbligatorio)
- Telefono (obbligatorio)
- Email negozio (opzionale)
- Sito web (opzionale)
- Orari apertura (opzionale)
- Descrizione (opzionale)

**Validazione**:
- Tutti i campi obbligatori
- Indirizzo valido
- Telefono formato valido

**Azioni**:
- Submit → Crea `Shop` in database
- Collega `Shop` a `User` (owner)
- Status: `PENDING_VERIFICATION`
- Redirect a `/dashboard/merchant/setup`

**Stato**: ⏳ Da implementare

---

### Step 2: Verifica Negozi
**Processo**: Manuale o automatico

**Componenti**:
- Admin panel (futuro) o processo manuale
- Verifica documenti
- Approvazione/rifiuto

**Azioni**:
- Admin verifica negozio
- Aggiorna status: `VERIFIED` o `REJECTED`
- Notifica merchant via email/notifica

**Stato**: ⏳ Da implementare (MVP: skip verification)

---

## 📋 Flow 2: Gestione Inventario

### Step 1: Accesso Inventory
**Pagina**: `/dashboard/merchant/inventory`

**Componenti**:
- Lista prodotti (grid/list view)
- Filtri (categoria, disponibilità, prezzo)
- Search bar
- Bottone "Add Product"

**Azioni**:
- Visualizza prodotti
- Cerca prodotti
- Filtra prodotti
- Clicca "Add Product" → Form creazione

**Stato**: ✅ UI completata, ⏳ API da collegare

---

### Step 2: Aggiungi Prodotto
**Pagina**: `/dashboard/merchant/inventory/add` (da creare)

**Componenti**:
- Form prodotto

**Campi**:
- Nome carta (obbligatorio)
- Set/Expansion (obbligatorio)
- Condizione (obbligatorio)
- Prezzo (obbligatorio)
- Quantità disponibile (obbligatorio)
- Descrizione (opzionale)
- Immagini (min 1, max 5)

**Validazione**:
- Tutti i campi obbligatori
- Prezzo > 0
- Quantità >= 0
- Almeno 1 immagine

**Azioni**:
- Submit → Crea `Product` in database
- Upload immagini a Supabase Storage
- Collega a `Shop` del merchant
- Redirect a inventory con messaggio successo

**Stato**: ⏳ Da implementare

---

### Step 3: Modifica Prodotto
**Pagina**: `/dashboard/merchant/inventory/[id]/edit` (da creare)

**Componenti**:
- Form pre-compilato con dati prodotto
- Bottone "Delete" (con conferma)

**Azioni**:
- Modifica campi → Update `Product`
- Delete → Rimuovi `Product` (soft delete o hard delete)

**Stato**: ⏳ Da implementare

---

## 📋 Flow 3: Creazione Offerte Esclusive

### Step 1: Accesso Create Offer
**Pagina**: `/dashboard/merchant/create-offer`

**Componenti**:
- Multi-step form (già implementato Step 1)

**Stato**: ✅ Step 1 UI completato, ⏳ Step 2-7 da implementare

---

### Step 2: Step 1 - Basic Details
**Componenti**:
- Nome offerta
- Categoria
- Prezzo
- Sconto percentuale
- Data inizio/fine

**Validazione**:
- Tutti i campi obbligatori
- Prezzo > 0
- Sconto 0-100%
- Data fine > data inizio

**Azioni**:
- Submit → Salva dati temporanei
- Next → Vai a Step 2

**Stato**: ✅ Completato

---

### Step 3: Step 2-7 - Advanced Details
**Componenti** (da implementare):
- Step 2: Condizioni vendita
- Step 3: Descrizione estesa
- Step 4-7: Altre opzioni avanzate

**Azioni**:
- Compila ogni step
- Next/Previous navigation
- Salvataggio temporaneo

**Stato**: ⏳ Da implementare

---

### Step 4: Step Final - Review & Submit
**Componenti**:
- Preview offerta completa
- Riepilogo tutti i dati
- Checkbox "Confermo termini e condizioni"

**Azioni**:
- Review → Modifica step precedenti
- Submit → Crea offerta in database
- Pubblica offerta
- Redirect a `/dashboard/merchant/offers`

**Stato**: ⏳ Da implementare

---

## 📋 Flow 4: Gestione Offerte

### Step 1: Lista Offerte
**Pagina**: `/dashboard/merchant/offers`

**Componenti**:
- Lista offerte create
- Filtri (attive, scadute, draft)
- Status badge
- Statistiche (views, conversions)

**Azioni**:
- Visualizza offerte
- Modifica offerta
- Duplica offerta
- Elimina offerta

**Stato**: ✅ UI completata, ⏳ API da collegare

---

### Step 2: Modifica Offerte
**Pagina**: `/dashboard/merchant/offers/[id]/edit` (da creare)

**Componenti**:
- Form pre-compilato
- Tutti gli step modificabili

**Azioni**:
- Modifica dati
- Salva modifiche
- Pubblica/Unpublish

**Stato**: ⏳ Da implementare

---

## 📋 Flow 5: Verifica Transazioni SafeTrade (VLS)

### Step 1: Accesso Appointments
**Pagina**: `/dashboard/vls/appointments`

**Componenti**:
- Lista appuntamenti SafeTrade
- Filtri (oggi, questa settimana, tutti)
- Status (pending, checked-in, completed)

**Azioni**:
- Visualizza appuntamenti
- Filtra per data/status
- Clicca su appuntamento → Dettaglio

**Stato**: ✅ UI completata, ⏳ API da collegare

---

### Step 2: Check-in Utente
**Pagina**: `/dashboard/vls/verify/[id]`

**Componenti**:
- Info transazione
- QR code scanner o input manuale
- Info utente A e B
- Info carta/oggetto scambiato

**Azioni**:
- Scansiona QR code o inserisci ID
- Verifica identità utenti
- Clicca "Check-in" → Aggiorna status

**Stato**: ✅ UI completata, ⏳ API da collegare

---

### Step 3: Verifica e Completamento
**Pagina**: `/dashboard/vls/review/[id]`

**Componenti**:
- Riepilogo transazione
- Foto/verifica oggetti scambiati
- Checkbox conferme
- Bottoni "Approve" / "Reject"

**Azioni**:
- Verifica oggetti
- Conferma condizioni
- Approve → Completa transazione
- Reject → Annulla transazione (con motivo)

**Stato**: ✅ UI completata, ⏳ API da collegare

---

## 📋 Flow 6: Import Inventario (Chrome Extension)

### Step 1: Installazione Extension
**Processo**: Manuale (futuro: Chrome Web Store)

**Componenti**:
- Chrome extension installata
- Connessione a SafeTrade account

**Stato**: ⏳ Da implementare

---

### Step 2: Import da Piattaforme
**Piattaforme supportate** (futuro):
- TCGPlayer
- Cardmarket
- Altri marketplace

**Azioni**:
- Merchant naviga su piattaforma esterna
- Clicca extension icon
- Seleziona prodotti da importare
- Extension estrae dati (nome, prezzo, condizione, etc.)
- Submit → Crea `ImportBatch` in database

**Stato**: ⏳ Da implementare

---

### Step 3: Review Import
**Pagina**: `/dashboard/merchant/imports/[id]` (da creare)

**Componenti**:
- Lista prodotti importati
- Mapping campi (se necessario)
- Preview prodotti
- Bottoni "Approve All" / "Edit" / "Reject"

**Azioni**:
- Review prodotti importati
- Modifica dati se necessario
- Approve → Crea `Product` per ogni item
- Reject → Scarta import

**Stato**: ⏳ Da implementare

---

## 🔄 Flussi Alternativi

### Negozi Non Verificati
- Limitazioni funzionalità
- Messaggio "Verifica in corso"
- Supporto contatto

### Offerte Scadute
- Auto-archiviazione
- Notifica merchant
- Opzione rinnovo

---

## ✅ Checklist Merchant

- [x] Dashboard merchant base
- [x] Inventory page UI
- [x] Create offer Step 1
- [x] VLS appointments page
- [x] VLS verify page
- [x] VLS review page
- [ ] Setup negozio completo
- [ ] Verifica negozi
- [ ] Add/Edit/Delete prodotti
- [ ] Create offer Step 2-7
- [ ] Gestione offerte completa
- [ ] Chrome extension import
- [ ] Review import batch

---

## 🎯 Prossimi Step

Dopo setup merchant, può:
1. Gestire inventario → Inventory flow
2. Creare offerte → Create offer flow
3. Verificare transazioni → VLS flow

