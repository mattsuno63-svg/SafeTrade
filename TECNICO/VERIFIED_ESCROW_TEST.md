# 🧪 Verified Escrow - Test Checklist

**Data Creazione**: 2025-01-27  
**Versione**: 1.0  
**Status**: In Sviluppo

---

## 📋 Account di Test

### Seller Account
- **Email**: `seller@test.com`
- **Password**: `Seller123!`
- **Città**: `Milano`
- **Ruolo**: `USER`

### Buyer Account
- **Email**: `buyer@test.com`
- **Password**: `Buyer123!`
- **Città**: `Roma` (diversa da seller per testare Verified Escrow)
- **Ruolo**: `USER`

### Hub Staff Account
- **Email**: `hubstaff@test.com`
- **Password**: `HubStaff123!`
- **Ruolo**: `HUB_STAFF`

### Admin Account
- **Email**: `admin@test.com`
- **Password**: `Admin123!`
- **Ruolo**: `ADMIN`

---

## ✅ Checklist Test

### Fase 1: Setup e Registrazione

- [ ] **1.1** Registrazione Seller con città obbligatoria
  - [ ] Verificare che città sia campo obbligatorio
  - [ ] Verificare che maxDistance sia settato a 50km di default
  - [ ] Verificare che città sia salvata correttamente

- [ ] **1.2** Registrazione Buyer con città diversa
  - [ ] Verificare che città sia obbligatoria
  - [ ] Verificare che maxDistance sia settato correttamente

- [ ] **1.3** Verifica filtro geografico negozi
  - [ ] Login come Seller (Milano)
  - [ ] Verificare che `/api/shops` filtri automaticamente per distanza
  - [ ] Verificare che negozi fuori range non appaiano
  - [ ] Verificare che se nessun negozio disponibile, appaia messaggio Verified Escrow

---

### Fase 2: Creazione Transazione Verified Escrow

- [ ] **2.1** Seller crea listing
  - [ ] Login come Seller
  - [ ] Creare nuovo listing
  - [ ] Verificare che listing sia approvato

- [ ] **2.2** Buyer crea proposta
  - [ ] Login come Buyer
  - [ ] Visualizzare listing del Seller
  - [ ] Creare proposta per il listing

- [ ] **2.3** Seller accetta proposta
  - [ ] Login come Seller
  - [ ] Accettare proposta
  - [ ] Verificare che venga reindirizzato a selezione escrow type

- [ ] **2.4** Seller seleziona Verified Escrow
  - [ ] Verificare che pagina `/select-escrow-method` funzioni
  - [ ] Selezionare "Verified Escrow"
  - [ ] Verificare che transazione venga creata con `escrowType: VERIFIED`
  - [ ] Verificare che status sia `PENDING_ESCROW_SETUP`

- [ ] **2.5** Verifica notifiche
  - [ ] Buyer riceve notifica "Verified Escrow Creata"
  - [ ] Seller riceve notifica "Verified Escrow Attivato"

---

### Fase 3: Seller Inserisce Tracking

- [ ] **3.1** Seller inserisce tracking number
  - [ ] Login come Seller
  - [ ] Andare a `/transaction/[id]/verified-escrow/setup`
  - [ ] Inserire tracking number valido
  - [ ] Verificare che transazione status cambi a `AWAITING_HUB_RECEIPT`
  - [ ] Verificare che `packageStatus` cambi a `IN_TRANSIT`

- [ ] **3.2** Validazione tracking number
  - [ ] Tentare inserire tracking vuoto → deve essere rifiutato
  - [ ] Tentare inserire tracking formato non valido → deve essere rifiutato
  - [ ] Tentare inserire tracking già utilizzato → deve essere rifiutato

- [ ] **3.3** Rate limiting
  - [ ] Inserire 30 tracking numbers rapidamente
  - [ ] Verificare che dopo 30 richieste, venga applicato rate limit

- [ ] **3.4** Notifiche
  - [ ] Buyer riceve notifica "Pacco Spedito" con tracking number

---

### Fase 4: Hub Staff Riceve Pacco

- [ ] **4.1** Hub Staff marca pacco come ricevuto
  - [ ] Login come HUB_STAFF
  - [ ] Andare a `/admin/hub/packages`
  - [ ] Visualizzare transazione in stato `AWAITING_HUB_RECEIPT`
  - [ ] Cliccare "Marca come Ricevuto"
  - [ ] Verificare che status cambi a `HUB_RECEIVED`
  - [ ] Verificare che `packageStatus` cambi a `RECEIVED_AT_HUB`
  - [ ] Verificare che `packageReceivedAt` sia settato

- [ ] **4.2** Autorizzazione
  - [ ] Tentare accedere come USER normale → deve essere rifiutato
  - [ ] Solo HUB_STAFF/ADMIN possono marcare ricevuto

- [ ] **4.3** Notifiche
  - [ ] Seller riceve notifica "Pacco ricevuto all'hub"
  - [ ] Buyer riceve notifica "Pacco ricevuto, verifica in corso"

---

### Fase 5: Hub Staff Avvia Verifica

- [ ] **5.1** Hub Staff avvia verifica
  - [ ] Login come HUB_STAFF
  - [ ] Cliccare "Avvia Verifica" sulla transazione
  - [ ] Verificare che status cambi a `VERIFICATION_IN_PROGRESS`
  - [ ] Verificare che `packageStatus` cambi a `VERIFICATION_IN_PROGRESS`

- [ ] **5.2** Autorizzazione
  - [ ] Solo HUB_STAFF/ADMIN possono avviare verifica

---

### Fase 6: Hub Staff Completa Verifica

- [ ] **6.1** Hub Staff carica foto verifica
  - [ ] Login come HUB_STAFF
  - [ ] Andare a `/admin/hub/packages/[id]/verify`
  - [ ] Caricare minimo 3 foto
  - [ ] Inserire note verifica
  - [ ] Selezionare risultato: `PASSED` o `FAILED`

- [ ] **6.2** Validazione foto
  - [ ] Tentare caricare solo 2 foto → deve essere rifiutato
  - [ ] Tentare caricare foto troppo grandi → deve essere ottimizzata
  - [ ] Verificare che foto vengano salvate su Supabase Storage

- [ ] **6.3** Verifica PASSED
  - [ ] Selezionare `PASSED`
  - [ ] Verificare che status cambi a `VERIFICATION_PASSED`
  - [ ] Verificare che `packageVerifiedAt` sia settato
  - [ ] Verificare che `verificationPhotos` contenga le foto
  - [ ] Verificare che `VerificationReport` sia creato

- [ ] **6.4** Verifica FAILED
  - [ ] Selezionare `FAILED`
  - [ ] Inserire motivo fallimento
  - [ ] Verificare che status cambi a `VERIFICATION_FAILED`
  - [ ] Verificare che notifiche vengano inviate a seller e buyer
  - [ ] Verificare che transazione vada in stato di rimborso

---

### Fase 7: Hub Staff Rispedisce a Buyer

- [ ] **7.1** Hub Staff inserisce return tracking
  - [ ] Login come HUB_STAFF
  - [ ] Transazione in stato `VERIFICATION_PASSED`
  - [ ] Inserire return tracking number
  - [ ] Verificare che status cambi a `SHIPPED_TO_BUYER`
  - [ ] Verificare che `packageShippedAt` sia settato
  - [ ] Verificare che `returnTrackingNumber` sia salvato

- [ ] **7.2** Validazione
  - [ ] Tentare rispedire senza verifica PASSED → deve essere rifiutato
  - [ ] Tentare rispedire senza return tracking → deve essere rifiutato

- [ ] **7.3** Notifiche
  - [ ] Buyer riceve notifica "Pacco rispedito, tracking: XXX"
  - [ ] Seller riceve notifica "Pacco rispedito a buyer"

---

### Fase 8: Buyer Riceve e Conferma

- [ ] **8.1** Buyer conferma ricezione manualmente
  - [ ] Login come Buyer
  - [ ] Andare a `/transaction/[id]/status`
  - [ ] Visualizzare stato `DELIVERED_TO_BUYER` o `IN_TRANSIT_TO_BUYER`
  - [ ] Cliccare "Ho Ricevuto il Pacco"
  - [ ] Verificare che status cambi a `CONFIRMED_BY_BUYER`
  - [ ] Verificare che `confirmedReceivedAt` sia settato
  - [ ] Verificare che `PendingRelease` venga creato

- [ ] **8.2** Autorizzazione
  - [ ] Solo Buyer può confermare ricezione
  - [ ] Tentare confermare come Seller → deve essere rifiutato

- [ ] **8.3** Auto-Release dopo 72h
  - [ ] Simulare 72h dopo `packageDeliveredAt`
  - [ ] Eseguire cron job `/api/admin/cron/check-auto-release`
  - [ ] Verificare che `PendingRelease` venga creato automaticamente
  - [ ] Verificare che status cambi a `RELEASE_REQUESTED`
  - [ ] Verificare che notifica admin venga creata

- [ ] **8.4** Notifiche
  - [ ] Admin riceve notifica "Rilascio fondi in attesa"
  - [ ] Seller riceve notifica "Buyer ha confermato ricezione"

---

### Fase 9: Admin Approva Rilascio Fondi

- [ ] **9.1** Admin visualizza pending release
  - [ ] Login come Admin
  - [ ] Andare a `/admin/pending-releases`
  - [ ] Visualizzare pending release per transazione Verified Escrow
  - [ ] Verificare che dettagli siano corretti (amount, recipient, reason)

- [ ] **9.2** Admin approva rilascio (doppia conferma)
  - [ ] Cliccare "Inizia Approvazione"
  - [ ] Verificare che token venga generato
  - [ ] Cliccare "Conferma Rilascio" con token
  - [ ] Verificare che `PendingRelease.status` cambi a `APPROVED`
  - [ ] Verificare che `EscrowPayment.status` cambi a `RELEASED`
  - [ ] Verificare che transazione status cambi a `COMPLETED`
  - [ ] Verificare che wallet seller venga aggiornato

- [ ] **9.3** Validazione token
  - [ ] Tentare usare token scaduto → deve essere rifiutato
  - [ ] Tentare usare token già utilizzato → deve essere rifiutato
  - [ ] Verificare che token sia valido solo 5 minuti

- [ ] **9.4** Notifiche
  - [ ] Seller riceve notifica "Fondi ricevuti!"
  - [ ] Buyer riceve notifica "Transazione completata"

---

### Fase 10: Edge Cases e Sicurezza

- [ ] **10.1** Tentativo di bypass state machine
  - [ ] Tentare cambiare status direttamente → deve essere rifiutato
  - [ ] Tentare saltare stati → deve essere rifiutato

- [ ] **10.2** Rate limiting
  - [ ] Verificare rate limit su tutte le API critiche
  - [ ] Verificare che rate limit funzioni correttamente

- [ ] **10.3** Autorizzazioni
  - [ ] Verificare che solo ruoli corretti possano eseguire azioni
  - [ ] Verificare che solo seller possa inserire tracking
  - [ ] Verificare che solo buyer possa confermare ricezione
  - [ ] Verificare che solo HUB_STAFF/ADMIN possano verificare

- [ ] **10.4** Validazioni
  - [ ] Verificare che tutti i campi obbligatori siano validati
  - [ ] Verificare che tracking number sia univoco
  - [ ] Verificare che foto siano min 3

- [ ] **10.5** Audit Trail
  - [ ] Verificare che tutte le azioni critiche siano loggate
  - [ ] Verificare che IP address e user agent siano salvati

---

### Fase 11: UI/UX

- [ ] **11.1** Pagina Seller Setup
  - [ ] `/transaction/[id]/verified-escrow/setup`
  - [ ] Form per inserire tracking number
  - [ ] Validazione client-side
  - [ ] Feedback visivo

- [ ] **11.2** Pagina Buyer Status
  - [ ] `/transaction/[id]/status`
  - [ ] Mostra stato transazione
  - [ ] Mostra tracking numbers
  - [ ] Bottone "Ho Ricevuto"
  - [ ] Mostra report verifica (quando disponibile)

- [ ] **11.3** Pagina Hub Staff Packages
  - [ ] `/admin/hub/packages`
  - [ ] Lista pacchi in attesa
  - [ ] Filtri per stato
  - [ ] Azioni rapide (ricevi, verifica, rispedisci)

- [ ] **11.4** Pagina Hub Staff Verify
  - [ ] `/admin/hub/packages/[id]/verify`
  - [ ] Upload foto (min 3)
  - [ ] Form note verifica
  - [ ] Selezione risultato (PASSED/FAILED)
  - [ ] Preview foto caricate

---

## 🐛 Bug Conosciuti

- Nessuno al momento

---

## 📝 Note Test

### Come Eseguire Test

1. **Setup Ambiente**:
   ```bash
   # Assicurati che il database sia aggiornato
   npx prisma db push
   npx prisma generate
   ```

2. **Creare Account di Test**:
   - Usa la pagina signup per creare gli account
   - Verifica le email (o usa script di verifica automatica)

3. **Eseguire Test in Ordine**:
   - Segui la checklist dall'alto verso il basso
   - Ogni fase dipende dalla precedente

4. **Verificare Log**:
   - Controlla console server per errori
   - Controlla database per stati corretti
   - Controlla notifiche create

---

## ✅ Riepilogo Progresso

**Completato**: 0/11 Fasi  
**In Corso**: Setup  
**Bloccato**: Nessuno

---

**Ultimo Aggiornamento**: 2025-01-27


