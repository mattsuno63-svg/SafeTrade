# 📊 STATO PROGETTO SAFEVAULT - Cosa Manca

**Data Aggiornamento**: 2025-01-27  
**Ultimo Commit**: Tab "Vendi" implementato

---

## ✅ COMPLETATO

### Fase 1: QR e Organizzazione
- ✅ Pagina generazione/stampa QR teche (`/merchant/vault/cases/[id]/qr-print`)
- ✅ Vista teca completa (30 slot) - Base implementata
- ✅ Tab "Sposta" nella scan page
- ✅ Tab "Vendi" nella scan page
- ✅ API `/api/vault/merchant/sales` (POST per registrare vendita)
- ✅ API `/api/vault/merchant/sales` (GET per lista vendite)
- ✅ API `/api/vault/merchant/scan-slot` (aggiornata con priceFinal, photos, set)
- ✅ API `/api/vault/cases/[id]/qr-batch` (accesso per MERCHANT/HUB_STAFF)
- ✅ API `/api/vault/cases/[id]` (accesso per MERCHANT/HUB_STAFF)

---

## ❌ DA IMPLEMENTARE - Priorità CRITICA

### 1. 🏪 Vista Teca Completa - Miglioramenti
**File**: `src/app/merchant/vault/cases/[id]/page.tsx`

**Mancante**:
- [ ] Filtri:
  - [ ] Tutti / Liberi / Occupati
  - [ ] Per game (Pokemon, Magic, Yu-Gi-Oh!, One Piece)
  - [ ] Per prezzo (min/max)
  - [ ] Per stato carta
- [ ] Statistiche teca:
  - [ ] Slot liberi/occupati (contatore)
  - [ ] Valore totale carte in teca
  - [ ] Carte per game (grafico/lista)
- [ ] Azioni operative:
  - [ ] "Scansiona Slot" → link a `/merchant/vault/scan?slotCode=S01`
  - [ ] "Assegna Carta" → modal selezione carta da assegnare
  - [ ] Click su slot vuoto → modal assegnazione carta

**Priorità**: 🔴 CRITICA (la vista base esiste ma mancano filtri e azioni)

---

### 2. 💰 Pagina Vendite con Lista e Dettagli
**File**: `src/app/merchant/vault/sales/page.tsx` (DA CREARE)

**Mancante**:
- [ ] Lista tutte le vendite fisiche
  - [ ] Card per ogni vendita (carta, prezzo, data, foto proof)
  - [ ] Paginazione o infinite scroll
- [ ] Filtri:
  - [ ] Per data (oggi/settimana/mese/custom range)
  - [ ] Per game (Pokemon, Magic, Yu-Gi-Oh!, One Piece)
  - [ ] Per prezzo (min/max)
- [ ] Dettaglio vendita:
  - [ ] Info carta completa (foto, game, set)
  - [ ] Prezzo vendita
  - [ ] Foto prova vendita (se presente)
  - [ ] Split ricavi (70% owner, 20% merchant, 10% platform)
  - [ ] Data vendita
  - [ ] Info proprietario carta
- [ ] Statistiche:
  - [ ] Vendite oggi/settimana/mese
  - [ ] Ricavi totali
  - [ ] Commissioni merchant (20%)
  - [ ] Grafico vendite nel tempo

**API**: `GET /api/vault/merchant/sales` (✅ già implementata)

**Priorità**: 🔴 CRITICA (tab "Vendi" funziona ma manca pagina per visualizzare storico)

---

### 3. 📦 Tab "Lista Online" nella Scan Page
**File**: `src/app/merchant/vault/scan/page.tsx`

**Mancante**:
- [ ] Scansiona slot con carta (deve essere IN_CASE)
- [ ] Mostra info carta
- [ ] Form lista online:
  - [ ] Prezzo online (default = priceFinal, modificabile)
  - [ ] Condizione spedizione (standard/express)
  - [ ] Note descrittive (opzionale)
- [ ] Bottone "Pubblica Online"
- [ ] Conferma → chiama API `POST /api/vault/merchant/items/[id]/list-online`
- [ ] Aggiorna item status → LISTED_ONLINE

**API da verificare**: `POST /api/vault/merchant/items/[id]/list-online` (verificare se esiste)

**Priorità**: 🔴 CRITICA (necessario per vendite online)

---

### 4. 📦 Tab "Fulfillment" nella Scan Page
**File**: `src/app/merchant/vault/scan/page.tsx`

**Mancante**:
- [ ] Lista ordini da evadere (RESERVED status)
  - [ ] Card per ogni ordine (buyer, indirizzo, totale, carta)
  - [ ] Info carta (slot, nome, foto)
- [ ] Azioni per ordine:
  - [ ] "Prepara Spedizione" → aggiorna order status → FULFILLING
  - [ ] "Spedito" → form aggiungi tracking, status → SHIPPED
- [ ] Scansione slot carta per pick:
  - [ ] Scansiona slot → verifica carta corrisponde ordine
  - [ ] Conferma pick → aggiorna item status → RESERVED → FULFILLING
- [ ] Filtri:
  - [ ] Per status ordine (RESERVED, FULFILLING, SHIPPED)
  - [ ] Per data ordine

**API da verificare**: 
- `GET /api/vault/merchant/orders` (verificare se esiste)
- `POST /api/vault/merchant/orders/[id]/fulfill` (verificare se esiste)

**Priorità**: 🔴 CRITICA (necessario per evasione ordini online)

---

### 5. 🌐 Pagina Pubblica Scan QR
**File**: `src/app/scan/[token]/page.tsx` (verificare se esiste già)

**Mancante**:
- [ ] Endpoint pubblico (no auth richiesto)
- [ ] Visualizza info slot e carta (se occupato)
- [ ] Info carta:
  - [ ] Foto carta
  - [ ] Nome, game, set
  - [ ] Prezzo
  - [ ] Condizione
  - [ ] Info negozio (nome, indirizzo, mappa)
- [ ] Azioni:
  - [ ] Se carta disponibile online → bottone "Acquista Online" (link a marketplace)
  - [ ] Se carta solo fisica → info "Disponibile in negozio"
- [ ] QR code info slot visibile (per riferimento)

**API**: `GET /api/vault/public/scan/[token]` (verificare se esiste e funziona)

**Priorità**: 🟡 MEDIA (utile per clienti ma non critico per funzionamento base)

**Use Case**: Cliente in negozio scansiona QR slot teca → vede info carta su smartphone → può decidere se acquistare online o in negozio

---

## 🟡 DA IMPLEMENTARE - Priorità MEDIA

### 6. 📊 Organizzazione Avanzata Inventory
**File**: `src/app/merchant/vault/inventory/page.tsx` (verificare se esiste già)

**Mancante**:
- [ ] Lista tutte le carte assegnate al negozio
- [ ] Filtri avanzati:
  - [ ] Per status (ASSIGNED_TO_SHOP, IN_CASE, LISTED_ONLINE, RESERVED, SOLD)
  - [ ] Per game
  - [ ] Per prezzo (min/max)
  - [ ] Per slot/case
  - [ ] Per proprietario (owner)
- [ ] Ricerca testuale (nome carta)
- [ ] Ordinamento (data assegnazione, prezzo, nome, game)
- [ ] Vista griglia/lista toggle
- [ ] Azioni batch:
  - [ ] Seleziona multiple carte → "Assegna a Slot" (modal selezione slot)
  - [ ] Seleziona multiple carte → "Lista Online"
  - [ ] Seleziona multiple carte → "Sposta"

**Priorità**: 🟡 MEDIA (utile per gestione ma non critico)

---

### 7. 📈 Statistiche e Reporting Avanzato
**File**: `src/app/merchant/vault/statement/page.tsx` (già esistente, da migliorare)

**Miglioramenti**:
- [ ] Grafici:
  - [ ] Vendite nel tempo (line chart)
  - [ ] Vendite per game (pie/bar chart)
  - [ ] Occupazione slot nel tempo
- [ ] Export dati (CSV/Excel)
- [ ] Filtri avanzati (periodo, game, prezzo)
- [ ] Comparazione periodi (mese corrente vs mese precedente)

**Priorità**: 🟡 MEDIA (nice to have, non critico per funzionamento)

---

## 🟢 DA IMPLEMENTARE - Priorità BASSA (Nice to Have)

### 8. 🔔 Notifiche e Alert Vault-specifici
**Funzionalità**:
- [ ] Notifica quando nuovo item assegnato al negozio
- [ ] Notifica quando ordine online ricevuto
- [ ] Notifica quando slot liberato (per organizzazione)
- [ ] Notifica quando vendita registrata (per owner)

**Stato**: 🟡 PARZIALE - Sistema notifiche esiste ma mancano notifiche Vault-specifiche

**Priorità**: 🟢 BASSA

---

### 9. 🎨 UI/UX Miglioramenti
**Funzionalità**:
- [ ] Animazioni smooth per assegnazioni/spostamenti
- [ ] Drag & drop carte tra slot (futuro)
- [ ] Shortcut keyboard per azioni comuni
- [ ] Dark mode ottimizzato
- [ ] Mobile responsive migliorato

**Priorità**: 🟢 BASSA

---

## 📋 RIEPILOGO PRIORITÀ

### 🔴 CRITICO (Da completare prima del lancio)
1. Vista Teca Completa - Miglioramenti (filtri, statistiche, azioni)
2. Pagina Vendite con Lista e Dettagli
3. Tab "Lista Online" nella Scan Page
4. Tab "Fulfillment" nella Scan Page

**Stima Tempo**: 6-8 ore

---

### 🟡 MEDIO (Utile ma non bloccante)
5. Pagina Pubblica Scan QR
6. Organizzazione Avanzata Inventory
7. Statistiche e Reporting Avanzato

**Stima Tempo**: 4-6 ore

---

### 🟢 BASSO (Nice to have)
8. Notifiche Vault-specifiche
9. UI/UX Miglioramenti

**Stima Tempo**: 2-4 ore

---

## 🎯 PROSSIMI STEP CONSIGLIATI

1. **Completare Fase 2**: Pagina Vendite (`/merchant/vault/sales`)
   - Priorità: 🔴 CRITICA
   - Tempo stimato: 2-3 ore
   - Dipendenza: API già pronta ✅

2. **Implementare Tab "Lista Online"**
   - Priorità: 🔴 CRITICA
   - Tempo stimato: 1-2 ore
   - Verificare API esistente

3. **Implementare Tab "Fulfillment"**
   - Priorità: 🔴 CRITICA
   - Tempo stimato: 2-3 ore
   - Verificare API esistente

4. **Migliorare Vista Teca**
   - Priorità: 🔴 CRITICA
   - Tempo stimato: 1-2 ore
   - Aggiungere filtri e azioni

---

**Totale Tempo Stimato per Completamento CRITICO**: 6-10 ore

---

*Ultimo Aggiornamento: 2025-01-27*

