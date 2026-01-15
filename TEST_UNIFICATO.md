# 🧪 TEST UNIFICATO - SafeTrade

**Ultimo Aggiornamento**: 2025-01-27  
**Scopo**: File unificato che raggruppa tutti i test da eseguire per SafeTrade, organizzati per priorità e categoria.

---

## 📊 Indice

1. [✅ Test Fix Recenti (Completati)](#-test-fix-recenti-completati)
2. [🔴 Test Critici (Pre-Produzione)](#-test-critici-pre-produzione)
3. [🛡️ Test Sicurezza](#️-test-sicurezza)
4. [⚡ Test Performance](#-test-performance)
5. [🔄 Test Funzionalità](#-test-funzionalità)
6. [📱 Test Mobile/UI](#-test-mobileui)
7. [🔗 Test Integrazione](#-test-integrazione)
8. [📋 Checklist Pre-Deploy](#-checklist-pre-deploy)

---

## ✅ Test Fix Recenti (Completati)

### **TEST FIX #2: Verifica Email Obbligatoria** ✅
**Priorità**: 🔴 ALTA  
**Stato**: ✅ Implementato

**Test Banner Email Verification**:
- [ ] Banner appare nel dashboard se email non verificata
- [ ] Banner mostra email corretta
- [ ] Bottone "Reinvia email" funziona
- [ ] Banner può essere chiuso (se onDismiss presente)
- [ ] Banner non appare se email già verificata

**Test API Resend Verification**:
- [ ] `POST /api/auth/resend-verification` richiede autenticazione
- [ ] Restituisce errore se email già verificata
- [ ] Invia email di verifica correttamente
- [ ] Gestisce errori Supabase correttamente

**Test Blocco Funzionalità**:
- [ ] Creazione listing bloccata se email non verificata (403)
- [ ] Creazione proposta bloccata se email non verificata (403)
- [ ] Creazione transazione bloccata se email non verificata (403)
- [ ] Messaggi di errore chiari e informativi
- [ ] Utente autenticato ma email non verificata può vedere dashboard

**File da testare**:
- `src/components/auth/EmailVerificationBanner.tsx`
- `src/app/api/auth/resend-verification/route.ts`
- `src/app/api/listings/route.ts` (POST)
- `src/app/api/proposals/route.ts` (POST)
- `src/app/api/transactions/route.ts` (POST)

---

### **TEST BUG #9: Shop Landing Page Error 500** ✅
**Priorità**: 🔴 CRITICA  
**Stato**: ✅ Fix implementato

**Test Null Safety**:
- [ ] Pagina carica correttamente anche se shop non ha promotions
- [ ] Pagina carica correttamente anche se shop non ha images
- [ ] Pagina carica correttamente anche se shop non ha tournaments
- [ ] Pagina carica correttamente anche se listings è array vuoto
- [ ] Pagina carica correttamente anche se item.images è vuoto/null
- [ ] Pagina carica correttamente anche se shop.merchantId è null
- [ ] Nessun errore 500 in console
- [ ] Nessun errore React per proprietà undefined

**Test Edge Cases**:
- [ ] Shop con solo nome (nessun altro dato)
- [ ] Shop con merchantId null
- [ ] Shop con openingHours malformato
- [ ] Shop con coverImage null

**File da testare**:
- `src/app/shops/[slug]/page.tsx`

---

### **TEST BUG #10: Tornei Non Visibili** ✅
**Priorità**: 🔴 ALTA  
**Stato**: ✅ Fix implementato

**Test Filtro Distanza**:
- [ ] Tornei PUBLISHED con data futura sono visibili
- [ ] Tornei con città non riconosciuta vengono mostrati (fallback)
- [ ] Tornei senza shop.city vengono mostrati (fallback)
- [ ] Filtro distanza funziona correttamente quando città è riconosciuta
- [ ] Tornei entro distanza massima vengono mostrati
- [ ] Tornei fuori distanza vengono esclusi (quando città riconosciuta)

**Test Status Tornei**:
- [ ] Solo tornei PUBLISHED, REGISTRATION_CLOSED, IN_PROGRESS sono visibili
- [ ] Tornei DRAFT non sono visibili
- [ ] Tornei CANCELLED non sono visibili
- [ ] Tornei COMPLETED non sono visibili

**Test Data Futura**:
- [ ] Solo tornei con data >= oggi sono visibili (se futureOnly=true)
- [ ] Tornei passati non sono visibili (se futureOnly=true)

**Test API**:
- [ ] `GET /api/tournaments?futureOnly=true` restituisce solo tornei futuri
- [ ] `GET /api/tournaments?filterByDistance=true` filtra correttamente
- [ ] `GET /api/tournaments` senza filtri mostra tutti i tornei PUBLISHED

**File da testare**:
- `src/app/api/tournaments/route.ts`
- `src/components/homepage/TournamentsSection.tsx`

---

### **TEST BUG #11: Auto-Refresh Tornei** ✅
**Priorità**: 🟡 MEDIA  
**Stato**: ✅ Già implementato

**Test Auto-Refresh**:
- [ ] Tornei si aggiornano ogni 30 secondi (polling)
- [ ] Tornei si aggiornano quando tab diventa visibile
- [ ] Tornei si aggiornano quando finestra riceve focus
- [ ] Non ci sono memory leaks (cleanup corretto)
- [ ] Cache busting funziona (timestamp in query)

**Test Performance**:
- [ ] Polling non causa lag o freeze
- [ ] Fetch non blocca UI
- [ ] Errori di fetch non bloccano il componente

**File da testare**:
- `src/components/homepage/TournamentsSection.tsx`

---

### **TEST FIX #3: Rate Limiting API** ✅
**Priorità**: 🔴 ALTA  
**Stato**: ✅ Implementato

**Test Listing Creation Rate Limit**:
- [ ] Creazione 10 listing in 1 ora: OK
- [ ] Creazione 11° listing: 429 Too Many Requests
- [ ] Messaggio errore chiaro con retryAfter
- [ ] Rate limit si resetta dopo 1 ora

**Test Proposal Creation Rate Limit**:
- [ ] Creazione 20 proposte in 1 ora: OK
- [ ] Creazione 21° proposta: 429 Too Many Requests
- [ ] Messaggio errore chiaro con retryAfter
- [ ] Rate limit si resetta dopo 1 ora

**Test Payment Creation Rate Limit**:
- [ ] Creazione 10 pagamenti in 1 ora: OK
- [ ] Creazione 11° pagamento: 429 Too Many Requests
- [ ] Messaggio errore chiaro con retryAfter
- [ ] Rate limit si resetta dopo 1 ora

**Test QR Scan Rate Limit** (già implementato):
- [ ] 20 scansioni QR in 1 ora: OK
- [ ] 21° scansione: 429 Too Many Requests

**Test Payment Operations Rate Limit** (già implementato):
- [ ] 10 hold/release in 1 ora: OK
- [ ] 5 refund in 1 ora: OK
- [ ] Superamento limiti: 429 Too Many Requests

**Test Vault Sales Rate Limit** (già implementato):
- [ ] 50 vendite Vault in 1 ora: OK
- [ ] 51° vendita: 429 Too Many Requests

**Test Transaction Verify Rate Limit** (già implementato):
- [ ] 20 verifiche in 1 ora: OK
- [ ] 21° verifica: 429 Too Many Requests

**Test Isolamento Rate Limit**:
- [ ] Rate limit è per utente (non globale)
- [ ] Utente A può creare 10 listing, Utente B può creare altri 10
- [ ] Rate limit per endpoint è indipendente

**File da testare**:
- `src/lib/rate-limit.ts`
- `src/app/api/listings/route.ts` (POST)
- `src/app/api/proposals/route.ts` (POST)
- `src/app/api/escrow/payments/route.ts` (POST)
- `src/app/api/merchant/verify/scan/route.ts` (POST)
- `src/app/api/escrow/payments/[paymentId]/hold/route.ts` (POST)
- `src/app/api/escrow/payments/[paymentId]/release/route.ts` (POST)
- `src/app/api/escrow/payments/[paymentId]/refund/route.ts` (POST)
- `src/app/api/vault/merchant/sales/route.ts` (POST)
- `src/app/api/transactions/[id]/verify/route.ts` (POST)

---

---

## 🔴 Test Critici (Pre-Produzione)

### **TEST #1: Unicità QR Code** 🔴
**Priorità**: 🔴 ALTA  
**File**: `scripts/test-qr-uniqueness.ts` (da creare)

**Test**:
- [ ] Genera 1000 transazioni simultanee
- [ ] Verifica che tutti i QR siano univoci
- [ ] Tenta di inserire un QR duplicato nel database
- [ ] Conferma che PostgreSQL blocca il duplicato
- [ ] Test con timestamp identici (stesso millisecondo)

**Scenari**:
- Due transazioni nello stesso millisecondo
- 1000 transazioni in parallelo
- Inserimento manuale di duplicato (deve fallire)
- Verifica constraint `@unique` in PostgreSQL

**Risultato atteso**: Tutti i QR devono essere univoci al 100%, database deve bloccare duplicati con errore

---

### **TEST #2: Calcolo Fee** 🔴
**Priorità**: 🔴 ALTA

**Test SELLER**:
- [ ] Prezzo: €100, Fee: 5%, Pagata da: SELLER
- [ ] Acquirente paga: €100
- [ ] Venditore riceve: €95
- [ ] Fee merchant: €5

**Test BUYER**:
- [ ] Prezzo: €100, Fee: 5%, Pagata da: BUYER
- [ ] Acquirente paga: €105
- [ ] Venditore riceve: €100
- [ ] Fee merchant: €5

**Test SPLIT**:
- [ ] Prezzo: €100, Fee: 5%, Pagata da: SPLIT
- [ ] Acquirente paga: €102.50
- [ ] Venditore riceve: €97.50
- [ ] Fee merchant: €5 (€2.50 da ognuno)

**Test Arrotondamento**:
- [ ] Prezzo: €10.33, Fee 5% = €0.5165 → Verifica arrotondamento
- [ ] Prezzo: €0.99, Fee 5% = €0.0495 → Verifica arrotondamento
- [ ] Prezzo: €999.99, Fee 5% = €49.9995 → Verifica arrotondamento
- [ ] Verifica: Acquirente + Venditore + Fee = Prezzo originale (no perdite)
- [ ] Arrotondamento sempre a 2 decimali

---

### **TEST #3: Flow Completo End-to-End** 🔴
**Priorità**: 🔴 ALTA

**Flow**:
1. [ ] Buyer crea listing
2. [ ] Seller fa proposta
3. [ ] Buyer accetta proposta
4. [ ] Sistema genera QR
5. [ ] Merchant scansiona QR
6. [ ] Merchant verifica e completa
7. [ ] Admin approva rilascio fondi (PendingRelease)
8. [ ] Fondi rilasciati correttamente

**Verifica ogni step**:
- [ ] Notifiche inviate
- [ ] QR generato
- [ ] Calcoli corretti
- [ ] Stato listing aggiornato
- [ ] EscrowPayment creato automaticamente
- [ ] PendingRelease creato per rilascio fondi

---

### **TEST #4: Transazione Rifiutata** 🔴
**Priorità**: 🔴 ALTA

**Test**:
- [ ] Merchant rifiuta transazione
- [ ] Listing torna disponibile (`isActive=true`, `isSold=false`)
- [ ] Payment rimborsato (via PendingRelease, non direttamente)
- [ ] Notifiche inviate a buyer e seller
- [ ] Transazione marcata come `CANCELLED`

---

### **TEST #5: Doppia Accettazione** 🔴
**Priorità**: 🔴 ALTA

**Test**:
- [ ] Due utenti accettano la stessa proposta simultaneamente
- [ ] Solo il primo deve avere successo
- [ ] Il secondo deve ricevere errore
- [ ] Verifica integrità database (no duplicati)

---

### **TEST #6: Payment Creato Automaticamente** 🔴
**Priorità**: 🔴 ALTA (BUG #1 Fix)

**Test**:
- [ ] Quando viene creata una transazione, `EscrowPayment` viene creato automaticamente
- [ ] Status payment: `PENDING` (per escrow fisico)
- [ ] Amount corrisponde a `escrowSession.totalAmount`
- [ ] PaymentMethod: `CASH`
- [ ] `paymentInitiatedAt` impostato correttamente

---

### **TEST #7: Rimborso via PendingRelease** 🔴
**Priorità**: 🔴 ALTA (BUG #2 Fix)

**Test**:
- [ ] Quando merchant rifiuta transazione, viene creato `PendingRelease` tipo `REFUND_FULL`
- [ ] Admin deve approvare rimborso (doppia conferma)
- [ ] Payment NON viene rimborsato direttamente
- [ ] Notifiche inviate correttamente

---

### **TEST #8: Transazione Non Verificata Più Volte** 🔴
**Priorità**: 🔴 ALTA (BUG #3 Fix)

**Test**:
- [ ] Transazione già `COMPLETED` non può essere verificata di nuovo
- [ ] Transazione già `CANCELLED` non può essere verificata
- [ ] Se esiste già `PendingRelease` per questa transazione, ritorna errore
- [ ] Verifica stato transazione prima di ogni modifica

---

## 🛡️ Test Sicurezza

### **TEST #9: Autenticazione QR** 🔴
**Priorità**: 🔴 ALTA

**Test**:
- [ ] Utente non autenticato tenta scansione → Errore 401
- [ ] Merchant scansiona QR di altro negozio → Errore 403
- [ ] Utente normale tenta scansione → Errore 403
- [ ] Admin può scannerizzare → OK
- [ ] Solo merchant autorizzato può gestire la propria transazione

---

### **TEST #10: Manipolazione Fee** 🔴
**Priorità**: 🔴 ALTA

**Test**:
- [ ] Tentativo di modificare `feePaidBy` via API → Bloccato
- [ ] Tentativo di modificare `totalAmount` via API → Bloccato
- [ ] Tentativo di bypass calcolo fee → Bloccato
- [ ] SQL injection nei campi prezzo → Bloccato
- [ ] Fee calcolate sempre server-side

---

### **TEST #11: SQL Injection** 🔴
**Priorità**: 🔴 ALTA

**Test Query Parameters**:
- [ ] `'; DROP TABLE users; --` → Bloccato
- [ ] `1' OR '1'='1` → Bloccato
- [ ] `1'; DELETE FROM transactions; --` → Bloccato

**Test Body Parameters**:
- [ ] Input maliziosi nel body JSON → Bloccato
- [ ] Prisma ORM protegge automaticamente

---

### **TEST #12: XSS Protection** 🔴
**Priorità**: 🔴 ALTA

**Test**:
- [ ] `<script>alert("XSS")</script>` → Sanitizzato
- [ ] `<img src=x onerror=alert(1)>` → Sanitizzato
- [ ] React sanitizza automaticamente output
- [ ] Input in form proposta → Sanitizzato
- [ ] Messaggi chat → Sanitizzati

---

### **TEST #13: Authentication Bypass** 🔴
**Priorità**: 🔴 ALTA

**Test**:
- [ ] Accesso a `/api/admin/stats` senza autenticazione → Errore 401
- [ ] Accesso a `/api/merchant/verify/scan` senza autenticazione → Errore 401
- [ ] Accesso a route protette senza token → Errore 401
- [ ] Token scaduto → Errore 401

---

### **TEST #14: Authorization Bypass** 🔴
**Priorità**: 🔴 ALTA

**Test**:
- [ ] Utente normale accede a route admin → Errore 403
- [ ] Merchant accede a route di altro merchant → Errore 403
- [ ] Utente accede a risorse di altri utenti → Errore 403
- [ ] IDOR (Insecure Direct Object Reference) → Bloccato

---

### **TEST #15: Input Validation** 🔴
**Priorità**: 🔴 ALTA

**Test Data Types**:
- [ ] Invio di tipi errati (number invece di string) → Errore 400
- [ ] Stringa invece di numero → Errore 400
- [ ] Array invece di oggetto → Errore 400

**Test Boundary Values**:
- [ ] Stringhe troppo lunghe (> 255 caratteri) → Errore 400
- [ ] Valori negativi dove non permessi → Errore 400
- [ ] Valori troppo grandi → Errore 400
- [ ] QR code formato non valido → Errore 400

---

### **TEST #16: Rate Limiting** 🔴
**Priorità**: 🔴 ALTA

**Test**:
- [ ] Invio di molte richieste rapidamente → Bloccato dopo limite
- [ ] `/api/merchant/verify/scan`: max 20/ora per merchant
- [ ] `/api/escrow/payments/*/hold`: max 10/ora per merchant
- [ ] `/api/escrow/payments/*/release`: max 10/ora per merchant
- [ ] `/api/escrow/payments/*/refund`: max 5/ora per merchant
- [ ] IP bloccato temporaneamente se supera limiti

---

### **TEST #17: Error Handling** 🔴
**Priorità**: 🔴 ALTA

**Test**:
- [ ] Errori non espongono informazioni sensibili
- [ ] Stack traces non sono esposti in produzione
- [ ] Messaggi di errore generici per utenti
- [ ] Log dettagliati per admin

---

### **TEST #18: Logging Tentativi Non Autorizzati** 🔴
**Priorità**: 🔴 ALTA (SECURITY #4)

**Test**:
- [ ] Tentativo scansione QR non autorizzato → Loggato
- [ ] Tentativo accesso payment non autorizzato → Loggato
- [ ] Alert admin se > 5 tentativi falliti in 10 minuti
- [ ] Dashboard admin mostra tentativi sospetti

---

### **TEST #19: Validazione QR Code** 🔴
**Priorità**: 🔴 ALTA (SECURITY #5)

**Test**:
- [ ] QR code formato valido → Accettato
- [ ] QR code formato non valido → Errore 400
- [ ] QR code troppo lungo (> 255 caratteri) → Errore 400
- [ ] QR code contiene script injection → Bloccato
- [ ] QR code esiste nel database → Verificato

---

### **TEST #20: Protezione Race Conditions** 🔴
**Priorità**: 🔴 ALTA (SECURITY #12)

**Test**:
- [ ] Due merchant scansionano stesso QR simultaneamente → Solo uno ha successo
- [ ] Lock su QR code quando viene scansionato
- [ ] Verifica che QR non sia già stato scansionato
- [ ] Database transactions atomiche

---

### **TEST #21: Protezione Replay Attacks** 🔴
**Priorità**: 🔴 ALTA (SECURITY #14)

**Test**:
- [ ] QR code già scansionato non può essere riutilizzato
- [ ] `qrScannedAt` tracciato correttamente
- [ ] Bloccare QR dopo prima scansione
- [ ] Timestamp e nonce nel QR code

---

### **TEST #22: Validazione Importi** 🔴
**Priorità**: 🔴 ALTA (SECURITY #15)

**Test**:
- [ ] Amount non negativo o zero → Errore 400
- [ ] Amount non supera limite ragionevole (€100,000) → Errore 400
- [ ] Amount corrisponde a quello nella sessione escrow
- [ ] Arrotondamento a 2 decimali sempre

---

## ⚡ Test Performance

### **TEST #23: Caricamento Pagine** 🟡
**Priorità**: 🟡 MEDIA

**Target**:
- [ ] Marketplace: < 2 secondi
- [ ] Listing detail: < 1 secondo
- [ ] Form proposta: < 1 secondo
- [ ] QR code page: < 0.5 secondi
- [ ] Dashboard admin: < 2 secondi
- [ ] Dashboard merchant: < 2 secondi

---

### **TEST #24: Database Query** 🟡
**Priorità**: 🟡 MEDIA

**Test**:
- [ ] Query listings con 10,000 record → < 1 secondo
- [ ] Query transazioni con 1,000 record → < 1 secondo
- [ ] Join complessi (listing + user + proposal) → < 1 secondo
- [ ] Indexes configurati correttamente
- [ ] Query ottimizzate (no N+1)

---

### **TEST #25: Load Test - Concurrent Requests** 🟡
**Priorità**: 🟡 MEDIA

**Test**:
- [ ] 50 richieste concorrenti → ≥ 95% successo
- [ ] 100 richieste concorrenti → ≥ 90% successo
- [ ] Database connection pool funziona
- [ ] Nessun timeout o crash

---

### **TEST #26: Memory Usage** 🟡
**Priorità**: 🟡 MEDIA

**Test**:
- [ ] Monitora uso memoria durante 1000 iterazioni
- [ ] Verifica assenza di memory leaks
- [ ] Memory increase < 50MB dopo 1000 iterazioni

---

### **TEST #27: API Endpoint Availability** 🟡
**Priorità**: 🟡 MEDIA

**Test**:
- [ ] Tutti gli endpoint principali disponibili
- [ ] Response time per ogni endpoint < 1 secondo
- [ ] Nessun endpoint ritorna 500

---

### **TEST #28: Large Payload Handling** 🟡
**Priorità**: 🟡 MEDIA

**Test**:
- [ ] Upload immagine 10MB → Gestito correttamente
- [ ] Upload 5 immagini simultanee → Gestito correttamente
- [ ] Payload JSON molto grande → Gestito correttamente
- [ ] Sistema non crascha con input molto grandi

---

## 🔄 Test Funzionalità

### **TEST #29: Sistema Disputes** 🟡
**Priorità**: 🟡 MEDIA

**Dashboard Admin Disputes** (`/admin/disputes`):
- [ ] Pagina carica correttamente
- [ ] Statistiche visualizzate (OPEN, SELLER_RESPONSE, etc.)
- [ ] Filtri per stato funzionano
- [ ] Lista dispute visualizzata
- [ ] Pagination funziona

**Dettagli Disputa** (`/disputes/[id]`):
- [ ] Pagina carica correttamente
- [ ] Info disputa visualizzate
- [ ] Chat/messaggi funzionano
- [ ] Foto allegate visualizzate
- [ ] Azioni contestuali visibili (respond, escalate, resolve)
- [ ] Modal risoluzione funziona

**API Disputes**:
- [ ] `POST /api/transactions/[id]/dispute` - Apertura disputa
- [ ] `GET /api/disputes` - Lista dispute
- [ ] `GET /api/disputes/[id]` - Dettagli disputa
- [ ] `PATCH /api/disputes/[id]` - Azioni (respond, escalate, mediate, resolve)
- [ ] `GET /api/disputes/[id]/messages` - Lista messaggi
- [ ] `POST /api/disputes/[id]/messages` - Invia messaggio

---

### **TEST #30: Hub Escrow Admin** 🟡
**Priorità**: 🟡 MEDIA

**Dashboard Hub** (`/admin/hub`):
- [ ] Hub creato automaticamente
- [ ] Statistiche pacchi visualizzate
- [ ] Lista pacchi visualizzata
- [ ] Filtri per stato funzionano
- [ ] Azioni pacchi (ricevi, verifica, spedisci) funzionano
- [ ] Modal verifica con upload foto funziona
- [ ] Modal spedizione con tracking funziona

**API Hub Admin**:
- [ ] `GET /api/admin/hub` - Hub auto-create
- [ ] `GET /api/admin/hub/packages` - Lista pacchi
- [ ] `PATCH /api/admin/hub/packages/[id]` - Azioni pacchi

---

### **TEST #31: Approvazioni Manuali (PendingRelease)** 🟡
**Priorità**: 🟡 MEDIA

**Dashboard Pending Releases** (`/admin/pending-releases`):
- [ ] Pagina carica correttamente
- [ ] Lista pending releases visualizzata
- [ ] Filtri funzionano
- [ ] Statistiche visualizzate
- [ ] Doppia conferma funziona ("Sì, sono sicuro!")
- [ ] Rifiuto funziona

**API Pending Releases**:
- [ ] `GET /api/admin/pending-releases` - Lista
- [ ] `GET /api/admin/pending-releases/[id]` - Dettagli
- [ ] `POST /api/admin/pending-releases/[id]/initiate-approval` - Inizia approvazione
- [ ] `POST /api/admin/pending-releases/[id]/confirm-approval` - Conferma (doppia)
- [ ] `POST /api/admin/pending-releases/[id]/reject` - Rifiuta

---

### **TEST #32: Audit Log** 🟡
**Priorità**: 🟡 MEDIA

**Audit Log** (`/admin/audit-log`):
- [ ] Pagina carica correttamente
- [ ] Log visualizzati
- [ ] Filtri funzionano
- [ ] Log per operazioni escrow
- [ ] Log per operazioni payment
- [ ] Log per tentativi accesso non autorizzati

---

### **TEST #33: Assicurazione Pacchi** 🟡
**Priorità**: 🟡 MEDIA

**API Assicurazione**:
- [ ] `POST /api/transactions/[id]/insurance` - Crea assicurazione
- [ ] `GET /api/transactions/[id]/insurance` - Dettagli assicurazione
- [ ] `GET /api/transactions/[id]/insurance/calculate` - Preview premio
- [ ] `POST /api/insurance/[id]/claim` - Apri sinistro
- [ ] `PATCH /api/insurance/[id]/claim` - Aggiorna sinistro
- [ ] `POST /api/insurance/[id]/settle` - Risolvi sinistro (Admin)
- [ ] `GET /api/admin/insurance` - Lista assicurazioni (Admin)

**Calcoli Assicurazione**:
- [ ] Premio = valore × 2% × fattore_rischio
- [ ] Fattore rischio calcolato (storia buyer/seller, dispute, valore)
- [ ] Limite massimo rimborso rispettato

**Workflow Sinistro**:
- [ ] Apertura sinistro crea notifica admin
- [ ] Risoluzione sinistro crea PendingRelease
- [ ] Rimborso richiede doppia approvazione (via PendingRelease)

---

### **TEST #34: Listing Management** 🟡
**Priorità**: 🟡 MEDIA

**Listing Venduto**:
- [ ] Listing venduto → `isSold = true`, `isActive = false`
- [ ] Non appare più in marketplace
- [ ] Non accetta nuove proposte
- [ ] Visibile in "Mie vendite completate"

**Listing Ripristinato**:
- [ ] Transazione cancellata/rifiutata
- [ ] Listing torna disponibile: `isSold = false`, `isActive = true`
- [ ] Riappare in marketplace
- [ ] Accetta nuove proposte

**Listing con Multiple Proposte**:
- [ ] Listing ha 3 proposte pending
- [ ] Venditore accetta proposta #2
- [ ] Proposta #1 e #3 auto-rifiutate
- [ ] Notifiche inviate agli altri utenti

---

### **TEST #35: Modifica Prezzo al Negozio** 🟡
**Priorità**: 🟡 MEDIA

**Scenario**:
- [ ] Prezzo concordato: €100
- [ ] Merchant modifica a: €90
- [ ] Fee ricalcolata automaticamente
- [ ] Nuova fee: €4.50 (5% di €90)
- [ ] Se SELLER: Venditore riceve €85.50
- [ ] Se BUYER: Acquirente paga €94.50
- [ ] Se SPLIT: Acquirente €92.25, Venditore €87.75

---

### **TEST #36: Scansione QR Code** 🟡
**Priorità**: 🟡 MEDIA

**QR Valido**:
- [ ] Merchant scansiona QR corretto
- [ ] Mostra dettagli transazione
- [ ] Permette conferma/rifiuto

**QR Già Scansionato**:
- [ ] Merchant scansiona QR già usato
- [ ] Mostra messaggio "Già scannerizzato"
- [ ] Mostra data/ora prima scansione

**QR Inesistente**:
- [ ] Merchant scansiona QR fake
- [ ] Mostra errore "QR non valido"
- [ ] Non crasha l'app

**QR Scaduto**:
- [ ] Transazione completata/cancellata
- [ ] Mostra stato transazione
- [ ] Non permette modifiche

---

### **TEST #37: Notifiche** 🟡
**Priorità**: 🟡 MEDIA

**Test**:
- [ ] Notifica proposta ricevuta
- [ ] Notifica proposta accettata
- [ ] Notifica appuntamento confermato
- [ ] Notifica QR generato
- [ ] Notifica transazione completata
- [ ] Notifica transazione rifiutata
- [ ] Notifica PendingRelease creato
- [ ] Notifica fondi rilasciati
- [ ] Badge notifiche nel header visibile
- [ ] Notifiche caricate correttamente
- [ ] Click notifica funziona

---

### **TEST #38: Vault System** 🟡
**Priorità**: 🟡 MEDIA

**Vault Deposits**:
- [ ] Utente crea deposit
- [ ] Hub riceve deposit
- [ ] Hub verifica e approva
- [ ] Carte assegnate a shop

**Vault Cases**:
- [ ] Admin crea case
- [ ] Admin autorizza shop
- [ ] Merchant richiede case
- [ ] QR codes generati per slots

**Vault Sales**:
- [ ] Merchant registra vendita fisica
- [ ] Split calcolato correttamente (70/20/10)
- [ ] Notifiche inviate
- [ ] Audit log creato

**Vault Orders**:
- [ ] Buyer crea ordine online
- [ ] Item riservato (RESERVED)
- [ ] Payment processato
- [ ] Merchant completa ordine
- [ ] Tracking aggiornato

---

## 📱 Test Mobile/UI

### **TEST #39: Responsive Design** 🟡
**Priorità**: 🟡 MEDIA

**Device da testare**:
- [ ] iPhone SE (piccolo)
- [ ] iPhone 12 Pro (medio)
- [ ] iPad (tablet)
- [ ] Android vari

**Verifica**:
- [ ] Form leggibili
- [ ] QR ben visibile
- [ ] Bottoni cliccabili
- [ ] No overflow testo
- [ ] Menu mobile funziona
- [ ] Immagini responsive

---

### **TEST #40: Form Proposta** 🟡
**Priorità**: 🟡 MEDIA

**Verifica**:
- [ ] Prezzo = 0 → Errore
- [ ] Prezzo negativo → Errore
- [ ] Prezzo con lettere → Errore
- [ ] Prezzo troppo alto (>€10000) → Warning
- [ ] Selezione fee visibile e chiara
- [ ] Calcoli in tempo reale corretti

---

### **TEST #41: Pagina QR Code** 🟡
**Priorità**: 🟡 MEDIA

**Verifica**:
- [ ] QR visibile e grande
- [ ] Pulsante Download funziona
- [ ] Pulsante Stampa funziona
- [ ] Breakdown pagamento chiaro
- [ ] Responsive su mobile

---

### **TEST #42: Fotocamera QR** 🔵
**Priorità**: 🔵 BASSA

**Test futuro**:
- [ ] Scansione QR da fotocamera
- [ ] Funziona con luce scarsa?
- [ ] Funziona con QR stampato male?

---

## 🔗 Test Integrazione

### **TEST #43: Supabase Auth** 🔴
**Priorità**: 🔴 ALTA

**Verifica**:
- [ ] Login funziona
- [ ] Logout pulisce sessione
- [ ] Token refresh automatico
- [ ] Session sync tra tab
- [ ] Email verification funziona

---

### **TEST #44: Prisma Database** 🔴
**Priorità**: 🔴 ALTA

**Verifica**:
- [ ] Migrations funzionano
- [ ] Constraints rispettati
- [ ] Cascade delete corretti
- [ ] No orphan records
- [ ] Foreign keys funzionano

---

### **TEST #45: Transaction Rollback** 🟡
**Priorità**: 🟡 MEDIA

**Test**:
- [ ] Transazioni fanno rollback correttamente
- [ ] Integrità dati dopo errori
- [ ] Nessun dato parziale salvato

---

### **TEST #46: Error Recovery** 🟡
**Priorità**: 🟡 MEDIA

**Test**:
- [ ] Sistema si riprende da errori
- [ ] Richieste valide funzionano dopo errori
- [ ] Nessun crash permanente

---

## 📋 Checklist Pre-Deploy

### Test Critici (OBBLIGATORI)
- [ ] TEST #1: Unicità QR Code
- [ ] TEST #2: Calcolo Fee (SELLER/BUYER/SPLIT)
- [ ] TEST #3: Flow Completo End-to-End
- [ ] TEST #4: Transazione Rifiutata
- [ ] TEST #5: Doppia Accettazione
- [ ] TEST #6: Payment Creato Automaticamente
- [ ] TEST #7: Rimborso via PendingRelease
- [ ] TEST #8: Transazione Non Verificata Più Volte
- [ ] TEST #9: Autenticazione QR
- [ ] TEST #10: Manipolazione Fee
- [ ] TEST #11: SQL Injection
- [ ] TEST #12: XSS Protection
- [ ] TEST #13: Authentication Bypass
- [ ] TEST #14: Authorization Bypass
- [ ] TEST #15: Input Validation
- [ ] TEST #43: Supabase Auth
- [ ] TEST #44: Prisma Database

### Test Sicurezza (OBBLIGATORI)
- [ ] TEST #16: Rate Limiting
- [ ] TEST #17: Error Handling
- [ ] TEST #18: Logging Tentativi Non Autorizzati
- [ ] TEST #19: Validazione QR Code
- [ ] TEST #20: Protezione Race Conditions
- [ ] TEST #21: Protezione Replay Attacks
- [ ] TEST #22: Validazione Importi

### Test Performance (RACCOMANDATI)
- [ ] TEST #23: Caricamento Pagine
- [ ] TEST #24: Database Query
- [ ] TEST #25: Load Test
- [ ] TEST #26: Memory Usage

### Test Funzionalità (RACCOMANDATI)
- [ ] TEST #29: Sistema Disputes
- [ ] TEST #30: Hub Escrow Admin
- [ ] TEST #31: Approvazioni Manuali
- [ ] TEST #32: Audit Log
- [ ] TEST #33: Assicurazione Pacchi
- [ ] TEST #34: Listing Management
- [ ] TEST #36: Scansione QR Code
- [ ] TEST #37: Notifiche

### Test Mobile/UI (OPZIONALI)
- [ ] TEST #39: Responsive Design
- [ ] TEST #40: Form Proposta
- [ ] TEST #41: Pagina QR Code

---

## 🎯 Metriche Target

| Test | Target |
|------|--------|
| API Response Time | < 1 secondo |
| Database Query Time | < 1 secondo |
| Concurrent Requests Success Rate | ≥ 95% |
| Memory Increase (1000 iterazioni) | < 50MB |
| Endpoint Availability | 100% |
| Marketplace Load Time | < 2 secondi |
| Listing Detail Load Time | < 1 secondo |
| QR Code Page Load Time | < 0.5 secondi |

---

## 🚀 Esecuzione Test

### Prerequisiti
1. Server di sviluppo in esecuzione: `npm run dev`
2. Database configurato e migrato
3. Variabili d'ambiente configurate

### Comandi Disponibili

```bash
# Tutti i test
npm run test:all

# Solo test di sicurezza
npm run test:security

# Solo test di stabilità
npm run test:stability
```

### Script da Creare

1. **`scripts/test-qr-uniqueness.ts`** - Test generazione 1000 QR simultanei
2. **`scripts/test-fee-calculation.ts`** - Test tutti i casi SELLER/BUYER/SPLIT
3. **`scripts/test-transaction-flow.ts`** - Test flow completo end-to-end
4. **`scripts/test-concurrency.ts`** - Test race conditions
5. **`scripts/test-security.ts`** - Test SQL injection, XSS, autenticazione

---

## 📊 Report Test

Dopo l'esecuzione, viene generato un report completo in `TEST_SECURITY_REPORT.md` che include:
- Summary dei risultati
- Dettagli di ogni test
- Metriche di performance
- Raccomandazioni

---

## ⚠️ Note Importanti

### Prima del Deploy
1. **Esegui tutti i test critici** e verifica che passino
2. **Rivedi il report** generato
3. **Correggi eventuali problemi** identificati
4. **Esegui test su ambiente staging** se disponibile

### Test in Produzione
⚠️ **NON eseguire questi test direttamente su produzione!**

I test includono tentativi di SQL injection e altri attacchi che potrebbero:
- Generare log di sicurezza
- Creare confusione nei monitoraggi
- Potenzialmente causare problemi se non gestiti correttamente

### Ambiente di Test Consigliato
- **Locale**: `http://localhost:3000` (sviluppo)
- **Staging**: Ambiente separato identico a produzione
- **Produzione**: Solo test non invasivi (endpoint availability, performance base)

---

## 🔗 File Originali Raggruppati

Questo file unifica i seguenti documenti:
- `TEST_CHECKLIST.md` - Checklist test funzionalità
- `TEST_COMPLETE.md` - Risultati test completati
- `TECNICO/TESTDAFARE.md` - Test da fare dettagliati
- `TEST_SECURITY_README.md` - Test sicurezza
- `TEST_SECURITY_QUICK_START.md` - Quick start test sicurezza
- `TODO_UNIFICATO.md` - Sezione test

---

**Ultimo aggiornamento**: 2025-01-XX  
**Prossimo aggiornamento**: Dopo completamento implementazione bug fix

