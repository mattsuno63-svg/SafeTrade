# 📦 Verified Escrow - Flusso Tracking Number

**Data**: 2025-01-27  
**Spiegazione**: Come funziona il tracking number nel Verified Escrow

---

## ❓ Domande Frequenti

### **Q: Da dove viene il tracking number?**
**R**: Il tracking number **NON viene generato da SafeTrade**. Viene fornito dal **corriere** (SDA, Poste Italiane, DHL, ecc.) quando il venditore **spedisce fisicamente** la carta all'hub SafeTrade.

### **Q: Quando deve inserirlo il seller?**
**R**: Dopo aver spedito fisicamente il pacco al corriere. Il corriere fornisce il tracking number quando il pacco viene spedito.

### **Q: Perché deve inserirlo?**
**R**: Per permettere a SafeTrade di:
- Tracciare il pacco durante il trasporto verso l'hub
- Notificare buyer e hub staff quando il pacco è in transito
- Verificare che il pacco sia effettivamente spedito prima di rilasciare i fondi

---

## 🔄 Flusso Completo Verified Escrow

### **Step 1: Seller Sceglie Verified Escrow**
- Seller accetta proposta
- Seller seleziona "Verified Escrow"
- **Transazione creata** con status `PENDING_ESCROW_SETUP`
- **Notifica buyer**: "Verified Escrow attivato"

### **Step 2: Seller Spedisce FISICAMENTE la Carta**
- ⚠️ **IMPORTANTE**: Seller deve **andare al corriere** (SDA, Poste Italiane, DHL, ecc.)
- Seller **spedisce fisicamente** la carta all'indirizzo hub SafeTrade
- Il corriere **fornisce un tracking number** (es. "ABC123456789")
- Il corriere **stampa l'etichetta** con tracking number

### **Step 3: Seller Inserisce Tracking nel Sistema**
- Seller va a `/transaction/[id]/verified-escrow/setup`
- Seller inserisce il tracking number fornito dal corriere
- Sistema aggiorna: `status = AWAITING_HUB_RECEIPT`, `packageStatus = IN_TRANSIT_TO_HUB`
- **Notifica buyer**: "Pacco spedito" con tracking number

### **Step 4: Hub Staff Riceve Pacco**
- Pacco arriva fisicamente all'hub SafeTrade
- Hub Staff marca pacco come ricevuto (`HUB_RECEIVED`)
- **Notifiche buyer/seller**: "Pacco ricevuto all'hub"

### **Step 5: Hub Staff Verifica**
- Hub Staff avvia verifica
- Hub Staff completa verifica (min 3 foto)
- Se PASSED → rispedisce a buyer
- Se FAILED → crea `AdminNotification` per rimborso

### **Step 6: Buyer Riceve e Conferma**
- Buyer riceve pacco
- Buyer conferma ricezione
- Sistema crea `PendingRelease` per approvazione admin

---

## 📋 Indirizzo Hub SafeTrade

**⚠️ DA CONFIGURARE**: L'indirizzo hub deve essere comunicato al seller quando inserisce il tracking number, o prima della spedizione.

**Opzioni**:
1. **Mostrare indirizzo nella pagina setup** dopo inserimento tracking
2. **Inviare email** con indirizzo hub quando transazione viene creata
3. **Indirizzo fisso** mostrato sempre nella pagina

**Esempio Indirizzo Hub**:
```
SafeTrade Hub
Via [Indirizzo], [Civico]
[CAP] [Città]
Italia
```

---

## 🔔 Notifiche Admin

### **Quando Vengono Create Notifiche Admin?**

**✅ NON viene creata notifica admin quando**:
- Seller inserisce tracking number
- Buyer conferma ricezione (viene creata `PendingRelease`, ma non `AdminNotification`)

**✅ Viene creata notifica admin quando**:
- Verifica fallita → `AdminNotification` per rimborso buyer
- Release fondi richiesto → `AdminNotification` per approvazione release
- Auto-release dopo 72h → `AdminNotification` per approvazione release

---

## 🛠️ Miglioramenti Suggeriti

### **1. Pagina Setup - Spiegazione Migliore**
Aggiungere:
- Spiegazione chiara che il seller deve PRIMA spedire il pacco
- Mostrare indirizzo hub (prima o dopo inserimento tracking)
- Link a guide corrieri (come spedire un pacco)

### **2. Email di Conferma**
Quando transazione VERIFIED viene creata:
- Inviare email a seller con:
  - Indirizzo hub completo
  - Istruzioni per la spedizione
  - Info su come ottenere tracking number

### **3. Validazione Tracking Reale** (Future Enhancement)
- Integrazione con API corrieri per verificare tracking number
- Verifica che tracking esista realmente
- Tracciamento automatico stato pacco

---

## ✅ Flusso Attuale (Funzionante)

1. ✅ Seller sceglie Verified Escrow → transazione creata
2. ⚠️ **Seller deve spedire fisicamente** → ottenere tracking dal corriere
3. ✅ Seller inserisce tracking nel sistema → status aggiornato
4. ✅ Hub Staff riceve pacco → marca ricevuto
5. ✅ Hub Staff verifica → foto e note
6. ✅ Hub Staff rispedisce → tracking return
7. ✅ Buyer riceve → conferma
8. ✅ Admin approva release → fondi rilasciati

---

## 🔧 Azioni Necessarie

### **Immediate**:
- [ ] Aggiungere indirizzo hub nella pagina setup
- [ ] Migliorare spiegazione "Come Funziona" nella pagina setup
- [ ] Aggiungere link a guide corrieri

### **Future**:
- [ ] Email automatica con indirizzo hub quando transazione creata
- [ ] Integrazione API corrieri per validazione tracking
- [ ] Dashboard tracking real-time per seller/buyer

---

**Ultimo aggiornamento**: 2025-01-27

