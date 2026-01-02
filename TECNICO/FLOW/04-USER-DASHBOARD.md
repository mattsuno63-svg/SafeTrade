# 👤 User Dashboard Flow - SafeTrade

## Overview
Il dashboard utente centralizza tutte le attività dell'utente: listing, proposte, transazioni, profilo e impostazioni.

---

## 📋 Flow 1: Dashboard Principale

### Step 1: Accesso Dashboard
**Pagina**: `/dashboard`

**Componenti**:
- Welcome message con nome utente
- Quick stats (opzionale):
  - Listing attivi
  - Proposte pending
  - Transazioni in corso
- Quick actions (card cliccabili):
  - **USER**: Browse Listings, Sell Cards
  - **MERCHANT**: Manage Inventory, Create Offer, View Offers

**Azioni**:
- Naviga a sezioni specifiche
- Accesso rapido a funzioni principali

**Stato**: ✅ Completato (base)

---

## 📋 Flow 2: Gestione Listing

### Step 1: Lista Listing Utente
**Pagina**: `/dashboard/listings` (da creare)

**Componenti**:
- Lista tutti i listing dell'utente
- Filtri (attivi, venduti, draft)
- Search bar
- Statistiche (views, proposte ricevute)

**Azioni**:
- Visualizza listing
- Filtra/ordina
- Clicca su listing → Dettaglio/Edit

**Stato**: ⏳ Da implementare

---

### Step 2: Modifica Listing
**Pagina**: `/dashboard/listings/[id]/edit` (da creare)

**Componenti**:
- Form pre-compilato
- Tutti i campi modificabili
- Preview immagini
- Bottone "Delete" (con conferma)

**Azioni**:
- Modifica dati
- Aggiorna immagini
- Salva modifiche
- Delete listing

**Stato**: ⏳ Da implementare

---

### Step 3: Statistiche Listing
**Componenti**:
- Views count
- Proposte ricevute
- Conversion rate (opzionale)
- Grafici (opzionale)

**Stato**: ⏳ Da implementare

---

## 📋 Flow 3: Gestione Proposte

### Step 1: Proposte Ricevute
**Pagina**: `/dashboard/proposals/received`

**Componenti**:
- Lista proposte ricevute sui propri listing
- Filtri (pending, accepted, rejected)
- Card proposta con:
  - Info listing
  - Prezzo offerto
  - Messaggio acquirente
  - Profilo acquirente
  - Bottoni "Accept" / "Reject"

**Azioni**:
- Visualizza proposte
- Filtra per status
- Accept → Crea SafeTrade transaction
- Reject → Aggiorna status

**Stato**: ✅ UI completata, ⏳ API da collegare

---

### Step 2: Proposte Inviate
**Pagina**: `/dashboard/proposals/sent` (da creare)

**Componenti**:
- Lista proposte inviate ad altri venditori
- Status (pending, accepted, rejected)
- Info listing target
- Azioni disponibili

**Azioni**:
- Visualizza proposte
- Se accettata → Vai a SafeTrade flow
- Se rifiutata → Può inviare nuova proposta

**Stato**: ⏳ Da implementare

---

## 📋 Flow 4: Gestione Transazioni

### Step 1: Lista Transazioni
**Pagina**: `/dashboard/transactions` (da creare)

**Componenti**:
- Lista tutte le transazioni SafeTrade
- Filtri (pending, completed, rejected)
- Status badge
- Info negozio, data, oggetto

**Azioni**:
- Visualizza transazioni
- Filtra per status
- Clicca su transazione → Dettaglio

**Stato**: ⏳ Da implementare

---

### Step 2: Dettaglio Transazione
**Pagina**: `/transaction/[id]/status` (già esistente)

**Componenti**:
- Timeline transazione
- Info completa
- QR code (se applicabile)
- Contatti

**Stato**: ✅ Completato

---

## 📋 Flow 5: Profilo Utente

### Step 1: Visualizza Profilo
**Pagina**: `/dashboard/profile` (da creare)

**Componenti**:
- Info utente (nome, email, avatar)
- Bio (opzionale)
- Statistiche (listing, transazioni, rating)
- Collezione personale (opzionale)

**Azioni**:
- Visualizza profilo
- Modifica profilo

**Stato**: ⏳ Da implementare

---

### Step 2: Modifica Profilo
**Pagina**: `/dashboard/profile/edit` (da creare)

**Componenti**:
- Form profilo
- Upload avatar
- Campi modificabili:
  - Nome
  - Bio
  - Avatar
  - Preferenze notifiche

**Azioni**:
- Modifica dati
- Upload nuova immagine
- Salva modifiche

**Stato**: ⏳ Da implementare

---

## 📋 Flow 6: Impostazioni

### Step 1: Impostazioni Account
**Pagina**: `/dashboard/settings` (da creare)

**Componenti**:
- Sezioni:
  - Account (email, password)
  - Notifiche (preferenze)
  - Privacy
  - Sicurezza (2FA opzionale)

**Azioni**:
- Modifica email
- Cambia password
- Gestisci notifiche
- Impostazioni privacy

**Stato**: ⏳ Da implementare

---

### Step 2: Cambio Password
**Componenti**:
- Form cambio password
- Validazione:
  - Password attuale corretta
  - Nuova password sicura
  - Conferma password

**Azioni**:
- Inserisci password attuale
- Inserisci nuova password
- Conferma nuova password
- Submit → Aggiorna password

**Stato**: ⏳ Da implementare

---

## 📋 Flow 7: Notifiche

### Step 1: Lista Notifiche
**Componente**: NotificationBell in Header

**Componenti**:
- Dropdown con notifiche recenti
- Badge contatore non lette
- Filtri (tutte, non lette)
- Mark all as read

**Azioni**:
- Visualizza notifiche
- Clicca notifica → Vai a link
- Mark as read
- Mark all as read

**Stato**: ✅ Completato (base)

---

### Step 2: Dettaglio Notifica
**Componenti**:
- Messaggio completo
- Link a risorsa correlata
- Timestamp
- Azioni (mark read, delete)

**Stato**: ✅ Completato (base)

---

## 🔄 Flussi Alternativi

### Nessuna Attività
- Messaggio "No listings yet"
- CTA "Create your first listing"

### Profilo Incompleto
- Banner "Complete your profile"
- Link a setup profilo

---

## ✅ Checklist User Dashboard

- [x] Dashboard principale base
- [x] Proposte ricevute page
- [x] Notification bell
- [ ] Lista listing utente
- [ ] Edit/Delete listing
- [ ] Proposte inviate page
- [ ] Lista transazioni
- [ ] Profilo utente completo
- [ ] Impostazioni account
- [ ] Cambio password
- [ ] Statistiche avanzate

---

## 🎯 Prossimi Step

Dal dashboard, utente può:
1. Gestire listing → Listing management
2. Gestire proposte → Proposals flow
3. Monitorare transazioni → SafeTrade flow
4. Configurare account → Settings flow

