# 🧪 SafeTrade Escrow Locale - Test Browser Integrato

**Data**: 2025-01-27  
**Ambiente**: Browser integrato, test locale  
**Utente Attuale**: Admin (loggato)

---

## 📊 Riepilogo Progresso

**Fase 1 - Verifica Base**: [ ] 0/3 completati  
**Fase 2 - Setup Account**: [ ] 0/4 completati  
**Fase 3 - Flusso Completo**: [ ] 0/8 completati  

**Totale**: [ ] 0/15 step completati

---

## 📋 Piano Test

### Fase 1: Verifica Base (come Admin)
- [ x] Verificare che il sistema funzioni
- [x ] Controllare che le pagine carichino
- [ x] Verificare che le API rispondano

### Fase 2: Setup Account Test
- [x] Creare account Buyer ✅
- [x] Creare account Seller ✅
- [ ] Creare account Merchant (con Shop)
- [ ] Logout e login con account separati

### Fase 3: Test Flusso Completo
- [ ] Creare proposta
- [ ] Creare transazione con slot
- [ ] Verificare QR token generato
- [ ] Test scan QR token
- [ ] Test check-in merchant
- [ ] Test verifica merchant
- [ ] Test release fondi

---

## 🚀 Fase 1: Verifica Base (come Admin)

### Step 1.1: Verifica Database Schema

- [ ] **Completato**

**Azione**: Verifica che lo schema Prisma sia aggiornato

```bash
# Nel terminale
npx prisma generate
npx prisma db push
```

**✅ Verifica**:
- Nessun errore nel terminale
- Schema aggiornato con `qrToken`, `VerificationReport`, `EscrowAuditLog`

### Step 1.2: Verifica Pagina Scan QR

- [ ] **Completato**

**Azione**: Apri pagina scan QR (anche senza token valido, per vedere se carica)

1. Nel browser integrato, vai a: `http://localhost:3000/escrow/scan/test_token_123`

**✅ Risultato Atteso**:
- Pagina carica (non crash)
- Mostra errore "Token QR Non Valido" (corretto, è un token fake)
- UI funziona correttamente

### Step 1.3: Verifica API Pubblica Scan

- [ ] **Completato**

**Azione**: Testa API scan con token non esistente

1. Apri DevTools (F12)
2. Vai a Console
3. Esegui:
```javascript
fetch('/api/escrow/public/scan/test_token_123')
  .then(r => r.json())
  .then(console.log)
```

**✅ Risultato Atteso**:
- Risposta: `{ error: "Token QR non valido o scaduto" }`
- Status: 404
- Nessun errore server

---

## 👥 Fase 2: Setup Account Test

### Step 2.1: Logout Admin

- [ ] **Completato**

**Azione**: Fare logout dall'account admin

1. Clicca sul tuo profilo (in alto a destra)
2. Clicca "Logout" o vai a `/logout`
3. Verifica di essere disconnesso

**✅ Verifica**: Sei sulla pagina login o homepage

### Step 2.2: Creare Account Buyer

- [x] **Completato** ✅ Account creato: `buyer-test@safetrade.it` (ID: deb498a1-f4a0-44e7-8d1b-5d26bb370d55)

**Azione**: Registrare nuovo utente come Buyer

1. Vai a `/signup`
2. Compila form:
   - **Email**: `buyer-test@safetrade.it`
   - **Password**: `Test1234!` (min 8 caratteri)
   - **Nome**: `Test Buyer`
   - **Ruolo**: `USER` (default)
3. Clicca "Registrati"

**✅ Risultato Atteso**:
- Account creato con successo
- Redirect a dashboard o login
- Email verificata (o skip verifica se non configurata)

### Step 2.3: Creare Account Seller

- [x] **Completato** ✅ Account creato: `seller-test@safetrade.it` (ID: 51d7ebe5-b2b6-46ac-9017-c285eb890963)

**Azione**: Registrare nuovo utente come Seller

1. Logout (se loggato)
2. Vai a `/signup`
3. Compila form:
   - **Email**: `seller-test@safetrade.it`
   - **Password**: `Test1234!`
   - **Nome**: `Test Seller`
   - **Ruolo**: `USER`
4. Clicca "Registrati"

**✅ Risultato Atteso**: Account creato

### Step 2.4: Creare Account Merchant con Shop

- [ ] **Completato** (Account creato)
- [ ] **Completato** (Shop approvato)

**Azione**: Registrare merchant e creare shop

1. Logout
2. Vai a `/signup`
3. Compila form:
   - **Email**: `merchant-test@safetrade.it`
   - **Password**: `Test1234!`
   - **Nome**: `Test Merchant`
   - **Ruolo**: `MERCHANT`
   - **Shop Name**: `Test Shop Milano`
   - **Company Name**: `Test Shop SRL`
   - **VAT Number**: `IT12345678901`
   - **Address**: `Via Test 123`
   - **City**: `Milano`
   - **Phone**: `+39 02 1234567`
4. Clicca "Registrati"

**✅ Risultato Atteso**:
- Account creato
- `MerchantApplication` creata (status PENDING)

**IMPORTANTE**: Il merchant deve essere approvato da admin per avere shop attivo.

**Opzione A - Approvazione Manuale**:
1. Login come admin
2. Vai a `/admin/applications`
3. Trova application di `merchant-test@safetrade.it`
4. Approva application
5. Verifica che shop sia creato e `isApproved = true`

**Opzione B - Approvazione Diretta DB** (più veloce per test):
```sql
-- Trova merchant application
SELECT id, userId, status FROM "MerchantApplication" WHERE userId = (
  SELECT id FROM "User" WHERE email = 'merchant-test@safetrade.it'
);

-- Approva application e crea shop
UPDATE "MerchantApplication" SET status = 'APPROVED' WHERE userId = (
  SELECT id FROM "User" WHERE email = 'merchant-test@safetrade.it'
);

-- Verifica shop creato
SELECT id, name, merchantId, isApproved FROM "Shop" WHERE merchantId = (
  SELECT id FROM "User" WHERE email = 'merchant-test@safetrade.it'
);

-- Se shop non esiste, crealo manualmente
INSERT INTO "Shop" (id, name, description, address, city, merchantId, isApproved)
SELECT 
  gen_random_uuid(),
  'Test Shop Milano',
  'Shop di test per escrow',
  'Via Test 123',
  'Milano',
  id,
  true
FROM "User" WHERE email = 'merchant-test@safetrade.it';
```

---

## 🔄 Fase 3: Test Flusso Completo

### Step 3.1: Creare Listing e Proposta

- [ ] **Completato** (Listing creato)
- [ ] **Completato** (Proposta creata)
- [ ] **Completato** (Proposta accettata)

**Azione**: Seller crea listing, Buyer crea proposta

1. **Login come Seller** (`seller-test@safetrade.it`)
2. Vai a `/sell` o `/listings`
3. Crea nuovo listing:
   - **Titolo**: `Pikachu VMAX - Test Escrow`
   - **Prezzo**: `100.00`
   - **Game**: `Pokemon`
   - **Condizione**: `Near Mint`
   - Upload almeno 1 foto
4. Salva listing

5. **Logout e Login come Buyer** (`buyer-test@safetrade.it`)
6. Vai al listing appena creato
7. Clicca "Fai un'offerta" o "Proponi Scambio"
8. Crea proposta:
   - **Tipo**: `SALE`
   - **Prezzo**: `100.00` (o diverso per testare)
   - **Messaggio**: `Test escrow locale`
9. Invia proposta

10. **Logout e Login come Seller**
11. Vai a dashboard → Proposte ricevute
12. Accetta proposta

**✅ Risultato Atteso**:
- Proposta creata e accettata
- Status proposta: `ACCEPTED`

### Step 3.2: Creare Transazione con Slot

- [ ] **Completato** (Transazione creata)
- [ ] **Completato** (QR Token generato e verificato)

**Azione**: Buyer prenota slot in negozio

1. **Login come Buyer**
2. Dopo aver accettato proposta, dovresti vedere opzione "Prenota Slot"
3. Seleziona negozio: `Test Shop Milano`
4. Seleziona data: domani o data futura
5. Seleziona orario: es. `10:00-11:00`
6. Conferma prenotazione

**✅ Risultato Atteso**:
- Transazione creata
- `SafeTradeTransaction` con `status = PENDING`
- `EscrowSession` creata automaticamente
- `qrToken` generato (verifica nel DB o console)

**Verifica QR Token**:
```javascript
// In console browser (dopo creazione transazione)
// Oppure controlla risposta API
// Dovresti vedere qrToken nella risposta o nel database
```

**Verifica Database** (opzionale, via Prisma Studio):
```bash
npx prisma studio
# Vai a EscrowSession, trova sessione appena creata
# Verifica: qrToken, qrTokenExpiresAt, appointmentSlot, expiredAt
```

### Step 3.3: Test Scan QR Token (Pubblico)

- [ ] **Completato**

**Azione**: Testare pagina scan QR senza login

1. **Logout** (se loggato)
2. Ottieni `qrToken` dalla sessione (via DB o API)
3. Vai a: `http://localhost:3000/escrow/scan/<qrToken>`

**✅ Risultato Atteso**:
- Pagina carica
- Mostra info negozio, data appuntamento
- Mostra CTA "Accedi"
- Non mostra dettagli buyer/seller (non autorizzato)

### Step 3.4: Test Scan QR Token (come Buyer/Seller)

- [ ] **Completato** (Test come Buyer)
- [ ] **Completato** (Test come Seller)

**Azione**: Testare scan QR loggato come buyer o seller

1. **Login come Buyer**
2. Vai a: `http://localhost:3000/escrow/scan/<qrToken>`

**✅ Risultato Atteso**:
- Pagina carica
- Mostra info sessione
- Mostra messaggio "Non Autorizzato" per azioni
- Nessuna CTA disponibile (buyer non può fare check-in)

### Step 3.5: Test Scan QR Token (come Merchant)

- [ ] **Completato**

**Azione**: Testare scan QR loggato come merchant owner

1. **Login come Merchant** (`merchant-test@safetrade.it`)
2. Vai a: `http://localhost:3000/escrow/scan/<qrToken>`

**✅ Risultato Atteso**:
- Pagina carica
- Mostra info completa sessione
- Se `status = CHECKIN_PENDING`: mostra CTA "Esegui Check-in"
- Se `status = CHECKED_IN`: mostra CTA "Avvia Verifica"
- Mostra CTA "Apri Dettagli Sessione"

### Step 3.6: Test Check-in Merchant

- [ ] **Completato** (Check-in eseguito)
- [ ] **Completato** (Presenza buyer/seller confermata)
- [ ] **Completato** (Audit event verificato)

**Azione**: Merchant esegue check-in

1. **Login come Merchant**
2. Vai a pagina scan QR (o dettagli sessione)
3. Clicca "Esegui Check-in"
4. Seleziona:
   - ✅ **Buyer Presente**: `true`
   - ✅ **Seller Presente**: `true`
5. Clicca "Conferma Check-in"

**✅ Risultato Atteso**:
- Check-in completato
- Status sessione: `CHECKED_IN`
- `buyerPresent = true`, `sellerPresent = true`
- `checkInAt` impostato
- Audit event `CHECK_IN` creato

**Verifica**:
```javascript
// In console, verifica sessione aggiornata
fetch(`/api/escrow/sessions/${sessionId}`)
  .then(r => r.json())
  .then(console.log)
// Dovresti vedere: status = "CHECKED_IN", buyerPresent = true, sellerPresent = true
```

### Step 3.7: Test Verifica Merchant

- [ ] **Completato** (Verifica avviata)
- [ ] **Completato** (3 foto caricate)
- [ ] **Completato** (Verifica completata con status PASSED)
- [ ] **Completato** (VerificationReport creato)

**Azione**: Merchant avvia e completa verifica

1. **Login come Merchant**
2. Vai a dettagli sessione (dopo check-in)
3. Clicca "Avvia Verifica"
4. Upload 3 foto:
   - Foto 1: Front carta
   - Foto 2: Back carta
   - Foto 3: Dettaglio
5. Compila note (opzionale): `Verifica completata, carte in ottime condizioni`
6. Clicca "Completa Verifica" con status `PASSED`

**✅ Risultato Atteso**:
- Verifica avviata: status `VERIFICATION_IN_PROGRESS`
- Verifica completata: status `VERIFICATION_PASSED`
- `VerificationReport` creato con 3 foto
- Audit events creati

**⚠️ Nota**: Se upload foto non funziona ancora, puoi testare con URL foto mock per ora.

### Step 3.8: Test Release Fondi (come Admin)

- [ ] **Completato** (Release richiesto)
- [ ] **Completato** (Doppia conferma eseguita)
- [ ] **Completato** (Release approvato)
- [ ] **Completato** (Sessione completata)

**Azione**: Admin approva release fondi

1. **Login come Admin**
2. Vai a `/admin/pending-releases` (o equivalente)
3. Trova richiesta release per la sessione
4. Primo click → popup conferma
5. Secondo click → conferma release

**✅ Risultato Atteso**:
- Release approvato
- Status sessione: `RELEASE_APPROVED` → `COMPLETED`
- `FinancialAuditLog` creato con doppio timestamp

---

## 🔍 Verifica Finale

### Checklist Completa

- [ ] QR Token generato correttamente alla creazione sessione
- [ ] Pagina scan QR funziona (pubblico, buyer, seller, merchant)
- [ ] Check-in merchant funziona (presenza buyer/seller)
- [ ] Verifica merchant funziona (3 foto, status PASSED)
- [ ] Release fondi funziona (doppia conferma admin)
- [ ] Audit trail completo (tutti gli eventi loggati)
- [ ] Validazioni funzionano (presenza, foto, stato)
- [ ] Rate limiting funziona (se testato)

---

## 🐛 Troubleshooting

### Problema: QR Token non generato

**Sintomo**: `qrToken` è NULL nel database

**Soluzione**:
1. Verifica che lo schema Prisma sia aggiornato
2. Verifica che il codice in `transactions/route.ts` sia aggiornato
3. Rigenera token per sessioni esistenti (vedi guida test)

### Problema: Pagina scan QR non carica

**Sintomo**: Errore 404 o pagina bianca

**Soluzione**:
1. Verifica che il file `src/app/escrow/scan/[token]/page.tsx` esista
2. Riavvia server dev: `npm run dev`
3. Verifica console browser per errori

### Problema: Merchant non può fare check-in

**Sintomo**: CTA "Esegui Check-in" non appare o errore 403

**Soluzione**:
1. Verifica che merchant sia owner della sessione (`merchantId` corrisponde)
2. Verifica che status sessione sia `CHECKIN_PENDING`
3. Verifica che shop sia approvato (`isApproved = true`)

---

**Fine Guida Test Browser**

