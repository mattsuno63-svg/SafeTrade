# 🧪 TEST: AUTOMATICI vs MANUALI

**Ultimo Aggiornamento**: 2025-01-27  
**Scopo**: Classificazione test che possono essere automatizzati (eseguiti da AI) vs test che richiedono interazione manuale

---

## 🤖 TEST AUTOMATICI (Posso Eseguirli Io)

Questi test possono essere eseguiti automaticamente tramite script, API calls, o verifiche del codice.

### ✅ TEST #1: Build e Compilazione

**Posso eseguire automaticamente**:
- [x] `npm run build` - verifica build senza errori
- [x] `npm run lint` - verifica linting senza errori
- [x] `npx tsc --noEmit` - verifica TypeScript senza errori
- [x] Verifica import mancanti
- [x] Verifica sintassi corretta
- [x] Verifica type errors

**Comandi**:
```bash
npm run build
npm run lint
npx tsc --noEmit
```

**Stato**: ✅ **PRONTO** - Posso eseguire ora

---

### ✅ TEST #2: Sicurezza API (HTTP Tests)

**Posso eseguire automaticamente** tramite API calls:
- [x] Utente non autenticato → errore 401
- [x] Utente non autorizzato → errore 403
- [x] Merchant tenta accesso risorsa altro merchant → errore 403
- [x] Rate limiting funziona (429 quando superato)
- [x] Validazione input (400 su dati invalidi)
- [x] SQL injection prevention (test pattern pericolosi)
- [x] XSS prevention (test script injection)

**Script**: `scripts/security-tests.ts`

**Stato**: ✅ **PRONTO** - Posso creare script di test

**Esempi di test che posso fare**:
```typescript
// Test 401 Unauthorized
GET /api/transactions → 401 (no auth)

// Test 403 Forbidden
GET /api/admin/users → 403 (user non admin)

// Test Rate Limiting
POST /api/transactions (11 volte) → 429 (limite superato)

// Test SQL Injection
POST /api/listings → { title: "'; DROP TABLE users; --" } → 400
```

---

### ✅ TEST #3: Database Schema e Migrations

**Posso eseguire automaticamente**:
- [x] Verifica schema Prisma corretto
- [x] Verifica migrations applicabili
- [x] Verifica tabelle create correttamente
- [x] Verifica relazioni database
- [x] Verifica indici e constraint
- [x] Test seed dati base

**Comandi**:
```bash
npx prisma validate
npx prisma migrate status
npx prisma db push --dry-run
npx tsx prisma/seed.ts
```

**Stato**: ✅ **PRONTO** - Posso verificare schema e migrations

---

### ✅ TEST #4: API Endpoints Funzionali

**Posso testare automaticamente** tramite HTTP requests:
- [x] POST /api/listings - crea listing
- [x] GET /api/listings - lista listings
- [x] POST /api/proposals - crea proposta
- [x] POST /api/transactions - crea transazione
- [x] POST /api/community/posts - crea post
- [x] POST /api/community/posts/[id]/vote - vota post
- [x] GET /api/community/posts - lista post con filtri

**Script**: Posso creare script di test automatici

**Stato**: ⚠️ **DA CREARE** - Posso creare script di test

**Esempi**:
```typescript
// Test creazione listing
POST /api/listings
{ title, description, price, game } → 201

// Test filtri community
GET /api/community/posts?sort=hot → 200
GET /api/community/posts?topic=slug → 200
```

---

### ✅ TEST #5: Validazione Dati e Business Logic

**Posso verificare automaticamente**:
- [x] Validazione feePercentage (0-20%)
- [x] Validazione feePaidBy (SELLER/BUYER/SPLIT)
- [x] Validazione amount (positivo, limiti, decimali)
- [x] Validazione QR code format
- [x] Verifica stato transazione (COMPLETED non modificabile)
- [x] Verifica duplicati (PendingRelease esistente)

**Stato**: ✅ **IMPLEMENTATO** - Verificabile via test automatici

---

### ✅ TEST #6: Rate Limiting

**Posso testare automaticamente**:
- [x] Rate limit `/api/transactions` (10/ora)
- [x] Rate limit `/api/merchant/verify/scan` (20/ora)
- [x] Rate limit `/api/escrow/payments/*/hold` (10/ora)
- [x] Rate limit `/api/escrow/payments/*/release` (10/ora)
- [x] Rate limit `/api/escrow/payments/*/refund` (5/ora)
- [x] Rate limit `/api/transactions/[id]/verify` (20/ora)

**Script**: Posso creare test che fanno N+1 richieste

**Stato**: ✅ **PRONTO** - Posso testare con script automatici

---

### ✅ TEST #7: Database Integrity

**Posso verificare automaticamente**:
- [x] Foreign key constraints
- [x] Unique constraints
- [x] Not null constraints
- [x] Check constraints
- [x] Cascade deletes

**Stato**: ✅ **PRONTO** - Verificabile con Prisma validate

---

## 👤 TEST MANUALI (Devi Eseguirli Tu)

Questi test richiedono interazione umana, visuale, o uso di browser reale.

### 🔴 TEST #1: Flow End-to-End Completo (MANUALE)

**Devi eseguire tu**:
1. [ ] Utente crea account e verifica email
2. [ ] Utente crea listing (inserisci dati form)
3. [ ] Altro utente fa proposta (inserisci prezzo)
4. [ ] Proposta viene accettata (click bottone)
5. [ ] Transazione SafeTrade creata (seleziona shop/appuntamento)
6. [ ] QR code generato correttamente (verifica visivamente)
7. [ ] Merchant scansiona QR (scansiona con telefono/app)
8. [ ] Transazione completata (verifica stato)
9. [ ] Fondi rilasciati (verifica PendingRelease)

**Perché manuale**: Richiede login utenti multipli, inserimento dati form, click UI, scansione QR fisica

**Tempo stimato**: 30-60 minuti

**Stato**: 🔴 **MANUALE** - Richiede interazione utente

---

### 🔴 TEST #2: UI/UX e Visual Design (MANUALE)

**Devi verificare tu**:
- [ ] Layout pagine corretti
- [ ] Immagini caricano correttamente
- [ ] Form sono leggibili e usabili
- [ ] Bottoni sono cliccabili e visibili
- [ ] Menu/navbar funziona correttamente
- [ ] Colori e stili sono corretti
- [ ] Font e dimensioni leggibili
- [ ] Spaziature corrette
- [ ] Loading states funzionano
- [ ] Error messages sono chiari

**Perché manuale**: Richiede verifica visiva e interazione con UI

**Tempo stimato**: 1-2 ore

**Stato**: 🔴 **MANUALE** - Richiede verifica visiva

---

### 🔴 TEST #3: Community Reddit-Style (MANUALE)

**Devi testare tu**:
- [ ] Creazione subreddit (form funziona)
- [ ] Creazione thread (editor funziona)
- [ ] Sistema voti (click upvote/downvote funziona)
- [ ] Filtri (Hot, New, Top, Rising) cambiano risultati visivamente
- [ ] Commenti (editor commenti funziona)
- [ ] Premium topics bloccati (messaggio corretto)

**Perché manuale**: Richiede click UI, verifica visiva cambiamenti, interazione form

**Tempo stimato**: 30-60 minuti

**Stato**: 🔴 **MANUALE** - Richiede interazione UI

---

### 🔴 TEST #4: Merchant Dashboard (MANUALE)

**Devi testare tu**:
- [ ] Setup shop completo (form multi-step)
- [ ] Gestione inventory (upload immagini, form)
- [ ] Creazione tornei (datepicker, form)
- [ ] Gestione appointments (calendario, orari)
- [ ] Pagina dettaglio torneo (bottoni avvia/fine, form vincitori)
- [ ] Vault scan (scansione QR, verifica visiva)
- [ ] Tutti i link e bottoni funzionano (navigazione)

**Perché manuale**: Richiede form complessi, upload file, datepicker, scansione QR, navigazione

**Tempo stimato**: 1-2 ore

**Stato**: 🔴 **MANUALE** - Richiede interazione completa

---

### 🔴 TEST #5: Mobile Responsive (MANUALE)

**Devi testare tu**:
- [ ] iPhone (piccolo) - layout corretto
- [ ] iPad (tablet) - layout corretto
- [ ] Android vari - layout corretto
- [ ] Form leggibili su mobile
- [ ] Bottoni cliccabili su mobile
- [ ] No overflow testo
- [ ] Menu mobile funziona
- [ ] Touch gestures funzionano

**Perché manuale**: Richiede device fisici o browser dev tools mobile, verifica visiva

**Tempo stimato**: 1-2 ore

**Stato**: 🔴 **MANUALE** - Richiede device fisici o emulatori

---

### 🔴 TEST #6: Performance Pagine (SEMI-AUTOMATICO)

**Posso misurare**:
- [x] Tempo caricamento (via Lighthouse API)
- [x] Bundle size (via build)
- [x] Query database count (via logging)

**Devi verificare tu**:
- [ ] Homepage carica velocemente (< 2s percepito)
- [ ] Marketplace carica velocemente (< 2s percepito)
- [ ] Dashboard carica velocemente (< 2s percepito)
- [ ] Community carica velocemente (< 2s percepito)
- [ ] Animazioni sono fluide
- [ ] No lag durante scroll
- [ ] No lag durante interazione

**Tempo stimato**: 30 minuti

**Stato**: 🟡 **SEMI-AUTOMATICO** - Posso misurare, tu verifichi percezione

---

### 🔴 TEST #7: Browser Compatibility (MANUALE)

**Devi testare tu**:
- [ ] Chrome (ultima versione)
- [ ] Firefox (ultima versione)
- [ ] Safari (ultima versione)
- [ ] Edge (ultima versione)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

**Perché manuale**: Richiede browser fisici, verifica visiva comportamenti

**Tempo stimato**: 2-3 ore

**Stato**: 🔴 **MANUALE** - Richiede browser multipli

---

## 📋 RIEPILOGO

### 🤖 Test Automatici (Posso Io) - **~15 test**
- ✅ Build e compilazione (3 test)
- ✅ Sicurezza API (7+ test)
- ✅ Database schema (5+ test)
- ✅ Rate limiting (6+ test)
- ✅ Validazione dati (5+ test)

**Tempo totale automatico**: ~5-10 minuti

---

### 👤 Test Manuali (Devi Tu) - **~25 test**
- 🔴 Flow end-to-end (9 step)
- 🔴 UI/UX visual (10+ verifiche)
- 🔴 Community interaction (6 test)
- 🔴 Merchant dashboard (7+ test)
- 🔴 Mobile responsive (8+ test)
- 🔴 Browser compatibility (6+ browser)

**Tempo totale manuale**: ~6-10 ore

---

## 🎯 PIANO DI TESTING

### Fase 1: Test Automatici (Io) - **5-10 minuti**
1. Eseguo build test
2. Eseguo linting test
3. Eseguo TypeScript check
4. Verifico schema database
5. Creo script test API sicurezza

### Fase 2: Test Manuali (Tu) - **6-10 ore**
1. Flow end-to-end completo (30-60 min)
2. UI/UX visual check (1-2 ore)
3. Community testing (30-60 min)
4. Merchant dashboard (1-2 ore)
5. Mobile responsive (1-2 ore)
6. Browser compatibility (2-3 ore)

---

## 🚀 PROSSIMI PASSI

### Io (Automatici):
1. ✅ Posso eseguire build test ora
2. ⚠️ Posso creare script test API sicurezza
3. ✅ Posso verificare schema database
4. ✅ Posso testare rate limiting

### Tu (Manuali):
1. 🔴 Flow end-to-end quando pronto
2. 🔴 UI/UX check dopo deploy
3. 🔴 Community test quando pronto
4. 🔴 Merchant dashboard test quando pronto

---

**Vuoi che esegua ora i test automatici?** Posso:
1. Verificare build
2. Verificare linting
3. Verificare TypeScript
4. Creare script test API sicurezza
5. Verificare schema database

Dimmi quando sei pronto per i test manuali! 🚀

