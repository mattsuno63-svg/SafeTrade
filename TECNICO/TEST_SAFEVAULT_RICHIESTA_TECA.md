# 🧪 Test SafeVault - Richiesta Teca

**Data**: 2025-01-27  
**Obiettivo**: Testare il flusso completo di richiesta teca Vault da parte di un merchant

---

## 📋 PREPARAZIONE

### Account Necessari

1. **Account Merchant** (negozio di prova)
   - Email: `seller@test.com` (o account merchant esistente)
   - Ruolo: `MERCHANT`
   - Shop: Deve avere un negozio creato e approvato
   - Shop NON deve avere già `vaultCaseAuthorized = true`

2. **Account Admin**
   - Email: `admin@test.com` (o account admin esistente)
   - Ruolo: `ADMIN`

---

## 🎯 FLUSSO TEST COMPLETO

### STEP 1: Login come Merchant

1. **Apri browser** e vai su `http://localhost:3000`
2. **Logout** se sei loggato con altro account
3. **Login** con account merchant:
   - Email: `seller@test.com`
   - Password: (password del tuo account merchant)

### STEP 2: Verifica Shop e Richiedi Teca

1. **Vai alla pagina Shop**:
   - URL: `http://localhost:3000/merchant/shop`
   - Oppure: Menu → "Il Mio Negozio"

2. **Verifica stato Vault**:
   - Cerca la sezione "SafeTrade Vault"
   - Dovresti vedere:
     - ✅ "Il tuo negozio non ha ancora una teca Vault autorizzata"
     - ✅ Bottone "Richiedi Teca Vault"

3. **Clicca "Richiedi Teca Vault"**:
   - Si apre un dialog/modal
   - Clicca "Conferma" o "Invia Richiesta"

4. **Verifica messaggio di successo**:
   - ✅ Toast: "Richiesta inviata con successo"
   - ✅ La sezione Vault mostra: "Richiesta in attesa di approvazione"

### STEP 3: Verifica Notifica Admin

1. **Apri nuova scheda** (o nuovo browser/incognito)
2. **Login come Admin**:
   - Email: `admin@test.com`
   - Password: (password del tuo account admin)

3. **Verifica Campanella Notifiche**:
   - Cerca la **campanella 🔔** nell'header (in alto a destra)
   - Dovrebbe mostrare un **badge rosso con numero** (es: "1")
   - Clicca sulla campanella

4. **Verifica Notifica**:
   - ✅ Dovresti vedere una notifica:
     - **Titolo**: "Nuova Richiesta Teca Vault"
     - **Messaggio**: "[Nome Merchant] ha richiesto una teca Vault per il negozio '[Nome Negozio]'"
     - **Priorità**: NORMAL
     - **Data**: Ora corrente

5. **Clicca sulla notifica**:
   - Dovrebbe portarti alla pagina di gestione richieste teche
   - Se non esiste ancora, dovrebbe portare a `/admin/applications` o pagina simile

### STEP 4: Verifica Database (Opzionale)

Apri Prisma Studio o query database:

```sql
-- Verifica richiesta creata
SELECT * FROM "VaultCaseRequest" ORDER BY "createdAt" DESC LIMIT 1;

-- Verifica notifica admin creata
SELECT * FROM "AdminNotification" 
WHERE type = 'VAULT_CASE_REQUEST' 
ORDER BY "createdAt" DESC LIMIT 1;
```

**Risultati attesi**:
- ✅ `VaultCaseRequest` con `status = 'PENDING'`
- ✅ `AdminNotification` con `type = 'VAULT_CASE_REQUEST'`
- ✅ `AdminNotification.referenceId` corrisponde a `VaultCaseRequest.id`

---

## 🔍 CHECKLIST VERIFICA

### Merchant Side
- [ ] Login merchant funziona
- [ ] Pagina `/merchant/shop` mostra sezione Vault
- [ ] Bottone "Richiedi Teca Vault" è visibile e cliccabile
- [ ] Dialog di conferma si apre correttamente
- [ ] Richiesta viene inviata con successo
- [ ] Toast di successo viene mostrato
- [ ] Stato Vault si aggiorna a "pending"

### Admin Side
- [ ] Login admin funziona
- [ ] Campanella notifiche mostra badge con numero
- [ ] Notifica `VAULT_CASE_REQUEST` è presente nella lista
- [ ] Notifica mostra informazioni corrette (merchant, negozio)
- [ ] Clic sulla notifica porta alla pagina corretta

### Database
- [ ] `VaultCaseRequest` viene creato con `status = 'PENDING'`
- [ ] `AdminNotification` viene creato con `type = 'VAULT_CASE_REQUEST'`
- [ ] `AdminNotification.referenceId` corrisponde a `VaultCaseRequest.id`
- [ ] `AdminNotification.targetRoles` contiene `['ADMIN', 'HUB_STAFF']`

---

## 🐛 PROBLEMI COMUNI E SOLUZIONI

### Problema 1: "Shop non trovato"
**Causa**: Il merchant non ha un shop creato o approvato  
**Soluzione**: 
- Verifica che il merchant abbia completato la registrazione shop
- Verifica che lo shop sia `isApproved = true`

### Problema 2: "Hai già una richiesta in attesa"
**Causa**: Esiste già una `VaultCaseRequest` con `status = 'PENDING'`  
**Soluzione**:
- Vai in Prisma Studio
- Trova la richiesta pendente e aggiorna `status` a `'REJECTED'` o `'CANCELLED'`

### Problema 3: "Questo shop ha già una teca Vault autorizzata"
**Causa**: Lo shop ha già `vaultCaseAuthorized = true` o `vaultCase` assegnato  
**Soluzione**:
- In Prisma Studio, aggiorna `Shop.vaultCaseAuthorized = false`
- Rimuovi `Shop.vaultCase` se presente

### Problema 4: Notifica non appare nella campanella admin
**Causa**: Possibili problemi:
- `AdminNotification` non viene creato (errore silenzioso)
- `AdminNotificationBell` non gestisce `VAULT_CASE_REQUEST`
- Cache del browser

**Soluzione**:
1. Verifica console server per errori
2. Verifica database che la notifica esista
3. Hard refresh browser (Ctrl+Shift+R)
4. Verifica che `AdminNotificationBell` gestisca `VAULT_CASE_REQUEST`

### Problema 5: Clic sulla notifica non porta alla pagina corretta
**Causa**: `AdminNotificationBell` non ha handler per `VAULT_CASE_REQUEST`  
**Soluzione**: Aggiornare `AdminNotificationBell` per gestire questo tipo

---

## 📝 NOTE TECNICHE

### API Endpoint
- **POST** `/api/vault/requests`
  - Body: `{ shopId: string }`
  - Response: `{ data: VaultCaseRequest, message: string }`

### Notifica Admin
- **Type**: `VAULT_CASE_REQUEST`
- **ReferenceType**: `VAULT_CASE_REQUEST`
- **ReferenceId**: `VaultCaseRequest.id`
- **TargetRoles**: `['ADMIN', 'HUB_STAFF']`
- **Priority**: `NORMAL`

### Stato Richiesta
- **PENDING**: Richiesta creata, in attesa approvazione
- **APPROVED**: Approvata, in attesa pagamento
- **REJECTED**: Rifiutata
- **PAID**: Pagata, teca da creare
- **COMPLETED**: Teca creata e assegnata
- **CANCELLED**: Cancellata dal merchant

---

## ✅ RISULTATO ATTESO

Dopo aver completato tutti gli step:

1. ✅ Merchant ha inviato richiesta teca
2. ✅ Admin ha ricevuto notifica nella campanella
3. ✅ Database contiene `VaultCaseRequest` e `AdminNotification`
4. ✅ Admin può vedere e gestire la richiesta

---

**Prossimo Step**: Dopo aver verificato che la notifica arriva, procedere con l'approvazione della richiesta e creazione della teca.

