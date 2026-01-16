# 🔐 TODO SAFEVAULT - Sistema Completo

**Ultimo Aggiornamento**: 2025-01-27  
**Priorità**: 🔴 CRITICA - Sistema Core  
**Stato**: 🚧 IN LAVORAZIONE

---

## 📋 INDICE

1. [🎯 Obiettivo](#-obiettivo)
2. [📊 Stato Attuale](#-stato-attuale)
3. [🔴 TODO Critici](#-todo-critici)
4. [🟡 TODO Media Priorità](#-todo-media-priorità)
5. [🟢 TODO Miglioramenti](#-todo-miglioramenti)
6. [📐 Architettura e Logiche](#-architettura-e-logiche)
7. [✅ Test](#-test)

---

## 🎯 Obiettivo

Completare l'implementazione del sistema SafeVault con:
1. ✅ **Scan QR completo** - Merchant scansiona QR slot per gestire carte
2. ✅ **Generazione QR per teche** - Creare e stampare QR da esporre nelle teche
3. ✅ **Sistema organizzazione** - Vista teca completa, gestione slot, organizzazione carte
4. ✅ **Sistema vendita** - Registrazione vendite fisiche, vendita online, split ricavi

---

## 📊 Stato Attuale

### ✅ Implementato (Base)
- [x] Schema database completo (VaultDeposit, VaultItem, VaultCase, VaultCaseSlot, VaultSale, VaultOrder, VaultSplit)
- [x] API `/api/vault/merchant/scan-slot` - Scansione slot QR
- [x] API `/api/vault/merchant/assign-item-to-slot` - Assegnazione carta a slot
- [x] API `/api/vault/cases/[id]/qr-batch` - Generazione QR batch per stampa
- [x] API `/api/vault/public/scan/[token]` - Endpoint pubblico per info slot
- [x] Pagina `/merchant/vault/scan` - Interfaccia scan con tabs (parziale)
- [x] Pagina `/merchant/vault/page` - Dashboard Vault (parziale)
- [x] Utility `src/lib/vault/qr-generator.ts` - Generazione token QR

### ⚠️ Parzialmente Implementato
- [x] Pagina scan ha tabs ma funziona solo "posiziona"
- [x] Dashboard Vault ha stats ma mancano altre sezioni
- [x] Generazione QR batch esiste ma manca pagina UI per download/stampa

### ❌ Mancante (Da Implementare)
- [ ] **Pagina generazione/stampa QR** - UI per creare e scaricare QR per teche
- [ ] **Vista teca completa** - Visualizzazione 30 slot, stato, organizzazione
- [ ] **Sistema vendita fisica** - Registrazione vendita in-store con foto proof
- [ ] **Sistema vendita online** - Lista online, ordini, fulfillment
- [ ] **Tab "Sposta" nella scan page** - Funzionalità spostamento carte tra slot
- [ ] **Tab "Vendi" nella scan page** - Funzionalità vendita rapida
- [ ] **Tab "Fulfillment" nella scan page** - Pick & ship ordini online
- [ ] **Pagina pubblica QR scan** - `/scan/[token]` per clienti che scansionano QR in negozio
- [ ] **Organizzazione avanzata** - Filtri, ricerca, ordinamento carte in teca

---

## 🔴 TODO Critici

### 1. 📱 PAGINA GENERAZIONE/STAMPA QR TECHE

**Priorità**: 🔴 CRITICA  
**File**: `src/app/merchant/vault/cases/[id]/qr-print/page.tsx` (NUOVO)

**Funzionalità**:
- [ ] Visualizza info teca (label, status, shop)
- [ ] Lista tutti i 30 slot con QR code generato
- [ ] Preview QR per ogni slot (immagine)
- [ ] Download singolo QR (PNG/PDF)
- [ ] Download batch QR (PDF con tutti i 30 QR)
- [ ] Stampa diretta (print layout ottimizzato)
- [ ] Mostra info slot (codice, status, carta se occupato)
- [ ] Link/URL per ogni slot (per test)

**Layout Stampa**:
- [ ] Etichetta QR (30x40mm o simile)
- [ ] Slot code ben visibile (S01, S02, ...)
- [ ] QR code centrale
- [ ] URL di scan sotto QR
- [ ] Logo SafeTrade opzionale

**API da usare**:
- `GET /api/vault/cases/[id]/qr-batch` (esiste)

**Stato**: ❌ DA CREARE

---

### 2. 🏪 VISTA TECA COMPLETA (30 SLOT)

**Priorità**: 🔴 CRITICA  
**File**: `src/app/merchant/vault/cases/[id]/page.tsx` (AGGIORNARE)

**Funzionalità**:
- [ ] Visualizza teca con griglia 30 slot (es. 6x5 o 10x3)
- [ ] Ogni slot mostra:
  - [ ] Slot code (S01, S02, ...)
  - [ ] QR code mini preview
  - [ ] Stato (FREE/OCCUPIED) con colore
  - [ ] Carta se occupato (thumbnail, nome, game)
  - [ ] Prezzo se occupato
- [ ] Click su slot → modal dettaglio slot
- [ ] Filtri:
  - [ ] Tutti / Liberi / Occupati
  - [ ] Per game (Pokemon, Magic, Yu-Gi-Oh!, One Piece)
  - [ ] Per prezzo (min/max)
  - [ ] Per stato carta
- [ ] Statistiche teca:
  - [ ] Slot liberi/occupati
  - [ ] Valore totale carte in teca
  - [ ] Carte per game
- [ ] Azioni:
  - [ ] "Genera QR" → link a `/merchant/vault/cases/[id]/qr-print`
  - [ ] "Scansiona Slot" → link a `/merchant/vault/scan?slotCode=S01`
  - [ ] "Assegna Carta" → modal selezione carta da assegnare

**Modal Dettaglio Slot**:
- [ ] Info slot completo
- [ ] Info carta se occupato (tutte le foto, dettagli)
- [ ] Azioni:
  - [ ] "Rimuovi Carta" (se occupato)
  - [ ] "Sposta Carta" (se occupato)
  - [ ] "Vendi Carta" (se occupato)
  - [ ] "Scansiona QR Slot" → apre scan page

**API da usare**:
- `GET /api/vault/cases/[id]` (esiste, ma verificare include slots + items)
- `GET /api/vault/merchant/available-items` (per modal assegnazione)

**Stato**: ⚠️ PARZIALE - Pagina esiste ma va completata

---

### 3. 💰 SISTEMA VENDITA FISICA

**Priorità**: 🔴 CRITICA  
**File**: `src/app/merchant/vault/sales/page.tsx` (NUOVO) + API update

**Funzionalità**:
- [ ] **Tab "Vendi" nella scan page**:
  - [ ] Scansiona slot con carta
  - [ ] Mostra info carta
  - [ ] Form vendita:
    - [ ] Prezzo vendita (input, default = priceFinal)
    - [ ] Foto prova vendita (upload opzionale)
    - [ ] Note (opzionale)
  - [ ] Bottone "Registra Vendita"
  - [ ] Conferma → crea VaultSale, aggiorna item status → SOLD, libera slot

- [ ] **Pagina vendite** (`/merchant/vault/sales`):
  - [ ] Lista tutte le vendite fisiche
  - [ ] Filtri (data, game, prezzo)
  - [ ] Dettaglio vendita (carta, prezzo, foto proof, split ricavi)
  - [ ] Statistiche (vendite oggi/settimana/mese, ricavi)

**API da usare/modificare**:
- `POST /api/vault/merchant/sales` (esiste, verificare funziona correttamente)
- `GET /api/vault/merchant/sales` (creare per lista vendite)

**Split Ricavi**:
- [ ] 70% owner (proprietario carta)
- [ ] 20% merchant (negozio)
- [ ] 10% platform (SafeTrade)
- [ ] Creazione VaultSplit automatica con status ELIGIBLE

**Stato**: ⚠️ PARZIALE - API sales esiste ma manca UI completa

---

### 4. 📦 SISTEMA VENDITA ONLINE

**Priorità**: 🔴 CRITICA  
**File**: Multiple files (NUOVO/AGGIORNARE)

**Funzionalità**:

#### 4.1 Lista Carta Online
- [ ] **Tab "Lista Online" nella scan page**:
  - [ ] Scansiona slot con carta
  - [ ] Mostra info carta
  - [ ] Form lista online:
    - [ ] Prezzo online (default = priceFinal, modificabile)
    - [ ] Condizione spedizione (standard/express)
    - [ ] Note descrittive
  - [ ] Bottone "Pubblica Online"
  - [ ] Conferma → aggiorna item status → LISTED_ONLINE

- [ ] **API lista online**:
  - [ ] `POST /api/vault/merchant/items/[id]/list-online` (esiste, verificare)
  - [ ] Crea listing pubblica (visibile su marketplace)
  - [ ] Item status → LISTED_ONLINE

#### 4.2 Ordini Online
- [ ] **Tab "Fulfillment" nella scan page**:
  - [ ] Lista ordini da evadere (RESERVED status)
  - [ ] Per ogni ordine:
    - [ ] Info ordine (buyer, indirizzo, totale)
    - [ ] Info carta (slot, nome, foto)
    - [ ] Azioni:
      - [ ] "Prepara Spedizione" → aggiorna order status → FULFILLING
      - [ ] "Spedito" → aggiungi tracking, status → SHIPPED
  - [ ] Scansione slot carta per pick:
    - [ ] Scansiona slot → verifica carta corrisponde ordine
    - [ ] Conferma pick → aggiorna item status → RESERVED → FULFILLING

- [ ] **Pagina ordini** (`/merchant/vault/orders`):
  - [ ] Lista tutti ordini (PENDING_PAYMENT, PAID, FULFILLING, SHIPPED, DELIVERED)
  - [ ] Filtri per status
  - [ ] Dettaglio ordine (fulfillment, tracking, split ricavi)

**API da usare/modificare**:
- `GET /api/vault/merchant/orders` (esiste)
- `POST /api/vault/merchant/orders/[id]/fulfill` (esiste, verificare)
- `POST /api/vault/orders/[id]/pay` (per buyer, esiste)

**Split Ricavi Online**:
- [ ] Split PENDING alla creazione ordine
- [ ] Diventa ELIGIBLE dopo 7 giorni da DELIVERED
- [ ] 70/20/10 come vendite fisiche

**Stato**: ⚠️ PARZIALE - API esistono ma UI incompleta

---

### 5. 🔄 TAB "SPOSTA" NELLA SCAN PAGE

**Priorità**: 🔴 CRITICA  
**File**: `src/app/merchant/vault/scan/page.tsx` (AGGIORNARE)

**Funzionalità**:
- [ ] **Step 1**: Scansiona slot ORIGINE (carta da spostare)
  - [ ] Verifica slot occupato
  - [ ] Mostra info carta
  - [ ] Bottone "Continua Spostamento"
- [ ] **Step 2**: Scansiona slot DESTINAZIONE (nuovo slot)
  - [ ] Verifica slot libero
  - [ ] Mostra info slot destinazione
  - [ ] Bottone "Conferma Spostamento"
- [ ] **Conferma**:
  - [ ] Libera slot origine (status → FREE)
  - [ ] Assegna carta a slot destinazione (status → OCCUPIED)
  - [ ] Aggiorna item (slotId, caseId se cambia)
  - [ ] Audit log spostamento

**API da usare/modificare**:
- `POST /api/vault/merchant/items/[id]/move-slot` (esiste, verificare)

**Stato**: ⚠️ PARZIALE - Tab esiste ma logica mancante

---

### 6. 🌐 PAGINA PUBBLICA SCAN QR

**Priorità**: 🔴 CRITICA  
**File**: `src/app/scan/[token]/page.tsx` (NUOVO)

**Funzionalità**:
- [ ] Endpoint pubblico (no auth richiesto)
- [ ] Visualizza info slot e carta (se occupato)
- [ ] Info carta:
  - [ ] Foto carta
  - [ ] Nome, game, set
  - [ ] Prezzo
  - [ ] Condizione
  - [ ] Info negozio (nome, indirizzo, mappa)
- [ ] Se carta disponibile online → bottone "Acquista Online"
- [ ] Se carta solo fisica → info "Disponibile in negozio"
- [ ] QR code info slot visibile (per riferimento)

**Use Case**:
- Cliente in negozio scansiona QR slot teca
- Vede info carta su smartphone
- Può decidere se acquistare online o in negozio

**API da usare**:
- `GET /api/vault/public/scan/[token]` (esiste)

**Stato**: ❌ DA CREARE

---

## 🟡 TODO Media Priorità

### 7. 📊 ORGANIZZAZIONE AVANZATA

**Priorità**: 🟡 MEDIA  
**File**: `src/app/merchant/vault/inventory/page.tsx` (NUOVO/AGGIORNARE)

**Funzionalità**:
- [ ] Lista tutte le carte assegnate al negozio
- [ ] Filtri avanzati:
  - [ ] Per status (ASSIGNED_TO_SHOP, IN_CASE, LISTED_ONLINE, RESERVED, SOLD)
  - [ ] Per game
  - [ ] Per prezzo (min/max)
  - [ ] Per slot/case
  - [ ] Per proprietario (owner)
- [ ] Ricerca testuale (nome carta)
- [ ] Ordinamento:
  - [ ] Data assegnazione
  - [ ] Prezzo
  - [ ] Nome
  - [ ] Game
- [ ] Vista griglia/lista toggle
- [ ] Azioni batch:
  - [ ] Seleziona multiple carte → "Assegna a Slot" (modal selezione slot)
  - [ ] Seleziona multiple carte → "Lista Online"
  - [ ] Seleziona multiple carte → "Sposta"

**Stato**: ❌ DA CREARE/AGGIORNARE

---

### 8. 📈 STATISTICHE E REPORTING

**Priorità**: 🟡 MEDIA  
**File**: `src/app/merchant/vault/statement/page.tsx` (AGGIORNARE)

**Funzionalità**:
- [ ] Statistiche generali:
  - [ ] Totale carte assegnate
  - [ ] Carte in teca (IN_CASE)
  - [ ] Carte listate online
  - [ ] Carte vendute (oggi/settimana/mese)
  - [ ] Valore totale inventario
- [ ] Split ricavi:
  - [ ] Commissioni merchant (20% vendite)
  - [ ] Payout owner (70% vendite)
  - [ ] Commissioni platform (10% vendite)
  - [ ] Split ELIGIBLE vs PENDING
- [ ] Grafici:
  - [ ] Vendite nel tempo
  - [ ] Vendite per game
  - [ ] Occupazione slot nel tempo
- [ ] Export dati (CSV/Excel)

**Stato**: ⚠️ PARZIALE - Pagina esiste ma incompleta

---

## 🟢 TODO Miglioramenti

### 9. 🔔 NOTIFICHE E ALERT

**Priorità**: 🟢 BASSA  
**Funzionalità**:
- [ ] Notifica quando nuovo item assegnato al negozio
- [ ] Notifica quando ordine online ricevuto
- [ ] Notifica quando slot liberato (per organizzazione)
- [ ] Notifica quando vendita registrata (per owner)

**Stato**: 🟡 PARZIALE - Sistema notifiche esiste

---

### 10. 🎨 UI/UX MIGLIORAMENTI

**Priorità**: 🟢 BASSA  
**Funzionalità**:
- [ ] Animazioni smooth per assegnazioni/spostamenti
- [ ] Drag & drop carte tra slot (futuro)
- [ ] Shortcut keyboard per azioni comuni
- [ ] Dark mode ottimizzato
- [ ] Mobile responsive migliorato

**Stato**: 🟡 IN PROGRESS

---

## 📐 Architettura e Logiche

### 🔐 QR Code System

#### Token Format
```
Slot QR: VAULT_SLOT_{caseId}_{slotCode}_{random}
Item QR: VAULT_ITEM_{itemId}_{random}
```

#### QR Payload (JSON)
```json
{
  "type": "VAULT_SLOT",
  "slotId": "...",
  "slotCode": "S01",
  "caseId": "...",
  "qrToken": "...",
  "scanUrl": "https://safetrade.it/scan/..."
}
```

#### Generazione QR
- **Quando**: Alla creazione teca (automatico per 30 slot)
- **Formato**: PNG/PDF per stampa (300x300px minimo)
- **URL Scan**: `https://safetrade.it/scan/{qrToken}`

---

### 📊 Stati Item Flow

```
PENDING_REVIEW → ACCEPTED → ASSIGNED_TO_SHOP → IN_CASE → LISTED_ONLINE → RESERVED → SOLD
                                            ↓
                                          VaultSale (vendita fisica)
```

#### Transizioni Valide
- `ASSIGNED_TO_SHOP` → `IN_CASE` (assegnazione slot)
- `IN_CASE` → `LISTED_ONLINE` (pubblicazione online)
- `IN_CASE` → `SOLD` (vendita fisica)
- `LISTED_ONLINE` → `RESERVED` (ordine ricevuto)
- `RESERVED` → `FULFILLING` → `SHIPPED` → `DELIVERED` → split ELIGIBLE
- `IN_CASE` → `ASSIGNED_TO_SHOP` (rimozione da slot)

---

### 💰 Split Ricavi Logica

#### Vendita Fisica
```typescript
grossAmount = soldPrice
ownerAmount = grossAmount * 0.70    // 70% owner
merchantAmount = grossAmount * 0.20 // 20% merchant
platformAmount = grossAmount * 0.10 // 10% platform

Status: ELIGIBLE immediatamente (vendita confermata)
```

#### Vendita Online
```typescript
grossAmount = order.total
ownerAmount = grossAmount * 0.70
merchantAmount = grossAmount * 0.20
platformAmount = grossAmount * 0.10

Status: PENDING → ELIGIBLE (dopo 7 giorni da DELIVERED)
```

---

### 🏪 Organizzazione Slot

#### Struttura Teca
- **30 slot fissi**: S01, S02, ..., S30
- **Layout consigliato**: 6 righe x 5 colonne (o 10x3)
- **Stati slot**: FREE, OCCUPIED

#### Regole Assegnazione
- Un item può essere solo in UN slot alla volta
- Slot deve appartenere alla teca autorizzata del negozio
- Slot deve essere FREE per nuova assegnazione
- Rimozione item libera slot automaticamente

---

## ✅ Test

### Test Manuali Richiesti
1. [ ] Scan QR slot → assegnazione carta
2. [ ] Sposta carta tra slot
3. [ ] Registra vendita fisica
4. [ ] Lista carta online
5. [ ] Fulfillment ordine online
6. [ ] Generazione/stampa QR teca
7. [ ] Vista teca completa (30 slot)
8. [ ] Pagina pubblica scan QR

### Test Automatici (Posso Io)
1. [ ] API scan slot ritorna dati corretti
2. [ ] API assign item valida permessi
3. [ ] API move slot funziona correttamente
4. [ ] API sales crea split ricavi corretti
5. [ ] QR generation crea token univoci

---

## 🚀 ORDINE IMPLEMENTAZIONE CONSIGLIATO

1. **Fase 1: QR e Organizzazione** (2-3 ore)
   - ✅ Pagina generazione/stampa QR teche
   - ✅ Vista teca completa (30 slot)
   - ✅ Tab "Sposta" nella scan page

2. **Fase 2: Vendita Fisica** (2-3 ore)
   - ✅ Tab "Vendi" nella scan page
   - ✅ Pagina vendite con lista e dettagli

3. **Fase 3: Vendita Online** (3-4 ore)
   - ✅ Tab "Lista Online" nella scan page
   - ✅ Tab "Fulfillment" nella scan page
   - ✅ Pagina ordini completata

4. **Fase 4: Pubblico e Finalizzazione** (2-3 ore)
   - ✅ Pagina pubblica scan QR
   - ✅ Organizzazione avanzata inventory
   - ✅ Statistiche e reporting

**Tempo Totale Stimato**: 10-13 ore

---

## 📝 NOTE

### Considerazioni Importanti
- **Sicurezza**: Tutte le API devono verificare `vaultCaseAuthorized = true`
- **Audit Log**: Ogni azione (assegnazione, spostamento, vendita) deve essere loggata
- **Performance**: Vista 30 slot deve caricare rapidamente (lazy load immagini)
- **UX**: Scan QR deve essere fluido e intuitivo per uso in negozio

### Dipendenze
- Sistema notifiche (già implementato)
- Sistema split ricavi (già implementato)
- Sistema audit log (già implementato)

---

**Ultimo Aggiornamento**: 2025-01-27  
**Prossimo Step**: Implementazione Fase 1

