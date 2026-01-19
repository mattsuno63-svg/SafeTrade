# 🧪 SafeTrade Escrow Locale - Guida Test Completa

**Data Creazione**: 2025-01-27  
**Versione**: 1.0  
**Scopo**: Guida passo-passo per testare correttamente il sistema Escrow Locale, con focus su QR token e prevenzione errori.

---

## 📋 Indice

1. [Setup Pre-Test](#1-setup-pre-test)
2. [Test Generazione QR Token](#2-test-generazione-qr-token)
3. [Test Prevenzione Duplicati QR](#3-test-prevenzione-duplicati-qr)
4. [Test Scan QR Token](#4-test-scan-qr-token)
5. [Test Flusso Completo End-to-End](#5-test-flusso-completo-end-to-end)
6. [Test Edge Cases e Sicurezza](#6-test-edge-cases-e-sicurezza)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Setup Pre-Test

### 1.1 Preparazione Database

```bash
# Assicurati che lo schema Prisma sia aggiornato
npx prisma generate
npx prisma db push

# Verifica che i campi qrToken e qrTokenExpiresAt esistano in EscrowSession
npx prisma studio
```

### 1.2 Preparazione Account

**Account Necessari**:
1. **Buyer** (USER)
2. **Seller** (USER)
3. **Merchant** (MERCHANT con Shop approvato)
4. **Admin** (ADMIN) - opzionale per test release

**Setup**:
- Assicurati che il Merchant abbia un Shop creato e approvato
- Assicurati che Buyer e Seller abbiano almeno una proposta attiva

---

## 2. Test Generazione QR Token

### Test 2.1: Verifica Generazione QR Token alla Creazione Sessione

**Step 1: Crea Transazione**
```bash
# POST /api/transactions
{
  "proposalId": "<proposal-id>",
  "shopId": "<shop-id>",
  "scheduledDate": "2025-01-28T10:00:00Z",
  "scheduledTime": "10:00-11:00",
  "totalAmount": 100.00
}
```

**Step 2: Verifica Database**
```sql
-- Controlla che qrToken sia stato generato
SELECT id, transactionId, status, qrToken, qrTokenExpiresAt, appointmentSlot, expiredAt
FROM "EscrowSession"
WHERE transactionId = '<transaction-id>';

-- Verifica formato qrToken
-- Dovrebbe essere: escrow_ck_{timestamp}_{32hex}
-- Esempio: escrow_ck_lj3k2m1_4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2
```

**✅ Risultato Atteso**:
- `qrToken` non è NULL
- Formato: `escrow_ck_` seguito da timestamp base36 e 32 caratteri hex
- `qrTokenExpiresAt` = `createdAt` + 7 giorni
- `appointmentSlot` = combinazione `scheduledDate` + `scheduledTime`
- `expiredAt` = `appointmentSlot` + 1 ora
- `status` = `BOOKED` (se scheduled) o `CREATED` (altrimenti)

### Test 2.2: Verifica Unicità QR Token

**Step 1: Crea 10 Transazioni Simultanee**
```bash
# Script per testare collisioni (eseguire in parallelo)
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/transactions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <buyer-token>" \
    -d '{
      "proposalId": "<proposal-id>",
      "shopId": "<shop-id>",
      "scheduledDate": "2025-01-28T10:00:00Z",
      "scheduledTime": "10:00-11:00"
    }' &
done
wait
```

**Step 2: Verifica Unicità**
```sql
-- Controlla che non ci siano duplicati
SELECT qrToken, COUNT(*) as count
FROM "EscrowSession"
WHERE qrToken IS NOT NULL
GROUP BY qrToken
HAVING COUNT(*) > 1;

-- Risultato atteso: nessuna riga (0 duplicati)
```

**✅ Risultato Atteso**:
- Tutte le 10 transazioni create con successo
- Nessun errore di violazione constraint `@unique` su `qrToken`
- Tutti i `qrToken` sono univoci

---

## 3. Test Prevenzione Duplicati QR

### Test 3.1: Race Condition - Creazione Simultanea

**Scenario**: Due transazioni create nello stesso millisecondo

**Step 1: Simula Race Condition**
```typescript
// Test script (run in parallel)
import { generateUniqueQRToken } from '@/lib/escrow/session-utils'

const promises = []
for (let i = 0; i < 5; i++) {
  promises.push(generateUniqueQRToken())
}

const tokens = await Promise.all(promises)
console.log('Tokens generated:', tokens)
console.log('Unique tokens:', new Set(tokens).size) // Dovrebbe essere 5
```

**✅ Risultato Atteso**:
- Tutti i token generati sono unici
- Nessuna collisione anche con creazione simultanea

### Test 3.2: Violazione Constraint Database

**Step 1: Prova Inserimento QR Token Duplicato**
```sql
-- Crea sessione 1
INSERT INTO "EscrowSession" (id, transactionId, buyerId, sellerId, merchantId, status, qrToken)
VALUES ('session1', 'trans1', 'buyer1', 'seller1', 'merchant1', 'CREATED', 'test_token_123');

-- Prova inserimento sessione 2 con stesso qrToken (dovrebbe fallire)
INSERT INTO "EscrowSession" (id, transactionId, buyerId, sellerId, merchantId, status, qrToken)
VALUES ('session2', 'trans2', 'buyer2', 'seller2', 'merchant2', 'CREATED', 'test_token_123');
-- ERRORE ATTESO: Unique constraint violation
```

**✅ Risultato Atteso**:
- Prima inserzione: successo
- Seconda inserzione: errore constraint violation (come previsto)

---

## 4. Test Scan QR Token

### Test 4.1: Scan QR Token Valido (Non Loggato)

**Step 1: Ottieni QR Token da Sessione**
```sql
SELECT qrToken FROM "EscrowSession" WHERE id = '<session-id>';
```

**Step 2: Accedi a Pagina Pubblica**
```
GET /escrow/scan/<qrToken>
```

**✅ Risultato Atteso**:
- Pagina carica correttamente
- Mostra info negozio, data appuntamento
- Mostra CTA "Accedi" (non loggato)
- Non mostra dettagli buyer/seller (non autorizzato)
- Nessuna azione disponibile (solo info minima)

### Test 4.2: Scan QR Token Valido (Loggato come Buyer/Seller)

**Step 1: Login come Buyer o Seller**
```
POST /api/auth/login
{
  "email": "<buyer-email>",
  "password": "<password>"
}
```

**Step 2: Accedi a Pagina**
```
GET /escrow/scan/<qrToken>
```

**✅ Risultato Atteso**:
- Pagina carica correttamente
- Mostra info sessione
- Mostra messaggio "Non Autorizzato" per azioni
- Nessuna azione disponibile (buyer/seller non può fare check-in)

### Test 4.3: Scan QR Token Valido (Loggato come Merchant Corretto)

**Step 1: Login come Merchant Owner della Sessione**
```
POST /api/auth/login
{
  "email": "<merchant-email>",
  "password": "<password>"
}
```

**Step 2: Accedi a Pagina**
```
GET /escrow/scan/<qrToken>
```

**✅ Risultato Atteso**:
- Pagina carica correttamente
- Mostra info completa sessione
- Se `status = CHECKIN_PENDING`: mostra CTA "Esegui Check-in"
- Se `status = CHECKED_IN`: mostra CTA "Avvia Verifica"
- Mostra CTA "Apri Dettagli Sessione"

### Test 4.4: Scan QR Token Non Esistente

**Step 1: Accedi con Token Inesistente**
```
GET /escrow/scan/escrow_ck_fake_token_123456
```

**✅ Risultato Atteso**:
- Pagina mostra errore "Token QR Non Valido"
- Status code: 404
- Security audit log creato (`QR_SCAN_UNAUTHORIZED`)

### Test 4.5: Scan QR Token Scaduto

**Step 1: Crea Sessione con Token Scaduto**
```sql
UPDATE "EscrowSession"
SET qrTokenExpiresAt = NOW() - INTERVAL '1 day'
WHERE id = '<session-id>';
```

**Step 2: Accedi a Pagina**
```
GET /escrow/scan/<qrToken>
```

**✅ Risultato Atteso**:
- API ritorna errore 410 (Gone)
- Messaggio: "Token QR scaduto"
- Pagina mostra errore appropriato

### Test 4.6: Rate Limiting su Scan

**Step 1: Esegui 11 Richieste in Meno di 1 Minuto**
```bash
for i in {1..11}; do
  curl http://localhost:3000/api/escrow/public/scan/<qrToken>
done
```

**✅ Risultato Atteso**:
- Prime 10 richieste: successo (200)
- 11a richiesta: errore 429 (Too Many Requests)
- Header `Retry-After` presente

---

## 5. Test Flusso Completo End-to-End

### Test 5.1: Happy Path Completo

**Step 1: Creare Proposta e Transazione**
1. Buyer crea proposta per listing
2. Seller accetta proposta
3. Buyer seleziona negozio e prenota slot
4. Verifica che transazione e sessione siano create
5. Verifica che `qrToken` sia generato

**Step 2: Check-in Merchant**
1. Arrivare alla data/ora appuntamento
2. Merchant scansiona QR token
3. Merchant accede a `/escrow/scan/<qrToken>`
4. Clicca "Esegui Check-in"
5. Seleziona "Presenti: Buyer / Seller" e conferma
6. Verifica transizione a `CHECKED_IN`
7. Verifica audit event creato

**Step 3: Verifica Merchant**
1. Merchant clicca "Avvia Verifica"
2. Upload 3 foto (front/back/dettaglio)
3. Compila note (opzionale)
4. Clicca "Completa Verifica" con status `PASSED`
5. Verifica transizione a `VERIFICATION_PASSED`
6. Verifica `VerificationReport` creato
7. Verifica foto salvate in Supabase Storage

**Step 4: Release Fondi**
1. Da stato `VERIFICATION_PASSED`, richiedere release
2. Admin accede a richiesta release
3. Doppia conferma (primo click → popup, secondo click → conferma)
4. Verifica transizione a `RELEASE_APPROVED`
5. Verifica transizione automatica a `COMPLETED`
6. Verifica `FinancialAuditLog` creato con doppio timestamp

---

## 6. Test Edge Cases e Sicurezza

### Test 6.1: Tentativo Check-in Senza Presenza Buyer/Seller

**Step 1: Merchant tenta check-in con `buyerPresent = false`**
```bash
POST /api/escrow/sessions/<sessionId>/checkin
{
  "buyerPresent": false,
  "sellerPresent": true
}
```

**✅ Risultato Atteso**:
- Errore 400: "Entrambi buyer e seller devono essere presenti"
- Stato rimane `CHECKIN_PENDING`
- Nessun audit event creato (transizione non valida)

### Test 6.2: Tentativo Verifica Senza Check-in

**Step 1: Tentare verifica da stato `CHECKIN_PENDING`**
```bash
POST /api/escrow/sessions/<sessionId>/verification
{
  "action": "START"
}
```

**✅ Risultato Atteso**:
- Errore 400: "Verifica possibile solo da CHECKED_IN"
- Stato rimane `CHECKIN_PENDING`

### Test 6.3: Tentativo Release Senza Verifica Passed

**Step 1: Tentare release da stato `VERIFICATION_FAILED`**
```bash
POST /api/escrow/sessions/<sessionId>/release
{
  "action": "REQUEST"
}
```

**✅ Risultato Atteso**:
- Errore 400: "Release possibile solo da VERIFICATION_PASSED"
- Stato rimane `VERIFICATION_FAILED`

### Test 6.4: Verifica Foto Insufficienti

**Step 1: Completare verifica con solo 2 foto**
```bash
POST /api/escrow/sessions/<sessionId>/verification
{
  "action": "COMPLETE",
  "status": "PASSED",
  "photos": ["url1", "url2"] // Solo 2 foto
}
```

**✅ Risultato Atteso**:
- Errore 400: "Minimo 3 foto obbligatorie per verifica PASSED"
- Stato rimane `VERIFICATION_IN_PROGRESS`

### Test 6.5: Timeout Automatico

**Step 1: Creare sessione con `expiredAt` nel passato**
```sql
UPDATE "EscrowSession"
SET expiredAt = NOW() - INTERVAL '1 hour',
    status = 'CHECKIN_PENDING'
WHERE id = '<session-id>';
```

**Step 2: Eseguire job/cron di timeout (o trigger su accesso)**
```bash
# Chiama endpoint timeout (se implementato)
POST /api/cron/escrow-timeout
```

**✅ Risultato Atteso**:
- Sessione marcata come `EXPIRED`
- Audit event `SESSION_EXPIRED` creato
- Notifica buyer/seller (se implementato)

---

## 7. Troubleshooting

### Problema: QR Token Non Generato

**Sintomi**: `qrToken` è NULL nel database

**Causa Possibile**:
- Errore durante generazione token
- Transazione creata prima dell'update del codice

**Soluzione**:
```sql
-- Rigenera QR token per sessioni esistenti
UPDATE "EscrowSession"
SET qrToken = 'escrow_ck_' || LOWER(TO_HEX(gen_random_uuid()))
WHERE qrToken IS NULL;
```

### Problema: Violazione Constraint QR Token Duplicato

**Sintomi**: Errore "Unique constraint violation on qrToken"

**Causa Possibile**:
- Collisione molto rara (1 su 2^128)
- Bug nel retry logic

**Soluzione**:
```sql
-- Verifica duplicati
SELECT qrToken, COUNT(*) as count
FROM "EscrowSession"
WHERE qrToken IS NOT NULL
GROUP BY qrToken
HAVING COUNT(*) > 1;

-- Risolvi duplicati (rigenera per sessioni duplicate)
UPDATE "EscrowSession"
SET qrToken = 'escrow_ck_' || LOWER(TO_HEX(gen_random_uuid()))
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY qrToken ORDER BY createdAt) as rn
    FROM "EscrowSession"
    WHERE qrToken IN (
      SELECT qrToken FROM "EscrowSession"
      WHERE qrToken IS NOT NULL
      GROUP BY qrToken HAVING COUNT(*) > 1
    )
  ) t WHERE rn > 1
);
```

### Problema: Scan QR Token Non Trova Sessione

**Sintomi**: 404 "Token QR non valido" anche se token esiste

**Causa Possibile**:
- Token scaduto (`qrTokenExpiresAt` nel passato)
- Token diverso formato (qrCode vs qrToken)

**Soluzione**:
```sql
-- Verifica sessione esiste
SELECT id, qrToken, qrCode, qrTokenExpiresAt, status
FROM "EscrowSession"
WHERE qrToken = '<token>' OR qrCode = '<token>';

-- Estendi scadenza se necessario
UPDATE "EscrowSession"
SET qrTokenExpiresAt = NOW() + INTERVAL '7 days'
WHERE qrToken = '<token>';
```

### Problema: Pagina Scan Non Mostra Azioni

**Sintomi**: Pagina carica ma nessun CTA disponibile

**Causa Possibile**:
- User non loggato o non autorizzato
- Stato sessione non permette azioni

**Soluzione**:
1. Verifica user è loggato e ha ruolo corretto
2. Verifica stato sessione è corretto per azioni:
   - `CHECKIN_PENDING` → CTA "Esegui Check-in"
   - `CHECKED_IN` → CTA "Avvia Verifica"
3. Verifica merchant è owner della sessione (`merchantId` corrisponde)

---

## ✅ Checklist Test Completamento

- [ ] QR Token generato correttamente alla creazione sessione
- [ ] QR Token unico (no duplicati anche con creazione simultanea)
- [ ] Scan QR token funziona (pubblico, buyer/seller, merchant)
- [ ] Rate limiting funziona (max 10 req/min)
- [ ] Validazioni funzionano (presenza, foto, stato)
- [ ] Flusso completo end-to-end funziona
- [ ] Edge cases gestiti correttamente
- [ ] Timeout automatico funziona (se implementato)
- [ ] Audit trail completo per tutte le azioni

---

**Fine Guida Test**

