# 🧪 Guida Completa Test: Richiesta Teca Vault

## 📋 Prerequisiti

- ✅ Account **MERCHANT** con negozio **APPROVATO** e attivo
- ✅ Account **ADMIN** per approvare richieste e confermare pagamenti
- ✅ Server in esecuzione (`npm run dev`)

---

## 🎯 Flusso Completo di Test

### **FASE 1: Richiesta Teca (Merchant)**

#### Step 1.1: Accedi come Merchant
1. Vai su `http://localhost:3000/login`
2. Accedi con le credenziali del tuo account **MERCHANT**
3. Verifica di essere nella dashboard merchant

#### Step 1.2: Vai alla Pagina Richieste Teca
1. Naviga a `/merchant/vault/requests`
   - Oppure clicca sul link nel menu (se presente)
2. Dovresti vedere la pagina "Richieste Teca Vault"

#### Step 1.3: Crea una Nuova Richiesta
1. Cerca il pulsante **"Richiedi Teca Vault"** in alto a destra (o al centro se non ci sono richieste)
2. Clicca sul pulsante
3. ✅ **Verifica**: Si apre un dialog "Richiedi Teca Vault"
4. Compila il form:
   - **Note** (opzionale): Es. "Richiesta teca Vault per DemoStore"
5. Clicca **"Invia Richiesta"**
6. ✅ **Verifica**: Dovresti vedere un messaggio di successo: **"Richiesta Inviata"**
7. ✅ **Verifica**: Il dialog si chiude
8. ✅ **Verifica**: La richiesta appare nella lista con status **"PENDING"**

#### Step 1.4: Verifica Notifica Admin
1. **Non chiudere questa scheda**, apri una **nuova scheda** in incognito
2. Accedi come **ADMIN**
3. Controlla la **campanella delle notifiche** (in alto a destra)
4. ✅ **Verifica**: Dovresti vedere una notifica **"Nuova Richiesta Teca Vault"**
5. Clicca sulla notifica
6. ✅ **Verifica**: Dovresti essere reindirizzato a `/admin/vault/requests`

---

### **FASE 2: Approvazione Richiesta (Admin)**

#### Step 2.1: Visualizza la Richiesta
1. Nella pagina `/admin/vault/requests`, dovresti vedere la richiesta appena creata
2. ✅ **Verifica**: Status = **"PENDING"**
3. ✅ **Verifica**: Vedi i dettagli del negozio e le note del merchant

#### Step 2.2: Approva la Richiesta
1. Clicca sul pulsante **"Approva"** (o simile)
2. Opzionalmente, aggiungi **"Note Admin"** (es. "Approvata per test")
3. Clicca **"Conferma Approvazione"**
4. ✅ **Verifica**: La richiesta ora ha status **"APPROVED"**
5. ✅ **Verifica**: Vedi la data di approvazione

#### Step 2.3: Verifica Notifica Merchant
1. **Torna alla scheda del MERCHANT**
2. Controlla la **campanella delle notifiche**
3. ✅ **Verifica**: Dovresti vedere una notifica **"Richiesta Teca Vault Approvata! 🎉"**
4. Clicca sulla notifica
5. ✅ **Verifica**: Dovresti essere reindirizzato a `/merchant/vault/requests`

---

### **FASE 3: Pagamento Bonifico (Merchant)**

#### Step 3.1: Visualizza Richiesta Approvata
1. Nella pagina `/merchant/vault/requests`, dovresti vedere la richiesta con status **"APPROVED"**
2. ✅ **Verifica**: Vedi il pannello **"Prossimi Passi"**
3. ✅ **Verifica**: Vedi il pulsante **"Procedi con il Pagamento"**

#### Step 3.2: Apri Dialog Pagamento
1. Clicca **"Procedi con il Pagamento"**
2. ✅ **Verifica**: Si apre un dialog con:
   - **Intestatario**: SafeTrade S.r.l.
   - **IBAN**: IT60 X054 2811 1010 0000 0123 456
   - **BIC/SWIFT**: BCITITMM
   - **Importo**: € 299,00
   - **Causale**: Teca Vault - [Nome Negoziante]

#### Step 3.3: Conferma Invio Bonifico
1. Clicca **"Ho Inviato il Bonifico"**
2. ✅ **Verifica**: Si apre un **dialog di conferma** con:
   - Messaggio: "Sei sicuro di aver inviato il bonifico?"
   - Box di attenzione giallo
   - Pulsanti: "Annulla" e "Sì, Confermo"

#### Step 3.4: Conferma Finale
1. Clicca **"Sì, Confermo"**
2. ✅ **Verifica**: Vedi un messaggio di successo: **"Bonifico Confermato"**
3. ✅ **Verifica**: Il dialog si chiude
4. ✅ **Verifica**: La richiesta ora ha **paymentStatus = "PENDING"**

#### Step 3.5: Verifica Notifica Admin
1. **Torna alla scheda ADMIN**
2. Controlla la **campanella delle notifiche**
3. ✅ **Verifica**: Dovresti vedere una notifica **"Pagamento Bonifico in Attesa di Verifica"**
4. Clicca sulla notifica
5. ✅ **Verifica**: Dovresti essere reindirizzato a `/admin/vault/requests`

---

### **FASE 4: Verifica Pagamento (Admin)**

#### Step 4.1: Vai alla Tab "Verifica Pagamenti"
1. Nella pagina `/admin/vault/requests`, clicca sulla tab **"Verifica Pagamenti"**
2. ✅ **Verifica**: Dovresti vedere la richiesta con:
   - Status: **"APPROVED"**
   - Payment Status: **"PENDING"**

#### Step 4.2: Conferma Pagamento Ricevuto
1. Cerca il pannello **"Verifica Pagamento"**
2. Opzionalmente, aggiungi **"Note Admin"** (es. "Pagamento ricevuto via bonifico")
3. Clicca **"Conferma Pagamento Ricevuto"**
4. ✅ **Verifica**: Vedi un messaggio di successo
5. ✅ **Verifica**: La richiesta ora ha:
   - Status: **"PAID"** (o **"COMPLETED"**)
   - Payment Status: **"PAID"**

#### Step 4.3: Verifica Creazione Teca
1. ✅ **Verifica**: Il sistema ha creato automaticamente una **VaultCase** con 30 slot
2. ✅ **Verifica**: Ogni slot ha un **QR code** generato
3. ✅ **Verifica**: Il negozio ha `vaultCaseAuthorized = true`

#### Step 4.4: Verifica Notifica Merchant
1. **Torna alla scheda MERCHANT**
2. Controlla la **campanella delle notifiche**
3. ✅ **Verifica**: Dovresti vedere una notifica **"Pagamento Confermato e Teca Attiva! ✅"**
4. Clicca sulla notifica
5. ✅ **Verifica**: Dovresti essere reindirizzato a `/merchant/vault/requests`

---

### **FASE 5: Verifica Finale (Merchant)**

#### Step 5.1: Visualizza Richiesta Completata
1. Nella pagina `/merchant/vault/requests`, dovresti vedere la richiesta con:
   - Status: **"Pagata - Teca in Preparazione"** (o simile)
   - ✅ **Verifica**: Vedi la data di approvazione
   - ✅ **Verifica**: Vedi la data di pagamento (se disponibile)

#### Step 5.2: Verifica Messaggio Finale
1. ✅ **Verifica**: Vedi il messaggio:
   > "Il pagamento è stato ricevuto. La teca è in preparazione e ti verrà assegnata a breve."

---

## ✅ Checklist Test Completo

### **Fase 1: Richiesta**
- [ ] Merchant può creare una richiesta
- [ ] Richiesta appare con status PENDING
- [ ] Admin riceve notifica
- [ ] Notifica admin porta a `/admin/vault/requests`

### **Fase 2: Approvazione**
- [ ] Admin può approvare la richiesta
- [ ] Richiesta cambia status in APPROVED
- [ ] Merchant riceve notifica
- [ ] Notifica merchant porta a `/merchant/vault/requests`

### **Fase 3: Pagamento**
- [ ] Merchant vede pulsante "Procedi con il Pagamento"
- [ ] Dialog mostra dati bancari corretti
- [ ] Dialog di conferma funziona
- [ ] PaymentStatus cambia in PENDING
- [ ] Admin riceve notifica

### **Fase 4: Verifica Pagamento**
- [ ] Admin vede richiesta in tab "Verifica Pagamenti"
- [ ] Admin può confermare pagamento
- [ ] Status cambia in PAID/COMPLETED
- [ ] VaultCase viene creata automaticamente
- [ ] 30 slot con QR vengono generati
- [ ] Merchant riceve notifica
- [ ] Notifica merchant porta a `/merchant/vault/requests`

### **Fase 5: Verifica Finale**
- [ ] Merchant vede status finale corretto
- [ ] Messaggio finale è visibile
- [ ] Tutte le date sono corrette

---

## 🐛 Problemi Comuni e Soluzioni

### **Problema 1: Notifica non arriva**
- **Soluzione**: Verifica che il server sia in esecuzione
- **Soluzione**: Controlla la console del browser per errori
- **Soluzione**: Verifica che l'utente sia loggato correttamente

### **Problema 2: Link notifica sbagliato**
- **Soluzione**: Verifica che il link sia `/merchant/vault/requests` (non `/merchant/shop`)
- **Soluzione**: Ricarica la pagina dopo aver cliccato la notifica

### **Problema 3: Richiesta non appare**
- **Soluzione**: Verifica che il negozio sia approvato
- **Soluzione**: Controlla i filtri nella pagina
- **Soluzione**: Ricarica la pagina

### **Problema 4: Dialog pagamento non si apre**
- **Soluzione**: Verifica che la richiesta sia APPROVED
- **Soluzione**: Controlla la console del browser per errori JavaScript

### **Problema 5: Teca non viene creata**
- **Soluzione**: Controlla i log del server
- **Soluzione**: Verifica che il pagamento sia stato confermato correttamente
- **Soluzione**: Controlla il database per vedere se la VaultCase esiste

---

## 📝 Note Aggiuntive

- **Test in parallelo**: Puoi testare con più account merchant contemporaneamente
- **Test di rifiuto**: Prova anche a rifiutare una richiesta per verificare il flusso completo
- **Test di errore**: Prova a chiudere il browser durante il pagamento per vedere come si comporta il sistema

---

## 🎉 Fine Test

Una volta completato tutto il flusso, dovresti avere:
- ✅ Una richiesta teca completa (PENDING → APPROVED → PAID)
- ✅ Una VaultCase creata con 30 slot
- ✅ Tutte le notifiche funzionanti
- ✅ Tutti i link corretti

**Buon test! 🚀**

