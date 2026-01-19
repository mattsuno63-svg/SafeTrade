# 🛡️ SafeTrade Escrow Locale - Specifica Completa

**Data Creazione**: 2025-01-27  
**Versione**: 1.0  
**Scopo**: Specifica completa per il sistema "Escrow Locale" di SafeTrade - Buyer e Seller prenotano una sessione in un negozio VLS, check-in tramite QR, verifica merchant con prove, eventuale dispute, rilascio fondi con approvazione manuale e audit trail.

---

## 📋 Indice

1. [Entity List e Responsabilità](#1-entity-list-e-responsabilità)
2. [State Machine EscrowSession](#2-state-machine-escrowsession)
3. [Invarianti Server-Side](#3-invarianti-server-side)
4. [QR Model e Scan Landing](#4-qr-model-e-scan-landing)
5. [Foto Verification](#5-foto-verification)
6. [Booking e Timeout](#6-booking-e-timeout)
7. [Rilascio Fondi](#7-rilascio-fondi)
8. [Dispute e Audit Trail](#8-dispute-e-audit-trail)

---

## 1. Entity List e Responsabilità

### 1.1 Transaction (`SafeTradeTransaction`)
**Responsabilità**: Rappresenta la transazione di base tra buyer e seller
- **Campi chiave**:
  - `id`: ID univoco transazione
  - `proposalId`: Link alla proposta (opzionale)
  - `userAId`, `userBId`: Buyer e Seller
  - `shopId`: Negozio VLS dove avviene l'incontro
  - `scheduledDate`, `scheduledTime`: Appuntamento prenotato
  - `status`: `PENDING` → `CONFIRMED` → `COMPLETED` / `CANCELLED`
- **Relazioni**: 
  - 1:1 con `EscrowSession`
  - 1:1 con `EscrowPayment` (futuro)

### 1.2 EscrowSession
**Responsabilità**: Sessione escrow locale con state machine dettagliata
- **Campi chiave**:
  - `id`: ID univoco sessione
  - `transactionId`: Link 1:1 con Transaction
  - `buyerId`, `sellerId`, `merchantId`: I 3 partecipanti
  - `status`: State machine dettagliata (vedi sezione 2)
  - `appointmentSlot`: Slot prenotato (DateTime)
  - `expiredAt`: Scadenza per check-in (1 ora dopo slot)
  - `checkInAt`: Quando merchant ha fatto check-in
  - `buyerPresent`, `sellerPresent`: Flags presenza confermate da merchant
  - `qrToken`: Token opaco per QR check-in
  - `qrTokenExpiresAt`: Scadenza token QR
- **Relazioni**:
  - 1:N con `VerificationReport`
  - 1:N con `AuditEvent`

### 1.3 Appointment/Booking
**Responsabilità**: Gestione prenotazioni slot (gestita tramite `SafeTradeTransaction.scheduledDate/Time`)
- **Logica**: 
  - Prevenire doppie prenotazioni stesso slot/negozio
  - Validazione orari disponibili negozio
- **Nota**: Attualmente gestita in `SafeTradeTransaction`, può essere estratta in modello separato in futuro

### 1.4 VerificationReport
**Responsabilità**: Report di verifica merchant con foto e note
- **Campi chiave**:
  - `id`: ID univoco report
  - `sessionId`: Link a EscrowSession
  - `status`: `IN_PROGRESS` → `PASSED` / `FAILED`
  - `verificationPhotos`: Array path foto (minimo 3)
  - `photosMetadata`: Metadata foto (dimensione, hash)
  - `notes`: Note merchant
  - `verifiedAt`: Timestamp verifica
  - `verifiedBy`: ID merchant
- **Regole**:
  - Minimo 3 foto obbligatorie (front/back + dettaglio)
  - Foto ottimizzate (resize + compression)
  - Storage sicuro Supabase

### 1.5 PaymentHold (EscrowPayment)
**Responsabilità**: Gestione fondi in escrow (attualmente fittizio, futuro reale)
- **Campi chiave**:
  - `transactionId`: Link 1:1 con Transaction
  - `amount`: Importo in escrow
  - `status`: `PENDING` → `HELD` → `RELEASED` / `REFUNDED`
  - `paymentMethod`: `CASH` (per locale)
- **Nota**: Sistema wallet ledger fittizio con stesse regole sicurezza

### 1.6 AuditEvent (`AuditEvent` o `EscrowAuditLog`)
**Responsabilità**: Audit trail completo tutte le azioni
- **Campi chiave**:
  - `id`: ID univoco evento
  - `sessionId`: Link a EscrowSession
  - `actionType`: Tipo azione (`CHECK_IN`, `VERIFICATION_STARTED`, `VERIFICATION_PASSED`, `RELEASE_REQUESTED`, ecc.)
  - `performedBy`: ID utente che ha eseguito azione
  - `performedByRole`: Ruolo (`BUYER`, `SELLER`, `MERCHANT`, `ADMIN`, `MODERATOR`)
  - `oldStatus`, `newStatus`: Stati prima/dopo (se transition)
  - `metadata`: Dati aggiuntivi (JSON)
  - `ipAddress`, `userAgent`: Info sicurezza
  - `createdAt`: Timestamp evento

### 1.7 Dispute
**Responsabilità**: Gestione dispute (già presente nel sistema)
- **Relazione**: Link a `SafeTradeTransaction`
- **Integrazione**: Può essere aperta da vari stati di `EscrowSession`

---

## 2. State Machine EscrowSession

### 2.1 Stati Possibili

```typescript
enum EscrowSessionStatus {
  CREATED              // Sessione creata, non ancora prenotata
  BOOKED               // Slot prenotato, in attesa data appuntamento
  CHECKIN_PENDING      // Data appuntamento arrivata, in attesa check-in
  CHECKED_IN           // Merchant ha confermato presenza buyer+seller
  VERIFICATION_IN_PROGRESS // Verifica merchant in corso
  VERIFICATION_PASSED      // Verifica superata
  VERIFICATION_FAILED      // Verifica fallita
  RELEASE_REQUESTED        // Rilascio fondi richiesto
  RELEASE_APPROVED         // Rilascio fondi approvato (doppia conferma)
  COMPLETED                // Sessione completata con successo
  DISPUTED                 // Dispute aperta (da vari stati)
  CANCELLED                // Sessione cancellata (da CREATED/BOOKED)
  EXPIRED                  // Check-in non avvenuto entro 1 ora (da BOOKED/CHECKIN_PENDING)
}
```

### 2.2 Transizioni Valide e Permessi

| Da Stato | A Stato | Trigger | Chi Può Eseguire |
|----------|---------|---------|------------------|
| `CREATED` | `BOOKED` | Prenotazione slot | `BUYER`, `SELLER` |
| `BOOKED` | `CHECKIN_PENDING` | Data appuntamento arrivata (auto) | Sistema (cron/job) |
| `CHECKIN_PENDING` | `CHECKED_IN` | Check-in merchant | `MERCHANT` |
| `CHECKIN_PENDING` | `EXPIRED` | Timeout 1 ora (auto) | Sistema |
| `BOOKED` | `EXPIRED` | Timeout 1 ora se manca check-in | Sistema |
| `CHECKED_IN` | `VERIFICATION_IN_PROGRESS` | Avvia verifica | `MERCHANT` |
| `VERIFICATION_IN_PROGRESS` | `VERIFICATION_PASSED` | Verifica OK | `MERCHANT` |
| `VERIFICATION_IN_PROGRESS` | `VERIFICATION_FAILED` | Verifica KO | `MERCHANT` |
| `VERIFICATION_PASSED` | `RELEASE_REQUESTED` | Richiesta rilascio | `BUYER`, `SELLER`, `MERCHANT` |
| `RELEASE_REQUESTED` | `RELEASE_APPROVED` | Doppia conferma | `ADMIN`, `MODERATOR` |
| `RELEASE_APPROVED` | `COMPLETED` | Rilascio completato (auto) | Sistema |
| `*` (qualsiasi) | `DISPUTED` | Apertura dispute | `BUYER`, `SELLER` |
| `CREATED` | `CANCELLED` | Cancellazione | `BUYER`, `SELLER` |
| `BOOKED` | `CANCELLED` | Cancellazione prenotazione | `BUYER`, `SELLER` |
| `EXPIRED` | `CHECKIN_PENDING` | Estensione manuale | `MERCHANT`, `ADMIN` |

### 2.3 Transizioni Speciali

**Estensione Sessione** (`EXPIRED` → `CHECKIN_PENDING`):
- Solo `MERCHANT` o `ADMIN`
- Aggiorna `expiredAt` = now() + 1 ora
- Crea `AuditEvent` con azione `SESSION_EXTENDED`

**Chiusura Sessione Manuale** (`*` → `CANCELLED`):
- Pulsante disponibile per `MERCHANT`, `ADMIN`
- Richiede doppia conferma con popup: "Confermi di voler chiudere definitivamente la sessione?"
- Crea `AuditEvent` con azione `SESSION_CLOSED_MANUAL`

---

## 3. Invarianti Server-Side

### 3.1 Regole Hard (bloccanti)

1. **CHECK-IN**: 
   - `CHECKED_IN` possibile solo se `buyerPresent = true` AND `sellerPresent = true`
   - Solo `MERCHANT` può eseguire check-in

2. **VERIFICA**:
   - `VERIFICATION_*` possibile solo da stato `CHECKED_IN`
   - Minimo 3 foto obbligatorie per `VERIFICATION_PASSED`
   - Solo `MERCHANT` può eseguire verifica

3. **RELEASE**:
   - `RELEASE_*` possibile solo da stato `VERIFICATION_PASSED`
   - Solo `ADMIN` o `MODERATOR` può approvare release
   - Doppia conferma obbligatoria (`firstClickAt` + `confirmClickAt`)

4. **TIMEOUT**:
   - Auto `EXPIRED` se `now() > expiredAt` e stato `BOOKED` o `CHECKIN_PENDING`
   - `expiredAt` = `appointmentSlot` + 1 ora

5. **TRANSAZIONE STATO**:
   - Ogni transizione scrive `AuditEvent`
   - Validazione stato attuale prima di transizione
   - Transizioni illegali vengono rifiutate (400/403)

6. **BOOKING**:
   - Prevenire doppie prenotazioni: stesso `shopId` + stesso `scheduledDate` + stesso `scheduledTime`
   - Validazione orari negozio (opening hours)

### 3.2 Regole Soft (warning)

1. **Notifica**: Avvisa buyer/seller quando `CHECKIN_PENDING`
2. **Reminder**: Notifica 30 minuti prima scadenza check-in
3. **Alert**: Notifica admin quando dispute aperta

---

## 4. QR Model e Scan Landing

### 4.1 Token QR Opaco

**Generazione**:
```typescript
qrToken = generateSecureToken({
  type: 'ESCROW_CHECKIN',
  sessionId: session.id,
  timestamp: now(),
  random: crypto.randomBytes(16).toString('hex')
})
// Esempio: "escrow_ck_a1b2c3d4e5f6..."
```

**Storage**:
- Campo `EscrowSession.qrToken`: String univoco
- Campo `EscrowSession.qrTokenExpiresAt`: DateTime (7 giorni dalla creazione)

**Rotazione/Sicurezza**:
- Token revocabile se sospetto (rotate)
- Rate limit basico su resolve token (10 richieste/minuto)

### 4.2 Route Pubblica `/scan/[token]`

**Comportamento**:
1. **Risolve token** → identifica `entityType` = `CHECKIN_SESSION`
2. **Se non loggato**: Mostra pagina info minima + CTA "Accedi"
3. **Se loggato ma non autorizzato**: 
   - Mostra info minima (nome negozio, data appuntamento)
   - Messaggio "Non autorizzato" (no azioni disponibili)
4. **Se autorizzato** (`MERCHANT` per quella sessione):
   - Mostra info completa sessione
   - CTA contestuali:
     - "Esegui check-in" (se `CHECKIN_PENDING`)
     - "Avvia verifica" (se `CHECKED_IN`)
     - "Apri sessione" (vista dettaglio)

**Info Mostrate**:
- Nome negozio
- Data/ora appuntamento
- Buyer/Seller (se autorizzato)
- Stato sessione
- Importo transazione (se autorizzato)

**Anti-Abuso**:
- Rate limit: 10 richieste/minuto per IP
- Token expiration check
- Audit log accessi non autorizzati (`SecurityAuditLog`)

---

## 5. Foto Verification

### 5.1 Requisiti

**Minimo 3 foto obbligatorie**:
1. **Front**: Fronte carta/oggetto
2. **Back**: Retro carta/oggetto
3. **Dettaglio**: Dettaglio difetti/olografia/angoli

**Checklist verifica**:
- ✅ Presenza minima 3 foto
- ✅ Qualità foto sufficiente (dimensione minima)
- ✅ Note opzionali merchant

### 5.2 Pipeline Immagini

**Upload Time**:
1. **Resize**: Max width 1600px (mantiene aspect ratio)
2. **Compression**: Qualità 85% (JPEG)
3. **Thumbnail**: Genera thumbnail 400px
4. **EXIF Removal**: Rimuovi metadati EXIF (privacy)

**Storage**:
- **Path**: `escrow-sessions/{sessionId}/verification/{photoId}-{originalName}`
- **Thumbnail Path**: `escrow-sessions/{sessionId}/verification/thumbs/{photoId}-thumb.jpg`
- **Access Control**: Solo `BUYER`, `SELLER`, `MERCHANT`, `ADMIN`, `MODERATOR`

**Metadata Storage** (in `VerificationReport.photosMetadata`):
```json
{
  "photos": [
    {
      "url": "https://...",
      "thumbnailUrl": "https://...",
      "originalName": "photo1.jpg",
      "size": 245678,
      "width": 1600,
      "height": 1200,
      "uploadedAt": "2025-01-27T10:00:00Z"
    }
  ]
}
```

### 5.3 Access Control

**Supabase Storage Policy**:
- Leggi: Solo utenti autorizzati (buyer/seller/merchant/admin/moderator)
- Scrittura: Solo merchant della sessione

**Validazione Upload**:
- Max 5MB per foto
- Formati: JPEG, PNG, WebP
- Validazione server-side numero foto (minimo 3)

---

## 6. Booking e Timeout

### 6.1 Booking (Prenotazione Slot)

**Validazione**:
- Prevenire doppie prenotazioni: query `SafeTradeTransaction` per `shopId` + `scheduledDate` + `scheduledTime`
- Validazione orari negozio (da `Shop.openingHours`)

**Creazione**:
- Stato iniziale: `CREATED`
- Dopo selezione slot: `BOOKED`
- Imposta `appointmentSlot` = `scheduledDate` + `scheduledTime`
- Imposta `expiredAt` = `appointmentSlot` + 1 ora

### 6.2 Timeout Automatico

**Job/Cron** (eseguire ogni 5 minuti):
```typescript
// Trova sessioni scadute
const expiredSessions = await prisma.escrowSession.findMany({
  where: {
    status: { in: ['BOOKED', 'CHECKIN_PENDING'] },
    expiredAt: { lte: new Date() }
  }
})

// Marca come EXPIRED
for (const session of expiredSessions) {
  await transitionSession(session.id, 'EXPIRED', 'SYSTEM')
  await createAuditEvent({
    sessionId: session.id,
    actionType: 'SESSION_EXPIRED',
    performedBy: 'SYSTEM',
    metadata: { expiredAt: session.expiredAt }
  })
}
```

**Trigger Alternativo** (lato server su accesso):
- Verifica timeout quando si accede a sessione
- Se `now() > expiredAt` e stato `BOOKED`/`CHECKIN_PENDING` → auto `EXPIRED`

### 6.3 Estensione Manuale

**Pulsante "Estendi sessione"**:
- Disponibile per `MERCHANT`, `ADMIN`
- Visibile quando stato `EXPIRED`
- Azione:
  - `expiredAt` = `now() + 1 ora`
  - Transizione `EXPIRED` → `CHECKIN_PENDING` (se possibile)
  - Crea `AuditEvent` (`SESSION_EXTENDED`)

---

## 7. Rilascio Fondi

### 7.1 Workflow Approvazione Manuale

**Step 1 - Richiesta Rilascio** (`VERIFICATION_PASSED` → `RELEASE_REQUESTED`):
- Trigger: `BUYER`, `SELLER`, o `MERCHANT` richiede rilascio
- Crea `PendingRelease` con status `PENDING`
- Notifica `ADMIN` e `MODERATOR`

**Step 2 - Doppia Conferma** (`RELEASE_REQUESTED` → `RELEASE_APPROVED`):
- Solo `ADMIN` o `MODERATOR` può approvare
- Doppia conferma:
  1. Primo click → mostra popup conferma
  2. Secondo click conferma → approva
- Timestamp: `firstClickAt`, `confirmClickAt` (differenza minima 1 secondo)
- Crea `FinancialAuditLog` con doppio timestamp

**Step 3 - Completamento** (`RELEASE_APPROVED` → `COMPLETED`):
- Sistema completa automaticamente
- Aggiorna `EscrowPayment` status `RELEASED` (se presente)
- Notifica buyer/seller/merchant

### 7.2 Wallet Ledger Fittizio

**Se pagamenti reali non attivi**:
- Usa `EscrowWallet` (fittizio)
- Stesse regole di sicurezza:
  - `PendingRelease` workflow
  - `FinancialAuditLog` audit
  - Doppia conferma
- Facile sostituire con provider reale (Stripe/PayPal) senza riscrivere logiche

---

## 8. Dispute e Audit Trail

### 8.1 Dispute

**Integrazione con EscrowSession**:
- Dispute può essere aperta da stati:
  - `VERIFICATION_IN_PROGRESS`
  - `VERIFICATION_FAILED`
  - `VERIFICATION_PASSED`
  - `RELEASE_REQUESTED`
- Quando dispute aperta:
  - `EscrowSession.status` → `DISPUTED`
  - Blocca transizioni normali
  - Unlock dopo risoluzione dispute

### 8.2 Audit Trail

**Ogni Azione Crea AuditEvent**:
- Check-in: `CHECK_IN`
- Verifica: `VERIFICATION_STARTED`, `VERIFICATION_PASSED`, `VERIFICATION_FAILED`
- Release: `RELEASE_REQUESTED`, `RELEASE_APPROVED`
- Timeout: `SESSION_EXPIRED`
- Estensione: `SESSION_EXTENDED`
- Chiusura: `SESSION_CLOSED_MANUAL`

**Query Audit**:
- Filtro per `sessionId`
- Filtro per `actionType`
- Filtro per `performedBy`
- Ordinamento cronologico (`createdAt DESC`)

---

## 9. Edge Cases e Sicurezza

### 9.1 Edge Cases

1. **No Show**:
   - Timeout automatico → `EXPIRED`
   - Notifica buyer/seller

2. **Spoof QR**:
   - Token opaco non prevedibile
   - Validazione server-side autorizzazioni
   - Rate limiting

3. **Cambio Stato Illegale**:
   - Validazione server-side state machine
   - Guard centralizzata (funzione `canTransition()`)
   - Rifiuto transizioni illegali (400/403)

4. **Doppio Check-in**:
   - Solo merchant può fare check-in (non buyer/seller)
   - Idempotenza: se già `CHECKED_IN`, ignora

5. **Verifica Senza Check-in**:
   - Guard: `VERIFICATION_*` solo da `CHECKED_IN`
   - Rifiuto se stato non valido

### 9.2 Sicurezza

- **Rate Limiting**: 10 richieste/minuto su scan token
- **Token Rotation**: Possibilità di rigenerare token se compromesso
- **Access Control**: Verifica autorizzazioni su ogni endpoint
- **Audit Logging**: Tutte le azioni loggate
- **Security Audit Log**: Tentativi accesso non autorizzati

---

## 10. Notifiche Realtime

**Eventi Notificati** (via Supabase Realtime o polling):
- Check-in completato → Notifica buyer/seller
- Verifica iniziata → Notifica buyer/seller
- Verifica completata → Notifica buyer/seller
- Release approvato → Notifica buyer/seller/merchant
- Timeout scaduto → Notifica buyer/seller
- Dispute aperta → Notifica admin/moderator

---

**Fine Specifica**

