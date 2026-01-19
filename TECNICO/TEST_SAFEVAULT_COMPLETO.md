# 🧪 Test Completo Sistema SafeVault

**Data Creazione**: 2025-01-19  
**Obiettivo**: Test completo end-to-end del sistema SafeVault  
**Priorità**: 🔴 CRITICA - Testare tutto prima del deploy

---

## 📋 INDICE

1. [FASE 1: Integrazione Listing → Vault](#fase-1-integrazione-listing--vault)
2. [FASE 2: Sistema Depositi Utente](#fase-2-sistema-depositi-utente)
3. [FASE 3: Hub - Gestione Depositi e Review](#fase-3-hub---gestione-depositi-e-review)
4. [FASE 4: Hub - Assegnazione a Negozi](#fase-4-hub---assegnazione-a-negozi)
5. [FASE 5: Merchant - Gestione Inventario e Teche](#fase-5-merchant---gestione-inventario-e-teche)
6. [FASE 6: Marketplace - Lista Online Automatica](#fase-6-marketplace---lista-online-automatica)
7. [FASE 7: Sistema Ordini Online Vault](#fase-7-sistema-ordini-online-vault)
8. [FASE 8: Sistema Split Ricavi](#fase-8-sistema-split-ricavi)
9. [FASE 9: Sistema Payout Batch](#fase-9-sistema-payout-batch)
10. [Test di Sicurezza](#test-di-sicurezza)
11. [Test di Performance](#test-di-performance)

---

## ✅ FASE 1: Integrazione Listing → Vault

### Test 1.1: Creazione Listing con SafeVault

**Obiettivo**: Verificare che un utente possa creare un listing con vendita SafeVault

**Precondizioni**:
- [ ] Utente loggato e email verificata
- [ ] Server avviato e database sincronizzato

**Passi**:
1. [ ] Accedere a `/listings/create`
2. [ ] Compilare form listing:
   - [ ] Nome carta: "Charizard VMAX"
   - [ ] Gioco: Pokemon
   - [ ] Set: "Champion's Path"
   - [ ] Condizione: Near Mint
   - [ ] Prezzo: 150€
   - [ ] Tipo: Sale
   - [ ] Upload almeno 1 immagine
3. [ ] Selezionare "Vendita in Contovendita SafeVault"
4. [ ] Verificare che appaia:
   - [ ] Info box con spiegazione SafeVault
   - [ ] Lista benefici (verifica professionale, vendita multicanale, 70% split)
   - [ ] Checkbox "Ho letto e accetto i termini"
5. [ ] Spuntare checkbox termini
6. [ ] Cliccare "Create Listing"

**Risultati Attesi**:
- [ ] Listing creato con successo
- [ ] Redirect a `/listings/[id]`
- [ ] Badge "SafeVault" visibile sul listing
- [ ] `VaultDeposit` creato con status `CREATED`
- [ ] `VaultItem` creato con:
  - [ ] `status = PENDING_REVIEW`
  - [ ] `listingId` collegato al listing
  - [ ] Foto e dettagli corretti
- [ ] Notifica admin creata (tipo `VAULT_CASE_REQUEST`)

**Test Negativi**:
- [ ] Tentare di creare listing SafeVault senza accettare termini → Errore
- [ ] Tentare di creare listing SafeVault senza immagini → Errore
- [ ] Tentare di creare listing SafeVault con tipo TRADE → Dovrebbe funzionare solo per SALE/BOTH

---

### Test 1.2: Badge e Filtri Marketplace

**Obiettivo**: Verificare che i listing SafeVault siano correttamente identificati nel marketplace

**Passi**:
1. [ ] Accedere a `/listings`
2. [ ] Verificare che i listing SafeVault mostrino:
   - [ ] Badge "SafeVault" (purple) su ogni card
   - [ ] Icona `inventory_2` nel badge
3. [ ] Applicare filtro "Sale Mode" → "SafeVault"
4. [ ] Verificare che solo listing SafeVault siano visibili
5. [ ] Applicare filtro "Sale Mode" → "Direct P2P"
6. [ ] Verificare che solo listing P2P siano visibili

**Risultati Attesi**:
- [ ] Badge visibile su tutti i listing SafeVault
- [ ] Filtri funzionano correttamente
- [ ] Contatore risultati aggiornato

---

### Test 1.3: Pagina Dettaglio Listing SafeVault

**Obiettivo**: Verificare che la pagina dettaglio mostri tutte le info SafeVault

**Passi**:
1. [ ] Accedere a `/listings/[id]` per un listing SafeVault
2. [ ] Verificare sezione "SafeVault - Vendita in Contovendita":
   - [ ] Badge "VERIFICATO" visibile
   - [ ] Status carta mostrato (PENDING_REVIEW)
   - [ ] Info box con spiegazione split 70/20/10
3. [ ] Dopo review hub (Test 3.x), verificare:
   - [ ] Condizione verificata mostrata
   - [ ] Prezzo finale mostrato
4. [ ] Dopo assegnazione a negozio (Test 4.x), verificare:
   - [ ] Nome negozio mostrato
   - [ ] Città negozio mostrata
   - [ ] Teca e slot (se in teca)

**Risultati Attesi**:
- [ ] Sezione SafeVault sempre visibile per listing SafeVault
- [ ] Info aggiornate in tempo reale
- [ ] Design coerente con resto della pagina

---

## ✅ FASE 2: Sistema Depositi Utente

### Test 2.1: Creazione Deposito Manuale

**Obiettivo**: Verificare che un utente possa creare un deposito manualmente

**Passi**:
1. [ ] Accedere a `/vault/deposit/new`
2. [ ] Compilare form:
   - [ ] Note deposito (opzionale)
   - [ ] Tracking in (opzionale)
3. [ ] Aggiungere almeno 1 carta:
   - [ ] Gioco: Pokemon
   - [ ] Nome: "Pikachu VMAX"
   - [ ] Set: "Vivid Voltage"
   - [ ] Condizione: Excellent
   - [ ] Upload 1-5 foto
4. [ ] Cliccare "Aggiungi Altra Carta" e aggiungere una seconda carta
5. [ ] Rimuovere una carta dalla lista
6. [ ] Cliccare "Crea Deposito"

**Risultati Attesi**:
- [ ] Deposito creato con status `CREATED`
- [ ] Tutte le carte create con status `PENDING_REVIEW`
- [ ] Redirect a `/vault/deposits/[id]`
- [ ] Notifica admin creata

**Test Negativi**:
- [ ] Tentare di creare deposito senza carte → Errore
- [ ] Tentare di creare deposito con carta senza nome → Errore
- [ ] Tentare di creare deposito con carta senza foto → Errore

---

### Test 2.2: Lista Depositi Utente

**Obiettivo**: Verificare che l'utente possa vedere tutti i suoi depositi

**Passi**:
1. [ ] Accedere a `/vault/deposits`
2. [ ] Verificare lista depositi:
   - [ ] Status badge corretto per ogni deposito
   - [ ] Numero carte mostrato
   - [ ] Data creazione mostrata
   - [ ] Tracking in mostrato (se presente)
3. [ ] Applicare filtri:
   - [ ] Filtro per status
   - [ ] Filtro per data
4. [ ] Cliccare su un deposito → Redirect a dettaglio

**Risultati Attesi**:
- [ ] Solo depositi dell'utente loggato visibili
- [ ] Filtri funzionano correttamente
- [ ] Paginazione se più di 20 depositi

---

### Test 2.3: Dettaglio Deposito Utente

**Obiettivo**: Verificare che l'utente possa vedere dettagli completi del deposito

**Passi**:
1. [ ] Accedere a `/vault/deposits/[id]`
2. [ ] Verificare info deposito:
   - [ ] Status
   - [ ] Data creazione/ricezione/review
   - [ ] Tracking in
   - [ ] Note
3. [ ] Verificare lista carte:
   - [ ] Status ogni carta
   - [ ] Condizione verificata (se disponibile)
   - [ ] Prezzo finale (se disponibile)
   - [ ] Negozio assegnato (se disponibile)
   - [ ] Link a listing (se da listing)
4. [ ] Verificare timeline eventi
5. [ ] Se status `CREATED`, verificare azioni:
   - [ ] Pulsante "Modifica"
   - [ ] Pulsante "Elimina"
   - [ ] Pulsante "Marca come Spedito"

**Risultati Attesi**:
- [ ] Tutte le info corrette
- [ ] Azioni disponibili solo quando appropriate
- [ ] Timeline aggiornata

---

## ✅ FASE 3: Hub - Gestione Depositi e Review

### Test 3.1: Lista Depositi Hub

**Obiettivo**: Verificare che HUB_STAFF possa vedere tutti i depositi

**Precondizioni**:
- [ ] Account con ruolo HUB_STAFF o ADMIN
- [ ] Almeno 1 deposito esistente

**Passi**:
1. [ ] Accedere a `/admin/vault/deposits` come HUB_STAFF
2. [ ] Verificare lista:
   - [ ] Utente depositor mostrato
   - [ ] Status mostrato
   - [ ] Numero carte mostrato
   - [ ] Data creazione/ricezione mostrata
   - [ ] Priorità visibile (badge colorati)
3. [ ] Applicare filtri:
   - [ ] Status
   - [ ] Data
   - [ ] Utente
4. [ ] Cliccare su deposito → Redirect a dettaglio

**Risultati Attesi**:
- [ ] Tutti i depositi visibili (non solo propri)
- [ ] Filtri funzionano
- [ ] Badge priorità corretti (RECEIVED = red, IN_REVIEW = yellow)

---

### Test 3.2: Ricezione Deposito

**Obiettivo**: Verificare che HUB_STAFF possa marcare un deposito come ricevuto

**Passi**:
1. [ ] Accedere a `/admin/vault/deposits/[id]` per deposito con status `CREATED`
2. [ ] Cliccare "Marca come Ricevuto"
3. [ ] Verificare che status cambi a `RECEIVED`
4. [ ] Verificare che `receivedAt` sia impostato

**Risultati Attesi**:
- [ ] Status aggiornato
- [ ] Timestamp aggiornato
- [ ] Audit log creato

---

### Test 3.3: Review Carte

**Obiettivo**: Verificare che HUB_STAFF possa revieware ogni carta

**Passi**:
1. [ ] Accedere a `/admin/vault/deposits/[id]` per deposito con status `RECEIVED`
2. [ ] Per ogni carta:
   - [ ] Visualizzare foto (carousel)
   - [ ] Verificare info dichiarate
   - [ ] Selezionare "Accetta" o "Rifiuta"
   - [ ] Se "Accetta":
     - [ ] Selezionare condizione verificata
     - [ ] Inserire prezzo finale
     - [ ] Inserire note (opzionale)
   - [ ] Se "Rifiuta":
     - [ ] Inserire motivo (opzionale)
   - [ ] Cliccare "Salva Review"
3. [ ] Dopo review di tutte le carte, cliccare "Completa Review"
4. [ ] Verificare che status deposito cambi:
   - [ ] `ACCEPTED` se tutte accettate
   - [ ] `PARTIAL` se alcune accettate
   - [ ] `REJECTED` se tutte rifiutate

**Risultati Attesi**:
- [ ] Ogni carta può essere reviewata individualmente
- [ ] Condizione verificata salvata
- [ ] Prezzo finale salvato
- [ ] Status deposito aggiornato correttamente
- [ ] Notifica utente creata

**Test Negativi**:
- [ ] Tentare di accettare carta senza prezzo → Errore
- [ ] Tentare di accettare carta senza condizione verificata → Errore

---

## ✅ FASE 4: Hub - Assegnazione a Negozi

### Test 4.1: Assegnazione Singola Carta

**Obiettivo**: Verificare che HUB_STAFF possa assegnare una carta a un negozio

**Precondizioni**:
- [ ] Deposito con status `ACCEPTED` o `PARTIAL`
- [ ] Almeno 1 negozio con teca autorizzata

**Passi**:
1. [ ] Accedere a `/admin/vault/items/assign`
2. [ ] Verificare lista carte disponibili (status `ACCEPTED`, `shopIdCurrent = null`)
3. [ ] Selezionare una carta
4. [ ] Compilare form assegnazione:
   - [ ] Selezionare negozio
   - [ ] (Opzionale) Selezionare teca
   - [ ] (Opzionale) Selezionare slot (solo se teca selezionata)
5. [ ] Cliccare "Assegna"

**Risultati Attesi**:
- [ ] Carta assegnata al negozio
- [ ] Status carta → `ASSIGNED_TO_SHOP`
- [ ] Se slot selezionato:
  - [ ] Status carta → `IN_CASE`
  - [ ] Slot status → `OCCUPIED`
  - [ ] Slot `itemId` aggiornato
- [ ] Notifica merchant creata
- [ ] Audit log creato

**Test Negativi**:
- [ ] Tentare di assegnare a negozio senza teca autorizzata → Errore
- [ ] Tentare di assegnare a slot già occupato → Errore
- [ ] Tentare di assegnare carta non `ACCEPTED` → Errore

---

### Test 4.2: Assegnazione Multipla

**Obiettivo**: Verificare che HUB_STAFF possa assegnare più carte contemporaneamente

**Passi**:
1. [ ] Accedere a `/admin/vault/items/assign`
2. [ ] Selezionare checkbox per 3 carte
3. [ ] Compilare form:
   - [ ] Selezionare stesso negozio per tutte
   - [ ] (Opzionale) Selezionare stessa teca
4. [ ] Cliccare "Assegna Tutte"

**Risultati Attesi**:
- [ ] Tutte le 3 carte assegnate
- [ ] Status aggiornato per tutte
- [ ] Notifiche merchant create

---

## ✅ FASE 5: Merchant - Gestione Inventario e Teche

### Test 5.1: Dashboard Inventario

**Obiettivo**: Verificare che merchant possa vedere il suo inventario

**Precondizioni**:
- [ ] Account merchant con teca autorizzata
- [ ] Almeno 1 carta assegnata al negozio

**Passi**:
1. [ ] Accedere a `/merchant/vault/inventory`
2. [ ] Verificare statistiche:
   - [ ] Totale carte assegnate
   - [ ] In teca
   - [ ] Listate online
   - [ ] Vendute
3. [ ] Verificare lista carte:
   - [ ] Foto, nome, gioco, set
   - [ ] Status
   - [ ] Prezzo finale
   - [ ] Slot (se in teca)
4. [ ] Applicare filtri:
   - [ ] Status
   - [ ] Gioco
   - [ ] Set
5. [ ] Cercare per nome carta

**Risultati Attesi**:
- [ ] Solo carte del negozio visibili
- [ ] Statistiche corrette
- [ ] Filtri e ricerca funzionano

---

### Test 5.2: Posizionamento Carta in Teca

**Obiettivo**: Verificare che merchant possa posizionare una carta in uno slot

**Passi**:
1. [ ] Accedere a `/merchant/vault/inventory`
2. [ ] Selezionare carta con status `ASSIGNED_TO_SHOP`
3. [ ] Cliccare "Posiziona in Teca"
4. [ ] Scansionare QR di uno slot libero (o inserire codice manualmente)
5. [ ] Confermare assegnazione

**Risultati Attesi**:
- [ ] Carta assegnata allo slot
- [ ] Status carta → `IN_CASE`
- [ ] Slot status → `OCCUPIED`
- [ ] Se listing collegato, listing diventa disponibile online

**Test Negativi**:
- [ ] Tentare di assegnare a slot occupato → Errore
- [ ] Tentare di assegnare carta già in teca → Errore
- [ ] Tentare di assegnare carta non `ASSIGNED_TO_SHOP` → Errore

---

### Test 5.3: Vista Teca Completa

**Obiettivo**: Verificare che merchant possa vedere la griglia completa della teca

**Passi**:
1. [ ] Accedere a `/merchant/vault/cases/[id]`
2. [ ] Verificare griglia 30 slot:
   - [ ] Slot liberi: grigio, codice visibile (S01, S02, etc.)
   - [ ] Slot occupati: colore, foto carta + nome
3. [ ] Hover su slot occupato → Dettagli completi
4. [ ] Click su slot occupato → Modal con:
   - [ ] Dettagli carta completi
   - [ ] Azioni: "Dettagli", "Sposta", "Vendi", "Lista Online"
5. [ ] Click su slot libero → "Assegna Carta" → Redirect a scan
6. [ ] Applicare filtri vista:
   - [ ] Solo occupati
   - [ ] Solo liberi
   - [ ] Cerca per nome

**Risultati Attesi**:
- [ ] Griglia interattiva e responsive
- [ ] Info corrette per ogni slot
- [ ] Azioni funzionano

---

## ✅ FASE 6: Marketplace - Lista Online Automatica

### Test 6.1: Auto-Listing quando Carta in Teca

**Obiettivo**: Verificare che listing diventi disponibile quando carta è posizionata in teca

**Precondizioni**:
- [ ] Listing SafeVault esistente con `vaultItem` collegato
- [ ] Carta con status `ASSIGNED_TO_SHOP`

**Passi**:
1. [ ] Merchant posiziona carta in teca (Test 5.2)
2. [ ] Verificare che:
   - [ ] `vaultItem.status` → `IN_CASE`
   - [ ] `listing.isApproved` → `true` (se non già approvato)
   - [ ] `listing.price` → `vaultItem.priceFinal` (se disponibile)
3. [ ] Verificare che listing appaia nel marketplace
4. [ ] Verificare badge "In Negozio" su listing

**Risultati Attesi**:
- [ ] Listing automaticamente disponibile
- [ ] Prezzo aggiornato se disponibile
- [ ] Notifica utente creata

---

### Test 6.2: Sincronizzazione Listing ↔ VaultItem

**Obiettivo**: Verificare che modifiche a VaultItem si riflettano sul listing

**Passi**:
1. [ ] Accedere a `/listings/[id]` per listing SafeVault
2. [ ] Verificare che info VaultItem siano mostrate:
   - [ ] Status
   - [ ] Condizione verificata
   - [ ] Prezzo finale
   - [ ] Negozio (se assegnato)
3. [ ] Dopo assegnazione a negozio, refresh pagina
4. [ ] Verificare che info siano aggiornate

**Risultati Attesi**:
- [ ] Info sempre sincronizzate
- [ ] Aggiornamenti in tempo reale (o dopo refresh)

---

## ✅ FASE 7: Sistema Ordini Online Vault

### Test 7.1: Checkout Vault Order

**Obiettivo**: Verificare che buyer possa acquistare carta Vault online

**Precondizioni**:
- [ ] Listing SafeVault con carta `IN_CASE` o `LISTED_ONLINE`
- [ ] Account buyer

**Passi**:
1. [ ] Accedere a `/listings/[id]` per listing SafeVault disponibile
2. [ ] Cliccare "Acquista" o "Buy Now"
3. [ ] Verificare redirect a `/checkout/vault/[itemId]`
4. [ ] Verificare info carta:
   - [ ] Foto, nome, set, condizione verificata
   - [ ] Prezzo finale
5. [ ] Verificare info negozio:
   - [ ] Nome negozio
   - [ ] Indirizzo
   - [ ] Tempi spedizione stimati
6. [ ] Compilare form spedizione:
   - [ ] Indirizzo completo
   - [ ] Note spedizione (opzionale)
7. [ ] Verificare riepilogo:
   - [ ] Subtotal
   - [ ] Spedizione
   - [ ] Totale
8. [ ] Procedere con pagamento (Stripe o wallet)
9. [ ] Completare pagamento

**Risultati Attesi**:
- [ ] `VaultOrder` creato con status `PENDING_PAYMENT`
- [ ] Dopo pagamento:
   - [ ] Status → `PAID`
   - [ ] `vaultItem.status` → `RESERVED`
   - [ ] Notifica merchant creata
   - [ ] Notifica buyer creata

**Test Negativi**:
- [ ] Tentare di acquistare carta non disponibile → Errore
- [ ] Tentare di acquistare carta già `RESERVED` → Errore

---

### Test 7.2: Fulfillment Merchant

**Obiettivo**: Verificare che merchant possa evadere ordine

**Precondizioni**:
- [ ] Ordine Vault con status `PAID`

**Passi**:
1. [ ] Accedere a `/merchant/vault/orders` come merchant
2. [ ] Verificare lista ordini da evadere
3. [ ] Selezionare ordine
4. [ ] Cliccare "Prepara Spedizione"
5. [ ] Compilare form:
   - [ ] Corriere
   - [ ] Codice tracking
   - [ ] Note (opzionale)
6. [ ] Cliccare "Marca come Spedito"

**Risultati Attesi**:
- [ ] `VaultFulfillment` creato
- [ ] Status ordine → `FULFILLING` → `SHIPPED`
- [ ] Notifica buyer creata

---

## ✅ FASE 8: Sistema Split Ricavi

### Test 8.1: Split su Vendita Fisica

**Obiettivo**: Verificare che split 70/20/10 sia calcolato correttamente su vendita fisica

**Precondizioni**:
- [ ] Carta `IN_CASE`
- [ ] Merchant registra vendita fisica

**Passi**:
1. [ ] Merchant registra vendita fisica (prezzo: 100€)
2. [ ] Verificare che `VaultSplit` sia creato:
   - [ ] `ownerAmount = 70.00€`
   - [ ] `merchantAmount = 20.00€`
   - [ ] `platformAmount = 10.00€`
   - [ ] `status = ELIGIBLE` (immediato)
   - [ ] `sourceType = SALE`
3. [ ] Verificare che `vaultItem.status` → `SOLD`

**Risultati Attesi**:
- [ ] Split calcolato correttamente
- [ ] Status `ELIGIBLE` immediato
- [ ] Audit log creato

---

### Test 8.2: Split su Ordine Online

**Obiettivo**: Verificare che split 70/20/10 sia calcolato con hold period su ordine online

**Precondizioni**:
- [ ] Ordine Vault con status `DELIVERED`

**Passi**:
1. [ ] Buyer conferma ricezione (o 72h passate)
2. [ ] Verificare che `VaultSplit` sia creato:
   - [ ] Split corretto (70/20/10)
   - [ ] `status = PENDING` (inizialmente)
3. [ ] Attendere 7 giorni (o simulare)
4. [ ] Verificare che `status` → `ELIGIBLE`

**Risultati Attesi**:
- [ ] Split calcolato correttamente
- [ ] Hold period di 7 giorni rispettato
- [ ] Status aggiornato automaticamente

---

### Test 8.3: Statement Utente

**Obiettivo**: Verificare che utente possa vedere il suo statement

**Passi**:
1. [ ] Accedere a `/vault/statement` come utente
2. [ ] Verificare riepilogo:
   - [ ] Totale guadagnato
   - [ ] In attesa (ELIGIBLE)
   - [ ] Ricevuto (PAID)
3. [ ] Verificare lista split:
   - [ ] Data vendita
   - [ ] Carta venduta
   - [ ] Prezzo vendita
   - [ ] Split (70%)
   - [ ] Status
   - [ ] Data payout (se PAID)
4. [ ] Applicare filtri:
   - [ ] Periodo
   - [ ] Status

**Risultati Attesi**:
- [ ] Solo split dell'utente visibili
- [ ] Calcoli corretti
- [ ] Filtri funzionano

---

## ✅ FASE 9: Sistema Payout Batch

### Test 9.1: Creazione Batch Payout

**Obiettivo**: Verificare che admin possa creare batch payout

**Precondizioni**:
- [ ] Account ADMIN
- [ ] Almeno 1 split con status `ELIGIBLE`

**Passi**:
1. [ ] Accedere a `/admin/vault/payouts` come admin
2. [ ] Cliccare "Crea Batch Payout"
3. [ ] Selezionare periodo
4. [ ] Verificare preview beneficiari:
   - [ ] Lista utenti/merchant con split ELIGIBLE
   - [ ] Importi corretti
5. [ ] Cliccare "Crea Batch"
6. [ ] Verificare che batch sia creato con status `CREATED`

**Risultati Attesi**:
- [ ] Batch creato
- [ ] Tutti gli split ELIGIBLE inclusi
- [ ] Status split → `IN_PAYOUT`

---

### Test 9.2: Conferma Pagamento Batch

**Obiettivo**: Verificare che admin possa confermare pagamento batch

**Passi**:
1. [ ] Accedere a `/admin/vault/payouts`
2. [ ] Selezionare batch con status `CREATED`
3. [ ] Cliccare "Conferma Pagamento"
4. [ ] Inserire note (opzionale)
5. [ ] Confermare

**Risultati Attesi**:
- [ ] Batch status → `PAID`
- [ ] Tutti gli split → `PAID`
- [ ] Notifiche beneficiari create
- [ ] Statement aggiornati

---

## 🔒 Test di Sicurezza

### Test S.1: Autorizzazione

**Obiettivo**: Verificare che solo utenti autorizzati possano accedere alle funzionalità

**Test**:
- [ ] Utente normale non può accedere a `/admin/vault/deposits` → 403
- [ ] Utente normale non può accedere a `/merchant/vault/inventory` → 403
- [ ] Merchant può vedere solo carte del suo negozio
- [ ] Utente può vedere solo i suoi depositi
- [ ] HUB_STAFF può vedere tutti i depositi

---

### Test S.2: Validazione Input

**Obiettivo**: Verificare che tutti gli input siano validati

**Test**:
- [ ] Prezzo negativo → Errore
- [ ] Prezzo > 100000 → Errore (o warning)
- [ ] Foto > 5MB → Errore
- [ ] Nome carta vuoto → Errore
- [ ] Condizione non valida → Errore

---

### Test S.3: Race Conditions

**Obiettivo**: Verificare che operazioni concorrenti siano gestite correttamente

**Test**:
- [ ] Due merchant tentano di assegnare stessa carta a stesso slot → Solo uno riesce
- [ ] Due buyer tentano di acquistare stessa carta → Solo uno riesce
- [ ] Due admin tentano di approvare stesso deposito → Solo uno riesce

---

## ⚡ Test di Performance

### Test P.1: Query Ottimizzate

**Obiettivo**: Verificare che query siano ottimizzate

**Test**:
- [ ] Lista depositi con 100+ depositi → < 500ms
- [ ] Lista carte con 1000+ carte → < 1s
- [ ] Marketplace con 500+ listing → < 1s

---

### Test P.2: Paginazione

**Obiettivo**: Verificare che paginazione funzioni correttamente

**Test**:
- [ ] Lista depositi paginata (20 per pagina)
- [ ] Lista carte paginata
- [ ] Marketplace paginato

---

## 📝 Note Finali

- [ ] Tutti i test devono essere eseguiti in ambiente di sviluppo
- [ ] Documentare eventuali bug trovati
- [ ] Verificare che tutti gli audit log siano creati
- [ ] Verificare che tutte le notifiche siano inviate
- [ ] Testare su browser diversi (Chrome, Firefox, Safari)
- [ ] Testare su dispositivi mobili

---

**Buon Testing! 🚀**
