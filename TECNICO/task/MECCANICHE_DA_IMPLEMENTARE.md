# 🎮 Meccaniche da Implementare - SafeTrade

**Ultimo Aggiornamento**: 2025-01-30

Questo documento descrive in dettaglio le meccaniche e funzionalità da implementare nel progetto SafeTrade.

---

## 🔐 Sistema Pagamenti Online

### Descrizione
Integrazione completa di un sistema di pagamento online che permetta agli utenti di pagare direttamente sulla piattaforma invece che in negozio.

### Meccanica Dettagliata

#### Flow Pagamento
1. **Buyer inizia pagamento**
   - Clicca "Pay Now" nella sessione escrow
   - Viene creato un Payment Intent (Stripe)
   - Importo trattenuto (authorized ma non charged)

2. **Merchant riceve notifica**
   - Vede pagamento in pending
   - Attende verifica carte

3. **Verifica carte in negozio**
   - Buyer e Seller si presentano
   - Merchant verifica condizioni carte
   - Se OK: Merchant clicca "Release Payment"
   - Se KO: Merchant clicca "Refund Payment"

4. **Rilascio fondi**
   - Stripe charge viene completato
   - Fondi vanno al Seller
   - Commissione piattaforma trattenuta
   - Tutti ricevono notifica

#### Commissioni
- **Buyer**: 0%
- **Seller**: 5% del totale
- **Merchant (VLS)**: 2% del totale
- **Piattaforma**: 3% del totale

#### Sicurezza
- Payment intent con authorization hold
- Fondi rilasciati solo dopo verifica fisica
- Sistema di dispute per contestazioni
- Rimborso automatico se merchant non approva
- Timeout: se merchant non risponde in 48h, rimborso automatico

### Database Schema
```prisma
model EscrowPayment {
  id              String   @id @default(cuid())
  sessionId       String
  session         EscrowSession @relation(fields: [sessionId], references: [id])
  amount          Decimal  @db.Decimal(10, 2)
  currency        String   @default("EUR")
  status          EscrowPaymentStatus
  paymentIntentId String?  // Stripe Payment Intent ID
  riskScore       Int?     @db.Integer
  requiresReview  Boolean  @default(false)
  reviewedBy      String?
  reviewedAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum EscrowPaymentStatus {
  PENDING
  AUTHORIZED
  HELD
  RELEASED
  REFUNDED
  FAILED
}
```

### File da Creare/Modificare
- `src/lib/stripe.ts` - Stripe client setup
- `src/app/api/payments/intent/route.ts` - Create payment intent
- `src/app/api/payments/[id]/capture/route.ts` - Capture payment
- `src/app/api/webhooks/stripe/route.ts` - Stripe webhooks
- `src/app/escrow/sessions/[id]/payment/page.tsx` - Payment UI

---

## ⭐ Sistema Recensioni

### Descrizione
Sistema completo di recensioni che permette agli utenti di lasciare feedback su transazioni completate.

### Meccanica Dettagliata

#### Quando Lasciare Recensioni
- Solo dopo transazione SafeTrade completata
- Entro 30 giorni dalla chiusura transazione
- Una recensione per transazione (buyer→seller, seller→buyer)
- Merchant può essere recensito su servizio VLS

#### Tipi di Recensioni
1. **Recensione Transazione**
   - Rating: 1-5 stelle
   - Aspetti: Comunicazione, Condizioni Carta, Affidabilità, Velocità
   - Commento testuale (opzionale)
   - Foto carte ricevute (opzionale)

2. **Recensione Merchant (VLS)**
   - Rating: 1-5 stelle
   - Aspetti: Professionalità, Ambiente, Competenza, Disponibilità
   - Commento testuale
   - Foto negozio (opzionale)

3. **Recensione Shop**
   - Rating: 1-5 stelle
   - Aspetti: Prezzi, Assortimento, Personale, Location
   - Commento testuale

#### Visualizzazione
- Badge "Top Seller" per rating > 4.5 con > 50 recensioni
- Badge "Verified Buyer" per chi ha completato > 10 acquisti
- Media rating visibile su profilo utente
- Recensioni positive/negative separate
- Sistema di "helpful" per recensioni utili

#### Moderazione
- Admin può nascondere recensioni inappropriate
- Sistema di report abuse
- Recensioni con linguaggio offensivo auto-flaggate
- Seller può rispondere a recensioni (max 500 caratteri)

### Database Schema
```prisma
model Review {
  id            String   @id @default(cuid())
  transactionId String?
  transaction   SafeTradeTransaction? @relation(fields: [transactionId], references: [id])
  shopId        String?
  shop          Shop?    @relation(fields: [shopId], references: [id])
  reviewerId    String
  reviewer      User     @relation("ReviewsGiven", fields: [reviewerId], references: [id])
  reviewedId    String
  reviewed      User     @relation("ReviewsReceived", fields: [reviewedId], references: [id])
  rating        Int      @db.Integer // 1-5
  aspects       Json?    // {communication: 5, reliability: 4, ...}
  comment       String?
  images        String[] @default([])
  isPublic      Boolean  @default(true)
  isVerified    Boolean  @default(false)
  helpfulCount  Int      @default(0)
  response      String?  // Risposta del venditore
  responseAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

---

## 🏆 Sistema Badge & Achievements

### Descrizione
Sistema di gamification con badge e achievement per incentivare l'uso della piattaforma.

### Badge Disponibili

#### 🌟 Badge Utente
- **New Member** - Prima registrazione
- **First Sale** - Prima vendita completata
- **First Purchase** - Primo acquisto completato
- **Collector** - 10+ transazioni completate
- **Pro Trader** - 50+ transazioni completate
- **Master Trader** - 100+ transazioni completate
- **Trusted Seller** - Rating > 4.5 con > 20 recensioni
- **Fast Responder** - Risponde in media < 2 ore
- **Active Community** - Attivo negli ultimi 30 giorni

#### 🏪 Badge Merchant
- **New Shop** - Primo negozio approvato
- **Tournament Organizer** - Ha organizzato 5+ tornei
- **VLS Verified** - Merchant verificato come VLS
- **Top Rated Shop** - Rating negozio > 4.7
- **Community Partner** - Partner ufficiale SafeTrade

#### 💎 Badge Speciali (Limited)
- **Early Adopter** - Registrato nei primi 100
- **Beta Tester** - Ha partecipato alla beta
- **Bug Hunter** - Ha segnalato 5+ bug
- **Ambassador** - Ha portato 10+ nuovi utenti

### Achievement

#### Vendite
- Vendi prima carta
- Vendi 10 carte
- Vendi 50 carte
- Vendi 100 carte
- Vendi carta > €100
- Vendi carta > €500

#### Acquisti
- Compra prima carta
- Compra 10 carte
- Compra 50 carte
- Completa collezione (definita dall'utente)

#### Sicurezza
- Usa SafeTrade per prima volta
- Completa 10 SafeTrade
- Completa SafeTrade senza problemi (10 di fila)

### Database Schema
```prisma
model Badge {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  description String
  icon        String   // URL o emoji
  rarity      BadgeRarity
  isLimited   Boolean  @default(false)
  maxSupply   Int?     // null = unlimited
  createdAt   DateTime @default(now())
  
  UserBadges  UserBadge[]
}

model UserBadge {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  badgeId   String
  badge     Badge    @relation(fields: [badgeId], references: [id])
  earnedAt  DateTime @default(now())
  
  @@unique([userId, badgeId])
}

enum BadgeRarity {
  COMMON
  UNCOMMON
  RARE
  EPIC
  LEGENDARY
}
```

---

## 📱 Push Notifications (PWA)

### Descrizione
Sistema di notifiche push native per PWA che permette agli utenti di ricevere notifiche anche quando il browser è chiuso.

### Eventi che Triggherano Notifiche

#### 🔔 Transazioni
- Nuova proposta ricevuta
- Proposta accettata/rifiutata
- SafeTrade confermato
- Appuntamento tra 1 ora
- Transazione completata

#### 💬 Messaggi
- Nuovo messaggio in chat escrow
- Merchant richiede informazioni

#### 🏪 Merchant
- Richiesta merchant approvata/rifiutata
- Nuovo ordine ricevuto
- Nuovo iscritto torneo

#### ⚠️ Urgenti
- Payment hold expiring (24h)
- Appointment missed
- Review pending (reminder)

### Implementazione
```typescript
// Service Worker per push notifications
self.addEventListener('push', (event) => {
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url,
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: 'Apri' },
      { action: 'dismiss', title: 'Chiudi' }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})
```

---

## 🎯 Sistema Offerte & Controfferte

### Descrizione
Sistema avanzato di negoziazione con offerte e controfferte multiple.

### Flow Negoziazione

1. **Buyer fa offerta iniziale**
   - Propone prezzo
   - Opzionale: aggiunge note
   - Seller riceve notifica

2. **Seller può**:
   - ✅ **Accettare** → Transazione procede
   - ❌ **Rifiutare** → Fine negoziazione
   - 🔄 **Controfferta** → Propone prezzo diverso
   - ⏸️ **Ignora** → Scade dopo 48h

3. **Buyer riceve controfferta**
   - Può accettare/rifiutare/controfferta
   - Max 5 round di negoziazione
   - Dopo 5 round: o si accordano o fine

4. **Accordo raggiunto**
   - SafeTrade session creata automaticamente
   - Prezzo finale bloccato

### Features Avanzate
- **Auto-accept threshold**: Seller può impostare "accetta automaticamente se offerta > X%"
- **Expiry timer**: Offerte scadono dopo 48h
- **Bundle offers**: Offerta su multiple carte insieme (sconto)
- **Trade-in**: Offerta + scambio carta come parziale pagamento

---

## 🔍 Sistema di Verifica Carte (OCR + AI)

### Descrizione
Sistema automatico di riconoscimento carte tramite foto per facilitare inserimento listing.

### Flow
1. Utente carica foto carta
2. OCR estrae:
   - Nome carta
   - Set/Edizione
   - Numero carta
   - Rarità
3. AI valuta condizioni:
   - Centering
   - Edges
   - Corners
   - Surface
4. Suggerisce:
   - Grade stimato (PSA equivalent)
   - Prezzo mercato
   - Condition (MINT/NM/EX/GD/PL/POOR)

### Tecnologie
- **Google Cloud Vision API** o **AWS Rekognition**
- **Custom ML model** addestrato su dataset carte TCG
- **Price scraping** da TCGPlayer, Cardmarket, eBay

---

## 💼 Sistema Wallet Interno

### Descrizione
Wallet interno per gestire fondi, permettendo transazioni più veloci.

### Features
- Ricarica wallet (Stripe, PayPal, Bonifico)
- Prelievo fondi su conto bancario
- Saldo sempre visibile
- Storico transazioni
- Pagamenti istantanei tra utenti
- Fees ridotte per pagamenti wallet-to-wallet

### Sicurezza
- 2FA obbligatoria per prelievi
- Limits giornalieri
- KYC per importi > €1000
- Freeze account in caso di attività sospette

---

## 📊 Analytics Avanzate per Merchant

### Dashboard Merchant
- **Vendite**: Grafici giornalieri/settimanali/mensili
- **Top Products**: Carte più vendute
- **Customer Insights**: Da dove vengono, età media, preferenze
- **Conversion Rate**: Visite → Vendite
- **Inventory Alerts**: Carte in esaurimento
- **Competitor Analysis**: Confronto prezzi con altri merchant
- **Revenue Forecast**: Previsioni AI basate su trend

### Reports Esportabili
- PDF reports mensili
- Excel export vendite
- Fatture automatiche
- Dichiarazione fiscale helper

---

**Note**: Tutte queste meccaniche sono pianificate per implementazioni future. Le priorità verranno definite in base al feedback utenti e alle esigenze di business.

