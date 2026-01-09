# 🛡️ SafeTrade Flow - Transazioni Verificate

## Overview
Il flusso SafeTrade permette transazioni P2P sicure verificate presso negozi partner (Verified Local Stores - VLS).

---

## 📋 Flow 1: Inizio Transazione SafeTrade

### Step 1: Proposta Accettata
**Trigger**: Venditore accetta proposta su listing P2P

**Componenti**:
- Notifica real-time ad acquirente
- Link "Complete Transaction"

**Azioni**:
- Acquirente riceve notifica
- Clicca link → Vai a `/select-store`

**Stato**: ✅ Logica base implementata

---

### Step 2: Selezione Negozi Partner
**Pagina**: `/select-store`

**Componenti**:
- Lista negozi verificati (VLS)
- Filtri (città, distanza)
- Mappa interattiva (opzionale)
- Info negozio (nome, indirizzo, rating)

**Azioni**:
- Visualizza negozi disponibili
- Filtra per location
- Clicca su negozio → Vai a `/select-appointment`

**Stato**: ✅ Completato (API implementata)

---

### Step 3: Selezione Appuntamento
**Pagina**: `/select-appointment`

**Componenti**:
- Calendario con slot disponibili
- Info negozio selezionato
- Selezione data e ora
- Riepilogo transazione

**Azioni**:
- Seleziona data
- Seleziona ora disponibile
- Conferma → Crea `SafeTradeTransaction`
- Redirect a `/appointment-confirmation`

**Stato**: ✅ Completato (API implementata)

---

### Step 4: Conferma Appuntamento
**Pagina**: `/appointment-confirmation`

**Componenti**:
- Riepilogo appuntamento
- QR code per check-in
- Info negozio
- Info contatto
- Download QR code

**Azioni**:
- Visualizza QR code
- Download QR come immagine
- Condividi QR (opzionale)
- Notifica email/SMS (opzionale)

**Stato**: ✅ UI completata, ⏳ QR code reale da implementare

---

## 📋 Flow 2: Check-in al Negozio

### Step 1: Arrivo al Negozio
**Processo**: Utente arriva al negozio con QR code

**Componenti**:
- QR code su telefono o stampato
- ID transazione

**Azioni**:
- Utente mostra QR code a VLS
- VLS scansiona QR o inserisce ID manualmente

**Stato**: ✅ QR code generation implementato

---

### Step 2: Verifica Check-in (VLS)
**Pagina**: `/dashboard/vls/verify/[id]`

**Componenti**:
- Scanner QR code o input manuale
- Info transazione
- Info utente A (venditore)
- Info utente B (acquirente)
- Info oggetto/carta scambiato
- Bottone "Check-in User A" / "Check-in User B"

**Azioni**:
- VLS scansiona QR o inserisce ID
- Verifica identità utenti (documento)
- Clicca "Check-in" per ogni utente
- Aggiorna status transazione: `CHECKED_IN`

**Stato**: ✅ Completato (API implementata)

---

### Step 3: Verifica Oggetti
**Pagina**: `/dashboard/vls/review/[id]`

**Componenti**:
- Riepilogo transazione completa
- Foto oggetti scambiati (opzionale)
- Checklist verifica:
  - [ ] Oggetto corrisponde a listing
  - [ ] Condizione come descritta
  - [ ] Entrambi gli utenti presenti
  - [ ] Pagamento completato (se applicabile)
- Bottoni "Approve Transaction" / "Reject Transaction"

**Azioni**:
- VLS verifica oggetti
- Compila checklist
- Approve → Status: `COMPLETED`
- Reject → Status: `REJECTED` (con motivo)

**Stato**: ✅ Completato (API implementata)

---

## 📋 Flow 3: Tracking Transazione

### Step 1: Status Page (Utente)
**Pagina**: `/transaction/[id]/status`

**Componenti**:
- Timeline transazione
- Step completati/pending:
  1. ✅ Proposta accettata
  2. ✅ Negozio selezionato
  3. ✅ Appuntamento confermato
  4. ⏳ Check-in al negozio
  5. ⏳ Verifica completata
- Info negozio
- QR code (se non ancora check-in)
- Contatti utili

**Azioni**:
- Monitora progresso
- Visualizza QR code
- Contatta supporto (se necessario)

**Stato**: ✅ Completato (API implementata)

---

### Step 2: Outcome Page (Utente)
**Pagina**: `/transaction/[id]/outcome`

**Componenti**:
- Risultato transazione (completed/rejected)
- Dettagli finali
- Rating negozio (opzionale)
- Feedback (opzionale)

**Azioni**:
- Visualizza esito
- Lascia rating/feedback
- Chiudi transazione

**Stato**: ✅ Completato (API implementata)

---

## 📋 Flow 4: Notifiche Real-time

### Componenti
- Notifiche push (browser)
- Notifiche in-app (bell icon)
- Email (opzionale)
- SMS (opzionale)

### Eventi Notificati
1. **Proposta accettata** → Acquirente
2. **Appuntamento confermato** → Entrambi utenti + VLS
3. **Check-in completato** → Entrambi utenti
4. **Transazione completata** → Entrambi utenti
5. **Transazione rifiutata** → Entrambi utenti

**Stato**: ✅ Sistema base implementato, ⏳ Da collegare a eventi

---

## 🔄 Flussi Alternativi

### Transazione Rifiutata
- VLS rifiuta → Status: `REJECTED`
- Notifica entrambi utenti
- Possibilità di riprogrammare (opzionale)

### Utente Non Presente
- Timeout appuntamento
- Notifica utente assente
- Possibilità di riprogrammare

### Disputa
- Utente può aprire disputa
- Supporto manuale
- Risoluzione caso per caso

**Stato**: ⏳ Da implementare

---

## ✅ Checklist SafeTrade

- [x] Select store page UI
- [x] Select appointment page UI
- [x] Appointment confirmation UI
- [x] QR code generation
- [x] VLS verify page UI
- [x] VLS review page UI
- [x] Transaction status page UI
- [x] Transaction outcome page UI
- [ ] API creazione transazione
- [ ] API check-in
- [ ] API verifica completamento
- [ ] Notifiche real-time eventi
- [ ] Email/SMS conferme
- [ ] Sistema dispute

---

## 🎯 Prossimi Step

Dopo SafeTrade, utente può:
1. Lasciare feedback → Rating system
2. Visualizzare storico → Dashboard
3. Ripetere transazione → Marketplace

