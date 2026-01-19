# 📖 Guida Completa ADMIN - Gestione QR Codes Vault

## 🎯 Panoramica

Questa guida ti spiega come gestire le **teche Vault** e i **QR codes** come **ADMIN**:
- Creare nuove teche (già automatico quando si conferma pagamento)
- Visualizzare tutte le teche
- Generare QR codes per gli slot
- Stampare QR codes per le teche
- Gestire autorizzazioni teche

---

## 📋 Prerequisiti

- ✅ Account **ADMIN** o **HUB_STAFF** attivo
- ✅ Server in esecuzione
- ✅ Accesso alla sezione admin

---

## 🚀 FUNZIONALITÀ PRINCIPALI

### **1. CREAZIONE AUTOMATICA TECHE**

#### 1.1: Quando viene Creata una Teca?

Una teca viene **creata automaticamente** quando:
1. Un merchant richiede una teca Vault
2. L'admin approva la richiesta
3. Il merchant conferma il pagamento
4. L'admin conferma il pagamento ricevuto

✅ **Risultato**: 
- Viene creata una nuova `VaultCase` con 30 slot (S01-S30)
- Ogni slot riceve automaticamente un **QR token** univoco
- La teca viene autorizzata per il negozio del merchant
- Il merchant riceve una notifica

#### 1.2: Verifica Creazione Teca

1. Vai su `/admin/vault/requests`
2. Cerca la richiesta con status **"PAID"** o **"COMPLETED"**
3. ✅ **Verifica**: La teca è stata creata automaticamente
4. Vai su `/admin/vault/cases` (se esiste) per vedere tutte le teche

---

### **2. VISUALIZZARE TUTTE LE TECHE**

#### Step 2.1: Accedi alla Lista Teche

**Opzione A - Via API (se non esiste pagina UI):**
1. Vai su `http://localhost:3000/api/vault/cases`
2. ✅ **Verifica**: Vedi un JSON con tutte le teche:
   ```json
   {
     "data": [
       {
         "id": "...",
         "label": "Teca DemoStore",
         "status": "IN_SHOP_ACTIVE",
         "shopId": "...",
         "authorizedShopId": "...",
         "slots": [...]
       }
     ]
   }
   ```

**Opzione B - Via Prisma Studio:**
1. Apri Prisma Studio: `npx prisma studio`
2. Vai al modello `VaultCase`
3. ✅ **Verifica**: Vedi tutte le teche create

#### Step 2.2: Verifica Dettagli Teca

Per ogni teca, puoi vedere:
- **ID**: Identificativo univoco
- **Label**: Nome della teca (es. "Teca DemoStore")
- **Status**: 
  - `IN_HUB` - Teca in magazzino hub
  - `IN_SHOP_ACTIVE` - Teca attiva in negozio
  - `IN_SHOP_INACTIVE` - Teca inattiva
- **Shop ID**: Negozio a cui è assegnata
- **Authorized Shop ID**: Negozio autorizzato
- **Slots**: Array di 30 slot (S01-S30)

---

### **3. GENERARE QR CODES PER GLI SLOT**

#### Step 3.1: Genera QR Code Singolo Slot

**Via API:**
1. Vai su `http://localhost:3000/api/vault/cases/[caseId]/slots/[slotId]/qr`
   - Sostituisci `[caseId]` con l'ID della teca
   - Sostituisci `[slotId]` con l'ID dello slot

2. ✅ **Verifica**: Ricevi un JSON con:
   ```json
   {
     "qrData": "data:image/png;base64,...",
     "qrToken": "VAULT_SLOT_...",
     "slotCode": "S01",
     "caseId": "...",
     "scanUrl": "http://localhost:3000/scan/..."
   }
   ```

3. **Formato SVG** (per stampa):
   - Aggiungi `?format=svg` all'URL
   - Es. `/api/vault/cases/[caseId]/slots/[slotId]/qr?format=svg`
   - ✅ **Verifica**: Ricevi un SVG direttamente

#### Step 3.2: Genera Tutti i QR Codes di una Teca (Batch)

**Via API:**
1. Vai su `http://localhost:3000/api/vault/cases/[caseId]/qr-batch`
   - Sostituisci `[caseId]` con l'ID della teca

2. ✅ **Verifica**: Ricevi un JSON con tutti i 30 QR codes:
   ```json
   {
     "caseId": "...",
     "caseLabel": "Teca DemoStore",
     "qrCodes": [
       {
         "slotId": "...",
         "slotCode": "S01",
         "qrToken": "VAULT_SLOT_...",
         "qrData": "data:image/png;base64,...",
         "status": "FREE"
       },
       // ... altri 29 slot
     ]
   }
   ```

#### Step 3.3: Usa la Pagina di Stampa (Merchant)

**Nota**: I merchant possono anche generare i QR codes dalla loro pagina:
1. Il merchant va su `/merchant/vault/cases/[id]/qr-print`
2. ✅ **Verifica**: Vede tutti i 30 QR codes
3. Può stampare tutti i QR in una volta

---

### **4. STAMPARE QR CODES**

#### Step 4.1: Metodo 1 - Via Browser (Consigliato)

1. **Genera i QR codes** usando l'API batch (vedi Step 3.2)
2. **Crea una pagina HTML** temporanea per visualizzare i QR:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>QR Codes Teca</title>
     <style>
       .qr-grid {
         display: grid;
         grid-template-columns: repeat(5, 1fr);
         gap: 20px;
         padding: 20px;
       }
       .qr-item {
         text-align: center;
         border: 1px solid #ccc;
         padding: 10px;
       }
       .qr-item img {
         width: 150px;
         height: 150px;
       }
     </style>
   </head>
   <body>
     <div class="qr-grid">
       <!-- Inserisci qui i QR codes generati -->
     </div>
   </body>
   </html>
   ```

3. **Stampa** usando `Ctrl+P` (Windows) o `Cmd+P` (Mac)

#### Step 4.2: Metodo 2 - Script Node.js

Crea uno script `scripts/print-vault-qr.js`:
```javascript
const fetch = require('node-fetch');
const fs = require('fs');

async function printVaultQR(caseId) {
  const res = await fetch(`http://localhost:3000/api/vault/cases/${caseId}/qr-batch`);
  const data = await res.json();
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR Codes - ${data.caseLabel}</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        .qr-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; }
        .qr-item { text-align: center; border: 1px solid #ccc; padding: 10px; page-break-inside: avoid; }
        .qr-item img { width: 150px; height: 150px; }
        .qr-item .code { font-weight: bold; margin-top: 10px; }
      </style>
    </head>
    <body>
      <h1>QR Codes - ${data.caseLabel}</h1>
      <div class="qr-grid">
  `;
  
  data.qrCodes.forEach(qr => {
    html += `
      <div class="qr-item">
        <img src="${qr.qrData}" alt="${qr.slotCode}">
        <div class="code">${qr.slotCode}</div>
      </div>
    `;
  });
  
  html += `
      </div>
    </body>
    </html>
  `;
  
  fs.writeFileSync(`qr-codes-${caseId}.html`, html);
  console.log(`✅ File creato: qr-codes-${caseId}.html`);
  console.log(`Apri il file nel browser e stampa (Ctrl+P)`);
}

// Usa: node scripts/print-vault-qr.js [CASE_ID]
const caseId = process.argv[2];
if (!caseId) {
  console.error('❌ Fornisci l\'ID della teca');
  process.exit(1);
}

printVaultQR(caseId);
```

#### Step 4.3: Metodo 3 - Via Merchant Page

1. Fai log in come **MERCHANT** (o chiedi al merchant di farlo)
2. Vai su `/merchant/vault/cases/[id]/qr-print`
3. Clicca **"Stampa Tutti i QR Codes"**
4. ✅ **Verifica**: Si apre una finestra di stampa
5. Stampa e consegna i QR codes al merchant

---

### **5. GESTIRE AUTORIZZAZIONI TECHE**

#### Step 5.1: Verifica Autorizzazione Teca

1. Vai su Prisma Studio: `npx prisma studio`
2. Apri il modello `VaultCase`
3. Cerca la teca che vuoi verificare
4. ✅ **Verifica**: 
   - `authorizedShopId` non è null
   - `authorizedShopId` corrisponde al `shopId` del merchant

#### Step 5.2: Autorizza Manualmente una Teca

**Via Prisma Studio:**
1. Apri `VaultCase`
2. Trova la teca da autorizzare
3. Modifica `authorizedShopId` inserendo l'ID del negozio
4. Salva

**Via API (se esiste endpoint):**
1. Verifica se esiste `/api/admin/vault/cases/[id]/authorize`
2. Se esiste, chiama l'endpoint con `shopId` nel body

---

### **6. VERIFICARE QR TOKENS**

#### Step 6.1: Verifica Token QR di uno Slot

1. Vai su Prisma Studio
2. Apri il modello `VaultCaseSlot`
3. Filtra per `caseId` della teca
4. ✅ **Verifica**: Ogni slot ha:
   - `qrToken`: Token univoco (es. "VAULT_SLOT_...")
   - `slotCode`: Codice slot (es. "S01", "S02", ecc.)
   - `status`: "FREE" o "OCCUPIED"

#### Step 6.2: Rigenera Token QR (se necessario)

**Nota**: Normalmente i token vengono generati automaticamente. Se devi rigenerarli:

1. Vai su Prisma Studio
2. Apri `VaultCaseSlot`
3. Trova lo slot da rigenerare
4. Modifica `qrToken` con un nuovo token:
   - Formato: `VAULT_SLOT_${caseId}_${slotCode}_${timestamp}`
   - Es. `VAULT_SLOT_cm123_S01_1705678900`

**⚠️ ATTENZIONE**: Se rigeneri un token, il QR code stampato non funzionerà più. Dovrai rigenerare e ristampare il QR code.

---

## 🔍 TROUBLESHOOTING

### **Problema 1: Teca non viene creata automaticamente**

**Possibili cause:**
- Errore durante la creazione della teca
- Pagamento non confermato correttamente
- Errore nel codice

**Soluzione:**
1. Controlla i log del server per errori
2. Verifica che il pagamento sia stato confermato (status = "PAID")
3. Controlla Prisma Studio per vedere se la teca esiste
4. Se necessario, crea manualmente la teca (vedi Step 7)

### **Problema 2: QR codes non vengono generati**

**Possibili cause:**
- Token QR non generato durante la creazione della teca
- Errore nell'API di generazione QR

**Soluzione:**
1. Verifica che ogni slot abbia un `qrToken` in Prisma Studio
2. Se mancano, rigenera i token (vedi Step 6.2)
3. Prova a chiamare l'API di generazione QR manualmente

### **Problema 3: QR code non funziona quando scansionato**

**Possibili cause:**
- Token QR non valido
- URL di scan non corretto
- Slot non autorizzato

**Soluzione:**
1. Verifica che il token QR sia corretto
2. Testa l'URL di scan: `http://localhost:3000/scan/[token]`
3. Verifica che lo slot appartenga a una teca autorizzata

### **Problema 4: Merchant non vede la teca**

**Possibili cause:**
- Teca non autorizzata per il negozio
- `authorizedShopId` non corrisponde al `shopId` del merchant

**Soluzione:**
1. Verifica `authorizedShopId` nella teca
2. Verifica `shopId` del merchant
3. Autorizza manualmente la teca (vedi Step 5.2)

---

## 📝 NOTE IMPORTANTI

1. **Token QR Unici**: Ogni slot ha un token QR univoco. Non duplicare mai i token.
2. **Stampa QR**: Stampa sempre i QR codes su etichette adesive resistenti
3. **Backup**: Conserva sempre una copia digitale dei QR codes generati
4. **Autorizzazioni**: Verifica sempre che le teche siano autorizzate per il negozio corretto
5. **Rigenerazione**: Se rigeneri un token QR, devi ristampare il QR code

---

## 🎉 Fine Guida

Ora sei pronto per gestire tutte le teche Vault e i QR codes come admin!

Per domande o problemi, consulta i log del server o contatta il supporto tecnico.

