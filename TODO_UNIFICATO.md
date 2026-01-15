# 📋 TODO UNIFICATO - SafeTrade

**Ultimo Aggiornamento**: 2025-01-XX  
**Scopo**: File unificato che raggruppa tutte le task, fix, miglioramenti e test da completare per SafeTrade.

---

## 📊 Indice

1. [✅ Task Completate](#-task-completate)
2. [🔴 Priorità Alta - Fix Critici](#-priorità-alta---fix-critici)
3. [🟡 Priorità Media - Features Importanti](#-priorità-media---features-importanti)
4. [🟢 Priorità Bassa - Miglioramenti](#-priorità-bassa---miglioramenti)
5. [🧪 Test da Completare](#-test-da-completare)
6. [🐛 Bug da Risolvere](#-bug-da-risolvere)
7. [📝 Note e Roadmap](#-note-e-roadmap)

---

## ✅ Task Completate

### Marketplace & UI Improvements
- [x] **Task 1**: Aggiungere AnimatedOrbs al marketplace
- [x] **Task 2**: Sostituire icone categorie con SVG custom (Pokemon, Magic, Yu-Gi-Oh!, One Piece)
- [x] **Task 3**: Aggiungere carte demo per categoria
- [x] **Task 4**: Modificare icona "Network di Negozi" (SVG custom)
- [x] **Task 5**: Animazione rettangolo Escrow (componente EscrowAnimation)
- [x] **Task 6**: Creare pagina "Trova Store Partner" (`/stores`)
- [x] **Task 7**: Collegare bottone "Trova Store Partner" alla nuova pagina
- [x] **Task 8**: Aggiungere campo provincia alla registrazione (USER e MERCHANT)
- [x] **Task 9**: Verificare filtro tornei con provincia

### Sistema Escrow
- [x] Sistema escrow backend completo
- [x] API escrow complete (sessions, payments, messages)
- [x] Database escrow schema
- [x] UI escrow base
- [x] QR code system per escrow fisico
- [x] Notifiche admin per richiesta teca Vault

### Dati Reali
- [x] Vetrina con carte reali (API `/api/listings/featured`)
- [x] Tornei homepage con dati reali (API `/api/tournaments`)
- [x] Filtro tornei per distanza (basato su città utente)

### Community
- [x] Fix community thread error (corretto tipo params Next.js 15)
- [x] Sistema community base (posts, topics, comments)

---

## 🔴 Priorità Alta - Fix Critici

### Escrow Fisico - Bug Critici

#### **BUG #1: Payment Non Creato per Escrow Fisico** 🔴
**File**: `src/app/api/transactions/route.ts`  
**Problema**: Per escrow fisico, il payment può non esistere quando merchant verifica transazione.

**Soluzione**:
- [ ] Creare `EscrowPayment` automaticamente quando creata transazione (con status `PENDING`)
- [ ] Oppure: Merchant può creare payment quando conferma pagamento in contanti

**Priorità**: 🔴 CRITICA

---

#### **BUG #2: Rimborso Diretto invece di PendingRelease** 🔴
**File**: `src/app/api/transactions/[id]/verify/route.ts` (linea 84-97)  
**Problema**: Quando merchant rifiuta transazione, payment viene rimborsato direttamente invece di creare `PendingRelease`.

**Soluzione**:
- [ ] Creare `PendingRelease` tipo `REFUND_FULL` quando merchant rifiuta
- [ ] Admin deve approvare rimborso

**Priorità**: 🔴 CRITICA

---

#### **BUG #3: Transaction Può Essere Verificata Più Volte** 🔴
**File**: `src/app/api/transactions/[id]/verify/route.ts` (linea 136)  
**Problema**: Nessuna validazione che transaction non sia già `COMPLETED`.

**Soluzione**:
- [ ] Verificare che transaction status non sia già `COMPLETED` o `CANCELLED`
- [ ] Verificare che non esista già `PendingRelease` per questa transazione
- [ ] Ritornare errore se già verificata

**Priorità**: 🔴 CRITICA

---

#### **BUG #4: QR Code Può Essere Scansionato da Merchant Non Autorizzato** 🔴
**File**: `src/app/api/merchant/verify/scan/route.ts` (linea 125-131)  
**Problema**: Se qualcuno ottiene il QR code, può scansionarlo anche se non è il merchant autorizzato.

**Soluzione**:
- [ ] Verificare che `user.id === session.merchantId` quando si scansiona QR
- [ ] Aggiungere validazione in `POST /api/merchant/verify/scan`
- [ ] Ritornare errore 403 se merchant non autorizzato

**Priorità**: 🔴 CRITICA

---

#### **BUG #5: Payment Amount Non Validato** 🔴
**File**: `src/app/api/escrow/payments/route.ts` (linea 76+)  
**Problema**: Quando si crea payment, amount non viene validato contro transaction amount.

**Soluzione**:
- [ ] Validare che `payment.amount === escrowSession.totalAmount` (±5% tolleranza)
- [ ] Oppure: Usare sempre `escrowSession.totalAmount` per payment

**Priorità**: 🔴 CRITICA

---

### Escrow Fisico - Bug Minori

#### **BUG #6: Nessuna Scadenza QR Code** 🟡
**Problema**: QR code non scade mai, può essere usato anche dopo mesi.

**Soluzione**:
- [ ] Aggiungere campo `qrCodeExpiresAt` a `EscrowSession` (schema Prisma)
- [ ] Impostare scadenza a 7 giorni dalla creazione
- [ ] Validare scadenza quando si scansiona QR

**Priorità**: 🟡 MEDIA

---

#### **BUG #7: Notifiche Duplicate** 🟡
**Problema**: Se API chiamata più volte, notifiche duplicate.

**Soluzione**:
- [ ] Usare idempotency key per notifiche
- [ ] Verificare che notifica non esista già prima di creare

**Priorità**: 🟡 MEDIA

---

#### **BUG #8: Nessun Rate Limiting** 🟡
**Problema**: Nessun rate limiting su creazione payment o scansione QR.

**Soluzione**:
- [ ] Implementare rate limiting con Redis o middleware
- [ ] Limite: max 10 payment/ora per utente
- [ ] Limite: max 50 scan QR/ora per merchant

**Priorità**: 🟡 MEDIA

---

### Sistema Pagamenti Online

#### **FEATURE #1: Integrazione Stripe Completa** 🔴
**Stato**: Non implementato  
**Priorità**: 🔴 Alta (ma non MVP)

**Mancante**:
- [ ] Setup Stripe account e API keys
- [ ] Creazione Payment Intent con manual capture
- [ ] Stripe Checkout integration
- [ ] Webhook handler con verifica firma
- [ ] Stripe Connect per seller payouts
- [ ] Gestione commissioni (5% seller, 2% merchant, 3% platform)

**File da creare**:
- `src/lib/stripe.ts` - Stripe client setup
- `src/app/api/payments/intent/route.ts` - Create payment intent
- `src/app/api/payments/[id]/capture/route.ts` - Capture payment
- `src/app/api/webhooks/stripe/route.ts` - Stripe webhooks
- `src/app/escrow/sessions/[id]/payment/page.tsx` - Payment UI

**Tempo stimato**: 5-7 giorni

---

### Sicurezza & Auth

#### **FIX #1: Redirect Automatico al Login** 🔴
**Problema**: Dashboard e Admin mostrano pagina vuota invece di redirect.

**File da modificare**:
- `src/app/dashboard/page.tsx`
- `src/app/admin/page.tsx`
- Middleware o componenti protetti

**Soluzione**:
- [ ] Implementare redirect automatico se utente non autenticato
- [ ] Mostrare loading state durante verifica auth
- [ ] Redirect a `/login?redirect=/dashboard` o simile

**Priorità**: 🔴 CRITICA

---

#### **FIX #2: Verifica Email Obbligatoria** 🔴
**Stato**: Parzialmente implementato (Supabase gestisce)

**Miglioramenti**:
- [ ] Bloccare accesso a funzionalità se email non verificata
- [ ] Banner reminder per verificare email
- [ ] Resend verification email

**Priorità**: 🔴 ALTA

---

#### **FIX #3: Rate Limiting API** 🔴
**Stato**: Non implementato

**Soluzione**:
- [ ] Implementare rate limiting con Redis o middleware Next.js
- [ ] Limiti per endpoint critici:
  - Creazione listing: 10/ora
  - Creazione proposta: 20/ora
  - Creazione payment: 10/ora
  - Scansione QR: 50/ora

**Priorità**: 🔴 ALTA

---

### Database & Migrations

#### **FIX #4: Migration Production** 🔴
**File**: `FIX_REQUIRED.md`

**Problema**: Tabelle mancanti in produzione causano errori 500.

**Tabelle da creare**:
- `Dispute`
- `DisputeMessage`
- `AdminNotification`
- `PendingRelease`
- `FinancialAuditLog`

**Soluzione**:
- [ ] Eseguire `npx prisma migrate deploy` su produzione
- [ ] Verificare che tutte le tabelle esistano
- [ ] Testare tutte le funzionalità dopo migration

**Priorità**: 🔴 CRITICA

---

## 🟡 Priorità Media - Features Importanti

### Escrow Fisico - Feature Mancanti

#### **FEATURE #1: Scheduling Appuntamenti** 🟡
**Stato**: Parzialmente implementato (`scheduledDate`, `scheduledTime`)

**Mancante**:
- [ ] UI per selezionare data/ora disponibile
- [ ] Validazione che shop sia aperto in quel momento
- [ ] Notifica reminder 24h prima
- [ ] Possibilità di modificare/cancellare appuntamento

**Priorità**: 🟡 MEDIA

---

#### **FEATURE #2: Verifica Codice Alternativa** 🟡
**Stato**: Implementato (`verificationCode`)

**Miglioramenti**:
- [ ] Generazione codice più sicuro (6 cifre invece di 4?)
- [ ] Codice scade dopo X minuti
- [ ] Limite tentativi (max 3)

**Priorità**: 🟡 MEDIA

---

#### **FEATURE #3: Dispute durante Verifica** 🟡
**Stato**: Non implementato

**Mancante**:
- [ ] Buyer/Seller possono aprire dispute durante verifica
- [ ] Merchant può vedere dispute e decidere
- [ ] Admin può intervenire

**Priorità**: 🟡 MEDIA

---

### Escrow Online - Feature Mancanti

#### **FEATURE #4: Escrow Wallet** 🟡
**Stato**: Modello esiste ma non utilizzato

**Mancante**:
- [ ] UI per depositare fondi nel wallet
- [ ] UI per prelevare fondi
- [ ] Integrazione con Stripe per deposit/withdraw
- [ ] Storico transazioni wallet

**Priorità**: 🟡 MEDIA

---

#### **FEATURE #5: Pagamenti Parziali** 🟡
**Stato**: Non supportato

**Mancante**:
- [ ] Supporto per pagare transazione in rate
- [ ] Rilascio fondi parziali
- [ ] Gestione scadenze rate

**Priorità**: 🟡 MEDIA

---

### Sistema Email

#### **FEATURE #6: Sistema Email Completo** 🟡
**Stato**: Non implementato

**Mancante**:
- [ ] Setup SMTP provider (SendGrid/Mailgun/Resend)
- [ ] Template email base
- [ ] Email conferma registrazione
- [ ] Email reset password
- [ ] Email nuova proposta
- [ ] Email transazione SafeTrade
- [ ] Email approvazione merchant
- [ ] Email reminder appuntamenti
- [ ] Preferenze email utente

**Priorità**: 🟡 MEDIA  
**Tempo stimato**: 3-4 giorni

---

### Sistema Recensioni

#### **FEATURE #7: Sistema Recensioni** 🟡
**Stato**: Non implementato

**Mancante**:
- [ ] Database schema reviews
- [ ] API per creare recensione
- [ ] API per ottenere recensioni
- [ ] UI per lasciare recensione
- [ ] UI per visualizzare recensioni
- [ ] Sistema di rating (stelle)
- [ ] Moderazione recensioni (admin)
- [ ] Verifica acquisto (solo chi ha comprato può recensire)

**Priorità**: 🟡 MEDIA  
**Tempo stimato**: 4-5 giorni

---

### Google Maps Integration

#### **FEATURE #8: Google Maps** 🟡
**Stato**: Non implementato

**Mancante**:
- [ ] API Key Google Maps configurata
- [ ] Mappa interattiva nella landing page negozi
- [ ] Geolocalizzazione utente per negozi vicini
- [ ] Indicazioni stradali al negozio
- [ ] Preview mappa statica se API non disponibile

**Priorità**: 🟡 MEDIA

---

### Dark Mode

#### **FEATURE #9: Dark Mode Completo** 🟡
**Stato**: Parziale (struttura presente)

**Mancante**:
- [ ] Implementare toggle dark mode
- [ ] Salvare preferenza utente (localStorage o DB)
- [ ] Applicare a tutte le pagine
- [ ] Testare contrasti colori
- [ ] Ottimizzare immagini per dark mode

**Priorità**: 🟡 MEDIA  
**Tempo stimato**: 2-3 giorni

---

### PWA Implementation

#### **FEATURE #10: PWA Completa** 🟡
**Stato**: Parziale (manifest.json base)

**Mancante**:
- [ ] Service Worker
- [ ] Offline fallback page
- [ ] Cache strategy
- [ ] Install prompt
- [ ] Push notifications setup
- [ ] Icons per diverse piattaforme
- [ ] Test su mobile

**Priorità**: 🟡 MEDIA  
**Tempo stimato**: 3-4 giorni

---

## 🟢 Priorità Bassa - Miglioramenti

### Analytics & Dashboard

#### **FEATURE #11: Analytics Dashboard** 🟢
**Stato**: Non implementato

**Mancante**:
- [ ] Google Analytics 4
- [ ] Custom events tracking
- [ ] Dashboard admin analytics
- [ ] Dashboard merchant analytics
- [ ] Grafici vendite
- [ ] KPI principali
- [ ] Export dati

**Priorità**: 🟢 BASSA  
**Tempo stimato**: 4-5 giorni

---

### Sistema Wishlist

#### **FEATURE #12: Sistema Wishlist** 🟢
**Stato**: Non implementato

**Mancante**:
- [ ] Database schema
- [ ] API wishlist
- [ ] UI add to wishlist
- [ ] Pagina wishlist utente
- [ ] Notifiche drop prezzi
- [ ] Condivisione wishlist

**Priorità**: 🟢 BASSA  
**Tempo stimato**: 2-3 giorni

---

### Advanced Search & Filters

#### **FEATURE #13: Ricerca Avanzata** 🟢
**Stato**: Parziale (filtri base presenti)

**Mancante**:
- [ ] Ricerca full-text avanzata
- [ ] Filtri salvati
- [ ] Suggerimenti ricerca
- [ ] Cronologia ricerche
- [ ] Filtri per rarità carte
- [ ] Filtri per edizione
- [ ] Ordinamento avanzato

**Priorità**: 🟢 BASSA  
**Tempo stimato**: 3-4 giorni

---

### Social Features

#### **FEATURE #14: Social Features** 🟢
**Stato**: Non implementato

**Mancante**:
- [ ] Follow/Unfollow utenti
- [ ] Feed attività
- [ ] Like su listing
- [ ] Commenti su listing
- [ ] Condivisione social
- [ ] Profilo pubblico utente
- [ ] Badge utente

**Priorità**: 🟢 BASSA  
**Tempo stimato**: 5-7 giorni

---

### Chat/Messaggistica

#### **FEATURE #15: Chat in Tempo Reale** 🟢
**Stato**: Parziale (chat escrow esiste)

**Mancante**:
- [ ] Chat generale tra utenti
- [ ] Storico conversazioni
- [ ] Notifiche nuovi messaggi
- [ ] Blocco utenti
- [ ] Report messaggi inappropriati

**Priorità**: 🟢 BASSA  
**Tempo stimato**: 3-4 giorni

---

### Gamification

#### **FEATURE #16: Sistema Badge & Achievements** 🟢
**Stato**: Parziale (schema esiste)

**Mancante**:
- [ ] Logica assegnazione badge
- [ ] UI badge visibili
- [ ] Leaderboard collezionisti
- [ ] Sfide settimanali
- [ ] Ricompense per attività

**Priorità**: 🟢 BASSA  
**Tempo stimato**: 3-4 giorni

---

### Ottimizzazioni Generali

#### **IMPROVEMENT #1: Audit Trail Completo** 🟡
**Stato**: Parzialmente implementato

**Mancante**:
- [ ] Log tutte le azioni su escrow (chi, quando, cosa)
- [ ] Log modifiche payment status
- [ ] Log accessi QR code
- [ ] Dashboard admin per vedere audit trail

**Priorità**: 🟡 MEDIA

---

#### **IMPROVEMENT #2: Real-time Updates** 🟡
**Stato**: Parzialmente implementato (Supabase Realtime)

**Miglioramenti**:
- [ ] Real-time status payment
- [ ] Real-time messaggi sessione
- [ ] Real-time notifiche
- [ ] WebSocket per aggiornamenti istantanei

**Priorità**: 🟡 MEDIA

---

#### **IMPROVEMENT #3: Performance Optimization** 🟡
**Stato**: Non implementato

**Mancante**:
- [ ] Lighthouse audit
- [ ] Image optimization (WebP, lazy loading)
- [ ] Code splitting avanzato
- [ ] Bundle size optimization
- [ ] Database query optimization
- [ ] Caching strategy
- [ ] CDN setup

**Priorità**: 🟡 MEDIA  
**Tempo stimato**: Ongoing

---

#### **IMPROVEMENT #4: Accessibility (A11y)** 🟡
**Stato**: Parziale

**Mancante**:
- [ ] ARIA labels completi
- [ ] Keyboard navigation
- [ ] Screen reader testing
- [ ] Color contrast WCAG AA
- [ ] Focus indicators
- [ ] Alt text immagini
- [ ] Form validation a11y

**Priorità**: 🟡 MEDIA  
**Tempo stimato**: 4-5 giorni

---

## 🧪 Test da Completare

### Test Critici (Pre-Produzione)

#### **TEST #1: Unicità QR Code** 🔴
**Priorità**: 🔴 ALTA

**Script**: `scripts/test-qr-uniqueness.ts` (da creare)

**Test**:
- [ ] Genera 1000 transazioni simultanee
- [ ] Verifica che tutti i QR siano univoci
- [ ] Tenta di inserire un QR duplicato nel database
- [ ] Conferma che PostgreSQL blocca il duplicato

---

#### **TEST #2: Calcolo Fee** 🔴
**Priorità**: 🔴 ALTA

**Test**:
- [ ] Fee SELLER: Prezzo €100, Fee 5% → Venditore riceve €95
- [ ] Fee BUYER: Prezzo €100, Fee 5% → Acquirente paga €105
- [ ] Fee SPLIT: Prezzo €100, Fee 5% → Acquirente €102.50, Venditore €97.50
- [ ] Arrotondamento: Verifica che non ci siano perdite

---

#### **TEST #3: Flow Completo End-to-End** 🔴
**Priorità**: 🔴 ALTA

**Flow**:
1. [ ] Buyer crea listing
2. [ ] Seller fa proposta
3. [ ] Buyer accetta proposta
4. [ ] Sistema genera QR
5. [ ] Merchant scansiona QR
6. [ ] Merchant verifica e completa
7. [ ] Admin approva rilascio fondi
8. [ ] Fondi rilasciati correttamente

---

#### **TEST #4: Transazione Rifiutata** 🔴
**Priorità**: 🔴 ALTA

**Test**:
- [ ] Merchant rifiuta transazione
- [ ] Listing torna disponibile
- [ ] Payment rimborsato (via PendingRelease)
- [ ] Notifiche inviate

---

#### **TEST #5: Doppia Accettazione** 🔴
**Priorità**: 🔴 ALTA

**Test**:
- [ ] Due utenti accettano la stessa proposta simultaneamente
- [ ] Solo il primo deve avere successo
- [ ] Il secondo deve ricevere errore

---

### Test Sicurezza

#### **TEST #6: Autenticazione QR** 🔴
**Priorità**: 🔴 ALTA

**Test**:
- [ ] Utente non autenticato tenta scansione → Errore 401
- [ ] Merchant scansiona QR di altro negozio → Errore 403
- [ ] Utente normale tenta scansione → Errore 403
- [ ] Admin può scannerizzare → OK

---

#### **TEST #7: Manipolazione Fee** 🔴
**Priorità**: 🔴 ALTA

**Test**:
- [ ] Tentativo di modificare `feePaidBy` via API → Bloccato
- [ ] Tentativo di modificare `totalAmount` via API → Bloccato
- [ ] Tentativo di bypass calcolo fee → Bloccato
- [ ] SQL injection nei campi prezzo → Bloccato

---

### Test Performance

#### **TEST #8: Caricamento Pagine** 🟡
**Priorità**: 🟡 MEDIA

**Target**:
- [ ] Marketplace: < 2 secondi
- [ ] Listing detail: < 1 secondo
- [ ] Form proposta: < 1 secondo
- [ ] QR code page: < 0.5 secondi

---

#### **TEST #9: Database Query** 🟡
**Priorità**: 🟡 MEDIA

**Test**:
- [ ] Query listings con 10,000 record
- [ ] Query transazioni con 1,000 record
- [ ] Join complessi (listing + user + proposal)
- [ ] Indexes configurati correttamente

---

### Test Mobile

#### **TEST #10: Responsive Design** 🟡
**Priorità**: 🟡 MEDIA

**Device da testare**:
- [ ] iPhone SE (piccolo)
- [ ] iPhone 12 Pro (medio)
- [ ] iPad (tablet)
- [ ] Android vari

**Verifica**:
- [ ] Form leggibili
- [ ] QR ben visibile
- [ ] Bottoni cliccabili
- [ ] No overflow testo

---

## 🐛 Bug da Risolvere

### Bug Generali

#### **BUG #9: Shop Landing Page Error 500** 🔴
**File**: `src/app/shops/[slug]/page.tsx`

**Problema**: La landing page per negozi autorizzati dà errore 500.

**Verifica**:
- [ ] Controllare errori console
- [ ] Verificare query Prisma
- [ ] Verificare che shop esista
- [ ] Verificare relazioni (merchant, promotions, tournaments)

**Priorità**: 🔴 CRITICA

---

#### **BUG #10: Tornei Non Visibili** 🔴
**Problema**: Tornei non visibili anche dopo creazione.

**Verifica**:
- [ ] Controllare filtro distanza
- [ ] Verificare che tornei siano `PUBLISHED`
- [ ] Verificare che data sia futura
- [ ] Verificare query API `/api/tournaments`

**Priorità**: 🔴 ALTA

---

#### **BUG #11: Auto-Refresh Tornei** 🟡
**Problema**: Nuovi tornei non si aggiornano automaticamente sulla homepage.

**Soluzione**:
- [ ] Implementare polling ogni 30 secondi
- [ ] Usare Supabase Realtime per aggiornamenti
- [ ] Refresh quando tab diventa visibile

**Priorità**: 🟡 MEDIA

---

## 📝 Note e Roadmap

### Fase 1: Fix Critici (Settimana 1)
1. BUG #1: Payment Non Creato
2. BUG #2: Rimborso Diretto
3. BUG #3: Transaction Verificata Più Volte
4. BUG #4: QR Code Autorizzazione
5. BUG #5: Payment Amount Validazione
6. FIX #1: Redirect Login
7. FIX #4: Migration Production

### Fase 2: Miglioramenti Sicurezza (Settimana 2)
8. BUG #6: Scadenza QR Code
9. BUG #7: Notifiche Duplicate
10. BUG #8: Rate Limiting
11. FIX #2: Verifica Email
12. FIX #3: Rate Limiting API

### Fase 3: Feature Escrow Online (Settimana 3-4)
13. FEATURE #1: Integrazione Stripe Completa

### Fase 4: Feature Avanzate (Settimana 5+)
14. FEATURE #6: Sistema Email
15. FEATURE #7: Sistema Recensioni
16. FEATURE #9: Dark Mode Completo
17. FEATURE #10: PWA Completa

---

## 📊 Statistiche

### Task Totali
- ✅ Completate: 9 (Marketplace improvements)
- 🔴 Priorità Alta: 15 task
- 🟡 Priorità Media: 20 task
- 🟢 Priorità Bassa: 10 task
- 🧪 Test: 10 test critici

### Tempo Stimato Totale
- Fix Critici: ~1-2 settimane
- Features Importanti: ~4-6 settimane
- Miglioramenti: ~3-4 settimane
- **TOTALE**: ~8-12 settimane

---

## 🔗 File Originali Raggruppati

Questo file unifica i seguenti documenti:
- `TODO_MARKETPLACE_IMPROVEMENTS.md` ✅ (tutto completato)
- `TECNICO/TODO_IMPROVEMENTS.md`
- `TECNICO/task/TASK_LIST_DETTAGLIATA.md`
- `TECNICO/ESCROW_COMPLETE_ANALYSIS.md`
- `TEST_CHECKLIST.md`
- `TECNICO/TESTDAFARE.md`
- `FIX_REQUIRED.md`
- `FUNZIONALITA_MANCANTI.md`
- `TECNICO/task/MECCANICHE_DA_IMPLEMENTARE.md`

---

**Ultimo aggiornamento**: 2025-01-XX  
**Prossimo aggiornamento**: Dopo completamento Fase 1

