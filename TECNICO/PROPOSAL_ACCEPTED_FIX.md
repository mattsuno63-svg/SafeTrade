# 🔧 Fix Proposta ACCEPTED Senza Transazione

**Data**: 2025-01-27  
**Problema**: Quando una proposta viene accettata ma l'utente non completa la selezione negozio/metodo escrow, la proposta risulta ACCEPTED ma senza transazione.

---

## 🐛 Problema Identificato

1. **Flusso Attuale**:
   - User accetta proposta → `status = ACCEPTED`
   - Redirect a `/select-store?proposalId=${id}`
   - **PROBLEMA**: Se l'utente chiude il browser/naviga via, la proposta rimane ACCEPTED ma senza transazione

2. **Conseguenze**:
   - Proposta appare come ACCEPTED ma non è chiaro come completare il processo
   - Nessun modo per riprendere il processo di selezione negozio/metodo escrow

---

## ✅ Soluzione Implementata

### 1. **API `/api/proposals`**
- ✅ Aggiunto `transaction` al `select` per verificare se esiste già una transazione

### 2. **UI `/dashboard/proposals/received`**
- ✅ Aggiunto pulsante "Completa Transazione" per proposte ACCEPTED senza transazione
- ✅ Pulsante reindirizza a `/select-escrow-method?proposalId=${id}` per scegliere tra LOCAL/VERIFIED
- ✅ Se transazione esiste, mostra link "Vedi Transazione"

---

## 🔒 Prevenzione Futura

### **Invarianti Aggiunti**:
1. ✅ API `/api/transactions` verifica che `proposalId` non sia già usato (previene duplicati)
2. ✅ Proposta ACCEPTED può esistere senza transazione (stato valido intermedio)
3. ✅ UI mostra sempre opzione per completare transazione se mancante

### **Validazioni Server-Side**:
- ✅ `/api/transactions` POST verifica `proposalData.status === 'ACCEPTED'`
- ✅ `/api/transactions` POST verifica che `proposalId` non sia già usato
- ✅ Solo il venditore (receiver) può creare transazione

---

## 📋 Flusso Corretto

### **Scenario 1: Utente completa subito**
1. User accetta proposta → `status = ACCEPTED`
2. Redirect a `/select-store?proposalId=${id}`
3. User seleziona negozio/metodo escrow
4. Transazione creata → `proposal.transaction != null`

### **Scenario 2: Utente interrompe processo**
1. User accetta proposta → `status = ACCEPTED`
2. Redirect a `/select-store?proposalId=${id}`
3. **User chiude browser/naviga via**
4. **FIX**: User torna a `/dashboard/proposals/received`
5. **FIX**: Vede pulsante "Completa Transazione" per proposte ACCEPTED senza transazione
6. User clicca → va a `/select-escrow-method?proposalId=${id}`
7. User seleziona metodo escrow → transazione creata

---

## 🧪 Test Consigliati

### ✅ Happy Path:
1. Accetta proposta
2. Completa selezione negozio/metodo escrow
3. Verifica transazione creata

### ✅ Edge Case (Fix):
1. Accetta proposta
2. Chiudi browser prima di selezionare negozio
3. Torna a `/dashboard/proposals/received`
4. Verifica pulsante "Completa Transazione" visibile
5. Clicca pulsante
6. Verifica redirect a `/select-escrow-method`
7. Completa selezione
8. Verifica transazione creata

---

**Ultimo aggiornamento**: 2025-01-27

