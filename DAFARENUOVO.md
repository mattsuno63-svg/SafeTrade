# 📋 CHECKLIST PRIORITARIA - Pre-Deploy SafeTrade

## 🔴 PRIORITÀ CRITICA (Bloccanti per deploy)

### 1. **Autenticazione e Sicurezza**
- [x] Login/Signup funzionanti
- [x] Session management
- [x] Protected routes (middleware)
- [ ] Password reset (`/forgot-password`) - **OPZIONALE per MVP**
- [x] Email verification bypass per merchants
- [ ] Logout funzionante - **VERIFICARE**

### 2. **Marketplace P2P Base**
- [x] Lista listings (`/listings`)
- [x] Dettaglio listing (`/listings/[id]`)
- [x] Create listing (`/listings/create`)
- [x] Edit listing (`/listings/[id]/edit`) - **COMPLETATO**
- [x] Delete listing - **COMPLETATO**
- [x] Sistema approvazione admin
- [x] Filtri base (gioco, ricerca)

### 3. **Dashboard Merchant Completa**
- [x] Dashboard principale (`/merchant/shop`)
- [x] Inventario (`/merchant/inventory`)
- [x] Setup shop (`/merchant/setup`)
- [x] Tornei (`/merchant/tournaments`)
- [x] Ordini (`/merchant/orders`) - **COMPLETATO**
- [x] Promozioni (`/merchant/promos`) - **COMPLETATO**
- [x] Social (`/merchant/social`) - **COMPLETATO**
- [x] Appuntamenti SafeTrade (`/merchant/appointments`)

### 4. **Dashboard Admin**
- [x] Dashboard admin (`/admin`)
- [x] Gestione applicazioni merchant (`/admin/applications`)
- [x] Moderazione listings (`/admin/listings`)
- [x] Creazione/modifica tornei (per admin)
- [x] Creazione/modifica listings (per admin)
- [ ] Statistiche complete (`/admin/stats`) - **DA MIGLIORARE**

### 5. **SafeTrade Flow**
- [x] Selezione negozio (`/select-store`)
- [x] Selezione appuntamento (`/select-appointment`)
- [x] Conferma appuntamento (`/appointment-confirmation`)
- [x] Tracking transazione (`/transaction/[id]/status`)
- [ ] Verifica transazione (VLS) - **DA TESTARE**

### 6. **Landing Page Negozi**
- [x] Public shop page (`/shops/[slug]`)
- [x] Subdomain routing (middleware)
- [x] Informazioni negozio complete
- [x] Prodotti attivi
- [x] Tornei attivi

---

## 🟡 PRIORITÀ ALTA (Importanti per MVP completo)

### 7. **Sistema Proposte**
- [x] API proposte
- [x] Pagina proposte ricevute (`/dashboard/proposals/received`)
- [x] Pagina proposte inviate (`/dashboard/proposals/sent`) - **VERIFICATO - FUNZIONA**
- [x] Accettazione proposta → SafeTrade flow

### 8. **Gestione Immagini**
- [x] Upload API (`/api/upload`)
- [x] Upload multiplo nel setup shop
- [x] Preview immagini prima upload - **MIGLIORATO**
- [x] Gestione errori upload - **MIGLIORATO**

### 9. **Notifiche**
- [x] Sistema notifiche base
- [x] NotificationBell component
- [ ] Real-time updates (Supabase Realtime) - **OPZIONALE**
- [x] Badge contatore funzionante - **VERIFICATO - FUNZIONA**

### 10. **Dashboard Utente (Collector)**
- [x] Dashboard base (`/dashboard`)
- [x] Lista listings (`/dashboard/listings`)
- [x] Profilo (`/dashboard/profile`)
- [x] Impostazioni (`/dashboard/settings`)

---

## 🟢 PRIORITÀ MEDIA (Nice to have)

### 11. **Feature Avanzate Marketplace**
- [x] Filtri avanzati (prezzo range, condizione, set) - **GIÀ IMPLEMENTATO**
- [x] Paginazione o infinite scroll - **GIÀ IMPLEMENTATO**
- [x] Sort options (prezzo, data, rilevanza) - **GIÀ IMPLEMENTATO**
- [ ] Saved searches - **OPZIONALE**

### 12. **Pagine Informative**
- [x] SafeTrade explanation (`/safetrade`)
- [x] Footer con link legali - **COMPLETATO**
- [x] Terms & Conditions - **COMPLETATO**
- [x] Privacy Policy - **COMPLETATO**
- [x] FAQ - **COMPLETATO**

### 13. **Community**
- [x] Pagina community (`/community`)
- [ ] Chat interna (solo stessa zona) - **DA IMPLEMENTARE**
- [ ] Messaging tra utenti - **FUTURO**

---

## ⚠️ PAGINE MANCANTI (Referenziate ma non create)

Da creare urgentemente:

1. `/merchant/orders` - Gestione ordini merchant
2. `/merchant/promos` - Gestione promozioni/offerte
3. `/merchant/social` - Gestione social media shop

---

## 🐛 BUG E PROBLEMI DA RISOLVERE

### Cache e Performance
- [ ] Aggiungere `Cache-Control` headers alle API dinamiche
- [ ] Implementare `revalidate` per pagine statiche
- [ ] Ottimizzare query Prisma (evitare N+1)
- [ ] Aggiungere loading states ovunque

### Error Handling
- [ ] Gestione errori upload immagini
- [ ] Messaggi errore user-friendly
- [ ] 404 page personalizzata
- [ ] 500 error page

### Validazione
- [ ] Validazione form completa (client + server)
- [ ] Sanitizzazione input
- [ ] Rate limiting API

---

## 📊 STATO ATTUALE

**Completamento stimato: ~90%**

- ✅ **Completato**: 
  - Autenticazione completa
  - Marketplace base (create, edit, delete, filtri avanzati, paginazione, sort)
  - Dashboard merchant completa (tutte le pagine)
  - Dashboard admin funzionante
  - SafeTrade flow completo
  - Landing negozi con subdomain routing
  - Pagine informative (Terms, Privacy, FAQ)
  - Footer con link legali
  - Preview immagini migliorato
  - Sistema proposte completo
- ⚠️ **Da completare**: 
  - Miglioramenti cache/performance (opzionale)
  - Real-time notifiche (opzionale)
  - Saved searches (opzionale)
- 🔄 **Da testare**: Flow completo end-to-end, verifica transazioni

---

## 🎯 PIANO D'AZIONE (Ordine di esecuzione)

### Fase 1: Completare Pagine Mancanti (1-2 giorni)
1. Creare `/merchant/orders` - Gestione ordini
2. Creare `/merchant/promos` - Gestione promozioni
3. Creare `/merchant/social` - Gestione social

### Fase 2: Fix Critici (1 giorno)
4. Implementare Edit/Delete listing
5. Fix problemi cache
6. Migliorare error handling

### Fase 3: Test Completo (1 giorno)
7. Test flow completo end-to-end
8. Test con utenti reali (staging)
9. Fix bug trovati

### Fase 4: Deploy Staging (1 giorno)
10. Deploy su Vercel preview
11. Test in ambiente reale
12. Verifica performance

---

## ✅ PRONTO PER DEPLOY QUANDO:

- [x] Autenticazione funzionante
- [x] Marketplace base funzionante (create, edit, delete, filtri, paginazione, sort)
- [x] Dashboard merchant completa (tutte le pagine create)
- [x] Dashboard admin funzionante
- [x] SafeTrade flow base
- [x] **3 pagine merchant mancanti create**
- [ ] **Cache issues risolti** (opzionale per MVP)
- [ ] **Test end-to-end completati**

---

## 📝 NOTE IMPLEMENTAZIONE

### Struttura File da Creare

#### `/merchant/orders/page.tsx`
- Lista ordini ricevuti
- Filtri per stato (pending, confirmed, completed, cancelled)
- Dettagli ordine con prodotti
- Gestione stato ordine
- Integrazione con SafeTrade appointments

#### `/merchant/promos/page.tsx`
- Lista promozioni attive/inattive
- Creazione nuova promozione
- Modifica/eliminazione promozioni
- Applicazione promozioni a prodotti/listing
- Statistiche promozioni (views, conversioni)

#### `/merchant/social/page.tsx`
- Gestione link social media (già in setup, ma pagina dedicata)
- Preview post social
- Schedulazione post
- Analytics social
- Integrazione con shop landing page

### API Routes da Creare/Modificare

#### `/api/merchant/orders/route.ts`
- `GET` - Lista ordini del merchant
- `POST` - Creare nuovo ordine (se necessario)
- `PATCH` - Aggiornare stato ordine

#### `/api/merchant/promos/route.ts`
- `GET` - Lista promozioni
- `POST` - Creare promozione
- `PATCH /api/merchant/promos/[id]` - Modificare promozione
- `DELETE /api/merchant/promos/[id]` - Eliminare promozione

#### `/api/merchant/social/route.ts`
- `GET` - Recuperare link social
- `PATCH` - Aggiornare link social
- `POST /api/merchant/social/post` - Creare post (futuro)

### Database Schema (se necessario)

#### Tabella `Order` (se non esiste)
```prisma
model Order {
  id            String   @id @default(cuid())
  merchantId    String
  merchant      User     @relation("MerchantOrders", fields: [merchantId], references: [id])
  buyerId       String
  buyer         User     @relation("BuyerOrders", fields: [buyerId], references: [id])
  status        OrderStatus @default(PENDING)
  totalAmount   Float
  items         OrderItem[]
  transactionId String?  // Link a SafeTradeTransaction
  transaction   SafeTradeTransaction? @relation(fields: [transactionId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum OrderStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String?
  product   Product? @relation(fields: [productId], references: [id])
  listingId String?
  listing   ListingP2P? @relation(fields: [listingId], references: [id])
  quantity  Int
  price     Float
}
```

#### Tabella `Promotion` (se non esiste)
```prisma
model Promotion {
  id          String   @id @default(cuid())
  merchantId  String
  merchant    User     @relation(fields: [merchantId], references: [id])
  title       String
  description String?
  discountType DiscountType // PERCENTAGE, FIXED_AMOUNT
  discountValue Float
  startDate   DateTime
  endDate     DateTime
  isActive    Boolean  @default(true)
  appliesTo   PromotionTarget[] // PRODUCTS, LISTINGS, ALL
  targetIds   String[] // IDs di prodotti/listings specifici
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
}

enum PromotionTarget {
  PRODUCTS
  LISTINGS
  ALL
}
```

---

## 🚀 PROSSIMI STEP

1. **Creare le 3 pagine merchant mancanti**
2. **Implementare API routes necessarie**
3. **Aggiungere modelli database se necessario**
4. **Testare integrazione completa**
5. **Fix problemi cache e performance**
6. **Implementare Edit/Delete listing**
7. **Test end-to-end completo**

---

**Ultimo aggiornamento**: 2024-01-XX
**Versione**: 1.0

