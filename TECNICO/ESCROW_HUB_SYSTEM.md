# 🏠 Escrow Hub System - Personal Escrow Service

## 📋 Overview

Sistema che permette agli utenti di diventare "Escrow Hub Providers", offrendo il proprio indirizzo come drop point per transazioni internazionali. Questo sistema unisce venditori e acquirenti di paesi diversi mantenendo la sicurezza dell'escrow.

## 🎯 Funzionalità

### 1. Diventare Hub Provider
- Registrazione come Escrow Hub Provider
- Uso del proprio indirizzo come drop point
- Verifica identità da admin (opzionale)
- Gestione tariffe e disponibilità

### 2. Gestione Pacchi
- Ricezione pacchi da venditori
- Verifica contenuti (con foto)
- Sblocco pagamenti dopo verifica
- Rispezione pacchi agli acquirenti
- Tracking completo (stati, tracking numbers)

### 3. Sistema Rating
- Rating e recensioni per Hub Providers
- Statistiche transazioni completate
- Verifica identità (badge)

## 🔄 Flow Completo

### 1. Registrazione Hub Provider
```
User → Diventa Hub Provider
  → Inserisce dati (indirizzo, contatti, descrizione)
  → Admin approva (verifica identità opzionale)
  → Hub attivo e disponibile
```

### 2. Transazione con Hub
```
Buyer & Seller → Sceglie Hub invece di Shop
  → Crea SafeTradeTransaction con hubId
  → Seller invia pacco all'hub
  → Hub riceve pacco (packageStatus: RECEIVED)
  → Hub verifica contenuti (foto)
  → Hub marca come VERIFIED
  → Pagamento sbloccato automaticamente
  → Hub rispedisce pacco a Buyer
  → Hub marca come SHIPPED
  → Buyer riceve pacco (DELIVERED)
```

### 3. Stati Package

```
PENDING → IN_TRANSIT → RECEIVED → VERIFIED → SHIPPED → DELIVERED
                                                        ↓
                                                    RETURNED (se problemi)
```

## 🗄️ Database Schema

### EscrowHub
- `providerId`: User che offre servizio escrow
- `name`: Nome hub (es. "Mario's Escrow Hub")
- `address`, `city`, `province`, `country`: Indirizzo completo
- `isActive`, `isApproved`, `isVerified`: Status hub
- `rating`, `ratingCount`: Statistiche rating
- `serviceFee`: Tariffa servizio (%)
- `transactionsCompleted`: Contatore transazioni

### SafeTradeTransaction (modificato)
- `shopId`: Opzionale (per shop-based escrow)
- `hubId`: Opzionale (per hub-based escrow)
- `packageStatus`: Stato pacco (HubPackageStatus)
- `trackingNumber`: Tracking pacco verso hub
- `returnTrackingNumber`: Tracking pacco verso buyer
- `packageReceivedAt`, `packageVerifiedAt`, etc.: Timestamps
- `verificationPhotos`: Array foto verifica contenuti

### EscrowHubReview
- Rating e recensioni per hub providers
- Link a transazione (opzionale)
- Pros/cons

## 🔌 API Endpoints (da implementare)

### Hub Management
- `POST /api/hub/register` - Diventa hub provider
- `GET /api/hub/my` - Ottieni il mio hub
- `PATCH /api/hub/my` - Aggiorna hub
- `GET /api/hub/list` - Lista hub disponibili
- `GET /api/hub/[id]` - Dettagli hub

### Package Management
- `POST /api/transactions/[id]/package/received` - Marca pacco ricevuto
- `POST /api/transactions/[id]/package/verify` - Verifica contenuti (con foto)
- `POST /api/transactions/[id]/package/ship` - Marca come spedito
- `POST /api/transactions/[id]/package/delivered` - Marca come consegnato
- `GET /api/hub/packages` - Lista pacchi gestiti dall'hub

### Reviews
- `POST /api/hub/[id]/review` - Lascia recensione
- `GET /api/hub/[id]/reviews` - Ottieni recensioni hub

## 📊 UI Pages (da implementare)

### Hub Provider
- `/hub/register` - Registrazione hub provider
- `/hub/dashboard` - Dashboard hub provider
- `/hub/packages` - Gestione pacchi
- `/hub/settings` - Impostazioni hub

### Buyer/Seller
- `/hub/list` - Lista hub disponibili
- `/hub/[id]` - Dettagli hub (con reviews)
- `/transactions/[id]/hub` - Dettagli transazione hub-based

## 💡 Idee Aggiuntive

1. **Sistema Tariffe**
   - Tariffa fissa per transazione
   - Tariffa percentuale sul valore
   - Tariffe premium per hub verificati

2. **Assicurazione Pacchi**
   - Opzione assicurazione per pacchi di valore elevato
   - Copertura in caso di danni/perdite

3. **Notifiche Multi-Stadio**
   - Notifica quando pacco ricevuto
   - Notifica quando verificato
   - Notifica quando spedito
   - Notifica quando consegnato

4. **Sistema Foto Verifica**
   - Upload foto contenuto pacco
   - Verifica stato carte (condizione)
   - Foto prima di rispedire

5. **Tracking Spedizione**
   - Integrazione API corrieri (Poste, DHL, etc.)
   - Tracking automatico
   - Notifiche stato spedizione

6. **Sistema Rating Avanzato**
   - Rating su: velocità, accuratezza, comunicazione
   - Badge per hub top-rated
   - Filtri ricerca per rating

7. **Dispute Resolution**
   - Sistema disputes per pacchi problematici
   - Mediation automatica
   - Escalation a admin

## 🔒 Sicurezza

- Verifica identità hub providers (opzionale ma consigliato)
- Foto verifica contenuti (anti-frode)
- Tracking completo (accountability)
- Sistema rating (reputazione)
- Admin approval (controllo qualità)

## 📈 Monetization

- **Tariffa Hub Provider**: 5-10% del valore transazione
- **Tariffa Premium**: Hub verificati possono chiedere tariffe più alte
- **Tariffa Utente**: Opzione per utente di pagare extra per hub top-rated

---

**Ultimo Aggiornamento**: 2025-01-30  
**Versione**: 1.0  
**Status**: In sviluppo

