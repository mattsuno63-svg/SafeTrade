# 🧪 SafeTrade Escrow Locale - Checklist Test Completa

**Data Creazione**: 2025-01-27  
**Versione**: 1.0  
**Scopo**: Checklist completa per test end-to-end del sistema Escrow Locale

---

## 📋 Indice

1. [Happy Path](#1-happy-path)
2. [Edge Cases](#2-edge-cases)
3. [Timeout e Estensione](#3-timeout-e-estensione)
4. [Sicurezza e Validazioni](#4-sicurezza-e-validazioni)
5. [State Machine](#5-state-machine)
6. [QR e Permessi](#6-qr-e-permessi)
7. [Verifica Foto](#7-verifica-foto)
8. [Release e Audit](#8-release-e-audit)

---

## 1. Happy Path

### ✅ Test 1.1: Creazione e Prenotazione Sessione
- [ ] Creare proposta tra buyer e seller
- [ ] Buyer accetta proposta e seleziona negozio VLS
- [ ] Selezionare slot (data + ora)
- [ ] Verificare sessione creata con status `CREATED`
- [ ] Verificare transizione a `BOOKED` dopo prenotazione slot
- [ ] Verificare `appointmentSlot` e `expiredAt` impostati correttamente (1 ora dopo slot)
- [ ] Verificare QR token generato e valido
- [ ] Verificare notifiche inviate a buyer/seller/merchant

### ✅ Test 1.2: Check-in Merchant
- [ ] Arrivare alla data/ora appuntamento (o triggerare manualmente)
- [ ] Verificare transizione automatica da `BOOKED` a `CHECKIN_PENDING`
- [ ] Merchant scansiona QR token
- [ ] Merchant seleziona "Presenti: Buyer / Seller" e conferma
- [ ] Verificare check-in completato
- [ ] Verificare transizione a `CHECKED_IN`
- [ ] Verificare `buyerPresent = true` e `sellerPresent = true`
- [ ] Verificare `checkInAt` impostato
- [ ] Verificare messaggio sistema creato
- [ ] Verificare audit event `CHECK_IN` creato

### ✅ Test 1.3: Verifica Merchant (PASSED)
- [ ] Da stato `CHECKED_IN`, merchant avvia verifica
- [ ] Verificare transizione a `VERIFICATION_IN_PROGRESS`
- [ ] Upload 3 foto obbligatorie (front/back/dettaglio)
- [ ] Inserire note (opzionale)
- [ ] Merchant completa verifica con status `PASSED`
- [ ] Verificare transizione a `VERIFICATION_PASSED`
- [ ] Verificare foto salvate in Supabase Storage
- [ ] Verificare `VerificationReport` creato con status `PASSED`
- [ ] Verificare audit event `VERIFICATION_PASSED` creato

### ✅ Test 1.4: Richiesta e Approvazione Release
- [ ] Da stato `VERIFICATION_PASSED`, richiedere rilascio fondi
- [ ] Verificare transizione a `RELEASE_REQUESTED`
- [ ] Verificare `PendingRelease` creato con status `PENDING`
- [ ] Notifica admin/moderator
- [ ] Admin/Moderator accede a richiesta release
- [ ] Primo click → popup conferma mostrato
- [ ] Secondo click conferma → release approvato
- [ ] Verificare transizione a `RELEASE_APPROVED`
- [ ] Verificare `FinancialAuditLog` creato con doppio timestamp
- [ ] Verificare transizione automatica a `COMPLETED`
- [ ] Verificare notifiche inviate a buyer/seller/merchant

---

## 2. Edge Cases

### ❌ Test 2.1: No Check-in (Timeout Automatico)
- [ ] Creare sessione con slot prenotato
- [ ] Attendere o impostare `expiredAt` nel passato
- [ ] Verificare timeout automatico (job/cron o trigger su accesso)
- [ ] Verificare transizione a `EXPIRED`
- [ ] Verificare audit event `SESSION_EXPIRED` creato
- [ ] Verificare notifiche inviate a buyer/seller

### ✅ Test 2.2: Estensione Manuale Sessione
- [ ] Partire da sessione `EXPIRED`
- [ ] Merchant o admin clicca "Estendi sessione"
- [ ] Verificare `expiredAt` aggiornato (+1 ora da now)
- [ ] Verificare transizione da `EXPIRED` a `CHECKIN_PENDING`
- [ ] Verificare audit event `SESSION_EXTENDED` creato
- [ ] Testare check-in dopo estensione (deve funzionare)

### 🚫 Test 2.3: Chiusura Sessione Manuale
- [ ] Da qualsiasi stato non terminale, merchant/admin clicca "Chiudi sessione"
- [ ] Primo click → popup conferma mostrato: "Confermi di voler chiudere definitivamente la sessione?"
- [ ] Secondo click conferma → sessione chiusa
- [ ] Verificare transizione a `CANCELLED`
- [ ] Verificare audit event `SESSION_CLOSED_MANUAL` creato

### ❌ Test 2.4: Verifica Senza Check-in (Rifiutata)
- [ ] Tentare di avviare verifica da stato `CHECKIN_PENDING` (senza check-in)
- [ ] Verificare rifiuto con messaggio "Verifica possibile solo da CHECKED_IN"
- [ ] Verificare stato non cambiato
- [ ] Verificare audit event NON creato (transizione non valida)

### ❌ Test 2.5: Release Senza Verifica Passed (Rifiutata)
- [ ] Tentare di richiedere release da stato `VERIFICATION_IN_PROGRESS` o `VERIFICATION_FAILED`
- [ ] Verificare rifiuto con messaggio "Release possibile solo da VERIFICATION_PASSED"
- [ ] Verificare stato non cambiato
- [ ] Verificare audit event NON creato

### ❌ Test 2.6: Check-in Senza Entrambi Presenti (Rifiutato)
- [ ] Tentare check-in con `buyerPresent = true`, `sellerPresent = false`
- [ ] Verificare rifiuto con messaggio "Entrambi buyer e seller devono essere presenti"
- [ ] Tentare con `buyerPresent = false`, `sellerPresent = true`
- [ ] Verificare rifiuto
- [ ] Verificare stato rimane `CHECKIN_PENDING`

---

## 3. Timeout e Estensione

### ⏱️ Test 3.1: Timeout Automatico (1 Ora)
- [ ] Creare sessione con `appointmentSlot` = now
- [ ] Impostare `expiredAt` = now + 1 ora
- [ ] Attendere o simulare timeout
- [ ] Verificare transizione automatica a `EXPIRED`
- [ ] Testare da stato `BOOKED`
- [ ] Testare da stato `CHECKIN_PENDING`

### ✅ Test 3.2: Estensione Manuale e Check-in Successivo
- [ ] Partire da sessione `EXPIRED`
- [ ] Estendere sessione (test 2.2)
- [ ] Verificare nuova scadenza (1 ora da estensione)
- [ ] Eseguire check-in (deve funzionare)
- [ ] Verificare verifica e release completabili

---

## 4. Sicurezza e Validazioni

### 🔒 Test 4.1: Scan QR Token da Utente Non Autorizzato
- [ ] Utente non loggato accede a `/scan/[token]`
- [ ] Verificare info minima mostrata (negozio, data appuntamento)
- [ ] Verificare CTA "Accedi" mostrato
- [ ] Verificare nessuna azione disponibile

### 🔒 Test 4.2: Scan QR Token da Utente Autorizzato ma Non Merchant
- [ ] Buyer/Seller loggato accede a `/scan/[token]`
- [ ] Verificare info mostra buyer/seller (se stesso)
- [ ] Verificare messaggio "Non autorizzato" per azioni
- [ ] Verificare nessuna azione disponibile (no check-in, no verifica)

### ✅ Test 4.3: Scan QR Token da Merchant Corretto
- [ ] Merchant loggato (owner sessione) accede a `/scan/[token]`
- [ ] Verificare info completa sessione mostrata
- [ ] Verificare CTA contestuali disponibili:
  - "Esegui check-in" (se `CHECKIN_PENDING`)
  - "Avvia verifica" (se `CHECKED_IN`)
  - "Apri sessione" (link dettaglio)

### 🚫 Test 4.4: Tentativo Transizione Stato Illegale
- [ ] Tentare transizione `CREATED` → `VERIFICATION_PASSED` (salta stati intermedi)
- [ ] Verificare rifiuto con messaggio "Transizione non valida"
- [ ] Tentare transizione `COMPLETED` → `CHECKED_IN` (terminal state)
- [ ] Verificare rifiuto
- [ ] Verificare audit event NON creato

### 🚫 Test 4.5: Tentativo Check-in da Ruolo Non Autorizzato
- [ ] Buyer/Seller tenta check-in (dovrebbe essere merchant)
- [ ] Verificare rifiuto con messaggio "Solo merchant può eseguire check-in"
- [ ] Verificare stato non cambiato

### 🚫 Test 4.6: Tentativo Release da Ruolo Non Autorizzato
- [ ] Buyer/Seller/Merchant tenta approvare release (dovrebbe essere admin/moderator)
- [ ] Verificare rifiuto con messaggio "Solo admin o moderator può approvare release"
- [ ] Verificare stato non cambiato

---

## 5. State Machine

### 🔄 Test 5.1: Tutte le Transizioni Valide
- [ ] `CREATED` → `BOOKED`
- [ ] `BOOKED` → `CHECKIN_PENDING` (auto)
- [ ] `CHECKIN_PENDING` → `CHECKED_IN`
- [ ] `CHECKED_IN` → `VERIFICATION_IN_PROGRESS`
- [ ] `VERIFICATION_IN_PROGRESS` → `VERIFICATION_PASSED`
- [ ] `VERIFICATION_PASSED` → `RELEASE_REQUESTED`
- [ ] `RELEASE_REQUESTED` → `RELEASE_APPROVED`
- [ ] `RELEASE_APPROVED` → `COMPLETED` (auto)

### ❌ Test 5.2: Transizioni NON Valide (Rifiutate)
- [ ] `CREATED` → `VERIFICATION_PASSED` (salta stati)
- [ ] `COMPLETED` → `CHECKED_IN` (terminal state)
- [ ] `EXPIRED` → `VERIFICATION_PASSED` (deve passare per CHECKIN_PENDING)
- [ ] `CHECKIN_PENDING` → `RELEASE_REQUESTED` (salta verifica)

### 🔄 Test 5.3: Dispute da Vari Stati
- [ ] Aprire dispute da `VERIFICATION_IN_PROGRESS`
- [ ] Verificare transizione a `DISPUTED`
- [ ] Aprire dispute da `VERIFICATION_FAILED`
- [ ] Verificare transizione a `DISPUTED`
- [ ] Verificare dispute NON apribile da `COMPLETED` o `CANCELLED`

---

## 6. QR e Permessi

### 📱 Test 6.1: Generazione QR Token
- [ ] Verificare QR token generato alla creazione sessione
- [ ] Verificare formato: `escrow_ck_...`
- [ ] Verificare token univoco (no duplicati)
- [ ] Verificare `qrTokenExpiresAt` impostato (7 giorni)

### 🔒 Test 6.2: Validazione QR Token
- [ ] Testare QR token valido → sessione trovata
- [ ] Testare QR token non esistente → 404
- [ ] Testare QR token scaduto → 410 (Gone)
- [ ] Testare rate limiting (10 req/min)

### 🔒 Test 6.3: Rotazione QR Token (Se Implementato)
- [ ] Merchant richiede rigenerazione token (se sospetto compromesso)
- [ ] Verificare vecchio token invalidato
- [ ] Verificare nuovo token generato
- [ ] Verificare audit event `QR_TOKEN_ROTATED` creato

---

## 7. Verifica Foto

### 📸 Test 7.1: Upload 3 Foto Minime (PASSED)
- [ ] Upload 1 foto front
- [ ] Upload 1 foto back
- [ ] Upload 1 foto dettaglio
- [ ] Verificare completamento verifica con `PASSED`
- [ ] Verificare foto salvate in Supabase Storage
- [ ] Verificare thumbnail generato
- [ ] Verificare metadata salvato

### ❌ Test 7.2: Upload 2 Foto (Bloccato)
- [ ] Upload solo 2 foto (front + back)
- [ ] Tentare completare verifica con `PASSED`
- [ ] Verificare rifiuto con messaggio "Minimo 3 foto obbligatorie per verifica PASSED"
- [ ] Verificare verifica rimane `IN_PROGRESS`

### ❌ Test 7.3: Upload Foto Troppo Grande
- [ ] Upload foto > 5MB
- [ ] Verificare rifiuto con messaggio "Foto troppo grande (max 5MB)"
- [ ] Verificare foto non salvata

### ✅ Test 7.4: Ottimizzazione Foto
- [ ] Upload foto originale (es. 4000x3000, 10MB)
- [ ] Verificare resize a max width 1600px
- [ ] Verificare compression (qualità 85%)
- [ ] Verificare thumbnail generato (400px)
- [ ] Verificare EXIF rimosso (privacy)

### ❌ Test 7.5: Verifica Fallita (Senza Requisiti Foto Minime)
- [ ] Da `VERIFICATION_IN_PROGRESS`, merchant completa verifica con `FAILED`
- [ ] Verificare completamento anche con 0 foto (verifica fallita non richiede foto minime)
- [ ] Verificare transizione a `VERIFICATION_FAILED`

---

## 8. Release e Audit

### 💰 Test 8.1: Richiesta Release
- [ ] Da `VERIFICATION_PASSED`, richiedere release
- [ ] Verificare `PendingRelease` creato con status `PENDING`
- [ ] Verificare `type = RELEASE_TO_SELLER`
- [ ] Verificare notifica admin/moderator

### ✅ Test 8.2: Approvazione Release (Doppia Conferma)
- [ ] Admin accede a `PendingRelease`
- [ ] Primo click → popup conferma mostrato
- [ ] Verificare timestamp `firstClickAt` registrato
- [ ] Secondo click conferma (almeno 1 secondo dopo)
- [ ] Verificare timestamp `confirmClickAt` registrato
- [ ] Verificare `FinancialAuditLog` creato con entrambi timestamp
- [ ] Verificare release approvato

### 🚫 Test 8.3: Tentativo Release Senza Doppia Conferma
- [ ] Admin accede a `PendingRelease`
- [ ] Primo click → popup conferma mostrato
- [ ] Tentare approvazione immediata (senza secondo click)
- [ ] Verificare rifiuto o attesa secondo click

### 📋 Test 8.4: Audit Trail Completo
- [ ] Eseguire flusso completo (creazione → check-in → verifica → release)
- [ ] Verificare audit events creati per ogni transizione:
  - [ ] `CREATED` → `BOOKED`
  - [ ] `BOOKED` → `CHECKIN_PENDING`
  - [ ] `CHECKIN_PENDING` → `CHECKED_IN` (`CHECK_IN`)
  - [ ] `CHECKED_IN` → `VERIFICATION_IN_PROGRESS` (`VERIFICATION_STARTED`)
  - [ ] `VERIFICATION_IN_PROGRESS` → `VERIFICATION_PASSED` (`VERIFICATION_PASSED`)
  - [ ] `VERIFICATION_PASSED` → `RELEASE_REQUESTED` (`RELEASE_REQUESTED`)
  - [ ] `RELEASE_REQUESTED` → `RELEASE_APPROVED` (`RELEASE_APPROVED`)
  - [ ] `RELEASE_APPROVED` → `COMPLETED` (auto)

### 📋 Test 8.5: Query Audit Trail
- [ ] Query audit per `sessionId`
- [ ] Query audit per `actionType`
- [ ] Query audit per `performedBy`
- [ ] Verificare ordinamento cronologico (`createdAt DESC`)
- [ ] Verificare metadata inclusi (es. `photoCount`, `buyerPresent`, ecc.)

---

## 9. Booking e Doppie Prenotazioni

### 🗓️ Test 9.1: Prenotazione Slot
- [ ] Buyer prenota slot: negozio X, data Y, ora Z
- [ ] Verificare prenotazione riuscita
- [ ] Tentare seconda prenotazione: stesso negozio, stessa data, stessa ora
- [ ] Verificare rifiuto con messaggio "Slot già prenotato"

### 🗓️ Test 9.2: Validazione Orari Negozio
- [ ] Tentare prenotazione fuori orari apertura negozio
- [ ] Verificare rifiuto con messaggio "Negozio chiuso in quell'orario"
- [ ] Tentare prenotazione in passato
- [ ] Verificare rifiuto

---

## 10. Notifiche Realtime

### 🔔 Test 10.1: Notifiche Check-in
- [ ] Eseguire check-in
- [ ] Verificare notifica buyer/seller (via Supabase Realtime o polling)
- [ ] Verificare contenuto notifica: "Check-in completato"

### 🔔 Test 10.2: Notifiche Verifica
- [ ] Avviare verifica
- [ ] Verificare notifica buyer/seller
- [ ] Completare verifica
- [ ] Verificare notifica buyer/seller

### 🔔 Test 10.3: Notifiche Release
- [ ] Richiedere release
- [ ] Verificare notifica admin/moderator
- [ ] Approvare release
- [ ] Verificare notifica buyer/seller/merchant

### 🔔 Test 10.4: Notifiche Timeout
- [ ] Sessione scade (`EXPIRED`)
- [ ] Verificare notifica buyer/seller

---

## ✅ Checklist Completamento

- [ ] Tutti i test Happy Path passati
- [ ] Tutti i test Edge Cases passati
- [ ] Tutti i test Sicurezza passati
- [ ] Tutti i test State Machine passati
- [ ] Tutti i test QR passati
- [ ] Tutti i test Verifica Foto passati
- [ ] Tutti i test Release passati
- [ ] Tutti i test Audit passati
- [ ] Tutti i test Booking passati
- [ ] Tutti i test Notifiche passati

---

**Fine Checklist**

