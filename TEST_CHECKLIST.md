# 🧪 Checklist Test Pre-Deploy - SafeTrade

**Data Creazione**: 2025-01-30  
**Obiettivo**: Verificare funzionalità e performance prima del deploy per identificare se la lentezza è dovuta all'ambiente locale o a problemi di codice.

---

## 📋 Indice

1. [Setup e Configurazione](#setup-e-configurazione)
2. [Test Funzionali Base](#test-funzionali-base)
3. [Test Performance](#test-performance)
4. [Test Navigazione e UX](#test-navigazione-e-ux)
5. [Test Integrazione](#test-integrazione)
6. [Test Pre-Deploy](#test-pre-deploy)

---

## 1. 🔧 Setup e Configurazione

### Variabili d'Ambiente
- [ ] Verifica che `.env.local` esista e contenga tutte le variabili necessarie:
  ```env
  # Database
  DATABASE_URL="postgresql://..."
  
  # Supabase
  NEXT_PUBLIC_SUPABASE_URL="https://..."
  NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
  SUPABASE_SERVICE_ROLE_KEY="..."
  
  # Cloudinary (opzionale)
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
  CLOUDINARY_API_KEY="..."
  CLOUDINARY_API_SECRET="..."
  ```

- [ ] Verifica che le variabili d'ambiente siano corrette:
  - [ ] `DATABASE_URL` punta al database corretto
  - [ ] Supabase URL e keys sono validi
  - [ ] Cloudinary (se usato) è configurato

### Database
- [ ] Esegui migration: `npm run db:push` (o `db:migrate`)
- [ ] Verifica che lo schema sia aggiornato: `npm run db:generate`
- [ ] (Opzionale) Verifica database con Prisma Studio: `npm run db:studio`
  - [ ] Controlla che le tabelle esistano
  - [ ] Verifica che ci siano dati di test (se presenti)

### Dipendenze
- [ ] Installa dipendenze: `npm install`
- [ ] Verifica che non ci siano errori: `npm run lint`
- [ ] Verifica build: `npm run build` (non dovrebbe avere errori)

### Avvio Applicazione
- [ ] Avvia server dev: `npm run dev` (o `AVVIA_TUTTO.bat`)
- [ ] Verifica che il server si avvii senza errori
- [ ] Verifica che l'app sia accessibile su `http://localhost:3000`

---

## 2. ✅ Test Funzionali Base

### Autenticazione
- [ ] **Registrazione Utente Base (USER)**
  - [ ] Vai su `/signup`
  - [ ] Compila form (email, password, nome)
  - [ ] Seleziona ruolo "USER"
  - [ ] Submit form
  - [ ] Verifica redirect a `/dashboard`
  - [ ] Verifica che l'utente sia loggato

- [ ] **Login**
  - [ ] Vai su `/login`
  - [ ] Inserisci credenziali valide
  - [ ] Submit form
  - [ ] Verifica redirect a `/dashboard`
  - [ ] Verifica che la sessione persista al refresh

- [ ] **Logout**
  - [ ] Clicca su logout nell'header
  - [ ] Verifica redirect a homepage
  - [ ] Verifica che l'utente non sia più loggato

### Homepage
- [ ] **Caricamento Homepage**
  - [ ] Vai su `/`
  - [ ] Verifica che la pagina carichi completamente
  - [ ] Verifica che tutti i componenti siano visibili:
    - [ ] Hero section
    - [ ] Categorie
    - [ ] Featured listings (se presenti)
    - [ ] All listings grid
    - [ ] Footer

- [ ] **Navigazione Homepage**
  - [ ] Clicca su link "Browse Listings" → Verifica redirect
  - [ ] Clicca su link "Sign Up" → Verifica redirect
  - [ ] Clicca su link "Log In" → Verifica redirect

### Marketplace - Listings
- [ ] **Visualizza Lista Listings**
  - [ ] Vai su `/listings`
  - [ ] Verifica che la lista carichi
  - [ ] Verifica che i listings siano visualizzati correttamente
  - [ ] Verifica immagini, prezzi, titoli

- [ ] **Ricerca Listings**
  - [ ] Usa barra di ricerca
  - [ ] Verifica che i risultati filtrino correttamente
  - [ ] Usa filtri (gioco, condizione, prezzo)
  - [ ] Verifica che i filtri funzionino

- [ ] **Dettaglio Listing**
  - [ ] Clicca su un listing
  - [ ] Verifica che la pagina `/listings/[id]` carichi
  - [ ] Verifica che tutte le informazioni siano visibili:
    - [ ] Immagini
    - [ ] Titolo, descrizione
    - [ ] Prezzo, condizione
    - [ ] Informazioni venditore
  - [ ] Verifica bottone "Make Proposal" (se loggato)

- [ ] **Crea Listing (solo utenti loggati)**
  - [ ] Loggati come USER
  - [ ] Vai su `/sell`
  - [ ] Verifica che appaia solo "Sell as Collector"
  - [ ] Clicca "Sell as Collector"
  - [ ] Compila form creazione listing
  - [ ] Upload immagini (se possibile)
  - [ ] Submit form
  - [ ] Verifica che il listing sia creato
  - [ ] Verifica redirect a dashboard/listings

### Dashboard Utente
- [ ] **Accesso Dashboard**
  - [ ] Loggati come USER
  - [ ] Vai su `/dashboard`
  - [ ] Verifica che la pagina carichi
  - [ ] Verifica che i dati utente siano corretti

- [ ] **Visualizza Listings Utente**
  - [ ] Nella dashboard, verifica lista listing personali
  - [ ] Clicca su un listing → Verifica dettaglio
  - [ ] (Se presente) Modifica listing → Verifica funzionamento

- [ ] **Gestione Proposte**
  - [ ] Vai a sezione proposte (se presente)
  - [ ] Verifica proposte ricevute
  - [ ] (Se presente) Accetta/rifiuta proposta

### Merchant Dashboard (se disponibile)
- [ ] **Setup Utente Merchant**
  - [ ] Crea account con ruolo MERCHANT (o modifica utente esistente)
  - [ ] Loggati come MERCHANT
  - [ ] Verifica che la dashboard merchant sia accessibile

- [ ] **Gestione Shop**
  - [ ] Vai su `/merchant/shop` o `/dashboard/merchant`
  - [ ] Verifica che la dashboard carichi
  - [ ] (Se presente) Setup shop → Verifica funzionamento

- [ ] **Gestione Inventario**
  - [ ] Vai su inventario
  - [ ] Verifica lista prodotti
  - [ ] (Se possibile) Crea/modifica prodotto

- [ ] **Vendita Merchant**
  - [ ] Vai su `/sell`
  - [ ] Verifica che appaia "Sell as Merchant"
  - [ ] Verifica che si apra direttamente "Sell as Merchant" (se configurato)

---

## 3. ⚡ Test Performance

### Tempi di Caricamento (da Console Browser)
Apri DevTools (F12) → Tab Network → Disabilita cache → Refresh pagina

#### Homepage (`/`)
- [ ] **First Contentful Paint (FCP)**: < 1.5s
- [ ] **Time to Interactive (TTI)**: < 3s
- [ ] **Total Load Time**: < 5s
- [ ] **Numero Request**: < 50
- [ ] **Dimensione totale**: < 2MB

#### Listings Page (`/listings`)
- [ ] **First Load**: < 2s
- [ ] **API `/api/listings`**: < 500ms
- [ ] **Time to Interactive**: < 3s

#### Dashboard (`/dashboard`)
- [ ] **First Load**: < 2s
- [ ] **API calls**: < 1s total
- [ ] **Time to Interactive**: < 3s

### Database Performance
- [ ] **Query Tempi** (da console server)
  - [ ] Verifica log query nel terminale
  - [ ] Query semplici dovrebbero essere < 100ms
  - [ ] Query con join dovrebbero essere < 300ms

- [ ] **N+1 Query Problem**
  - [ ] Controlla che non ci siano query multiple per lo stesso dato
  - [ ] Verifica che le query usino `include` correttamente

### React Query / Caching
- [ ] **Cache Funzionante**
  - [ ] Naviga tra pagine
  - [ ] Torna su pagina già visitata
  - [ ] Verifica che i dati vengano dalla cache (Network tab)
  - [ ] Verifica che non ci siano refetch inutili

### Immagini
- [ ] **Ottimizzazione Immagini**
  - [ ] Verifica che le immagini usino Next.js Image
  - [ ] Verifica che le immagini siano lazy-loaded
  - [ ] Controlla dimensioni immagini (non dovrebbero essere troppo grandi)

---

## 4. 🧭 Test Navigazione e UX

### Navigazione Generale
- [ ] **Header**
  - [ ] Logo → Homepage funziona
  - [ ] Menu navigazione funziona
  - [ ] Bottone login/logout funziona
  - [ ] (Se presente) Switch lingua funziona

- [ ] **Footer**
  - [ ] Link footer funzionano (se presenti)
  - [ ] Footer è visibile su tutte le pagine

### Reattività UI
- [ ] **Click Response**
  - [ ] I bottoni rispondono immediatamente al click (< 100ms)
  - [ ] I link navigano velocemente
  - [ ] I form submit mostrano feedback immediato

- [ ] **Loading States**
  - [ ] Verifica che ci siano loading spinner/placeholder durante caricamenti
  - [ ] Verifica che non ci siano "flash" di contenuto bianco

- [ ] **Error Handling**
  - [ ] Prova a navigare a pagina inesistente → Verifica 404
  - [ ] Prova operazione che fallisce → Verifica messaggio errore

### Mobile Responsiveness
- [ ] **Desktop** (> 1024px)
  - [ ] Layout correttamente visualizzato
  - [ ] Tutti i componenti visibili

- [ ] **Tablet** (768px - 1024px)
  - [ ] Layout si adatta correttamente
  - [ ] Menu navigazione funziona

- [ ] **Mobile** (< 768px)
  - [ ] Layout responsive
  - [ ] Menu hamburger funziona (se presente)
  - [ ] Testi leggibili
  - [ ] Bottoni cliccabili (dimensioni adeguate)

---

## 5. 🔗 Test Integrazione

### API Routes
- [ ] **API Listings**
  - [ ] `GET /api/listings` → Risponde correttamente
  - [ ] `POST /api/listings` → Crea listing (se autenticato)
  - [ ] `GET /api/listings/[id]` → Ritorna listing specifico

- [ ] **API Auth**
  - [ ] `POST /api/auth/login` → Funziona
  - [ ] `POST /api/auth/signup` → Funziona

- [ ] **API Dashboard** (se presente)
  - [ ] `GET /api/dashboard` → Ritorna dati corretti

### Supabase Integration
- [ ] **Autenticazione**
  - [ ] Login con Supabase funziona
  - [ ] Session persistente
  - [ ] Logout funziona

- [ ] **Storage** (se usato)
  - [ ] Upload immagini funziona
  - [ ] Download immagini funziona

- [ ] **Realtime** (se usato)
  - [ ] Notifiche real-time funzionano
  - [ ] Chat real-time funziona (se presente)

### Database Integration
- [ ] **CRUD Operations**
  - [ ] Create: Crea nuovo record → Verifica nel database
  - [ ] Read: Leggi record → Verifica dati corretti
  - [ ] Update: Modifica record → Verifica aggiornamento
  - [ ] Delete: Elimina record → Verifica cancellazione

---

## 6. 🚀 Test Pre-Deploy

### Build Production
- [ ] **Build Locale**
  ```bash
  npm run build
  ```
  - [ ] Build completa senza errori
  - [ ] Nessun warning critico
  - [ ] File `.next` generato correttamente

- [ ] **Start Production Build**
  ```bash
  npm start
  ```
  - [ ] Server si avvia
  - [ ] App accessibile su `http://localhost:3000`
  - [ ] Funzionalità base funzionano

### Environment Variables Production
- [ ] **Verifica Variabili per Production**
  - [ ] `DATABASE_URL` punta a database production
  - [ ] Supabase URL/keys sono per production
  - [ ] Cloudinary (se usato) è configurato

### Ottimizzazioni
- [ ] **Code Splitting**
  - [ ] Verifica che il bundle non sia troppo grande
  - [ ] Verifica che ci sia code splitting (pagina per pagina)

- [ ] **SEO**
  - [ ] Verifica meta tags (title, description)
  - [ ] Verifica Open Graph tags (se presenti)

### Error Handling Production
- [ ] **Error Pages**
  - [ ] 404 page personalizzata (se presente)
  - [ ] 500 page (error handling generico)

### Security
- [ ] **Auth Protection**
  - [ ] Route protette non accessibili senza auth
  - [ ] Middleware funziona correttamente

- [ ] **API Security**
  - [ ] API routes protette richiedono autenticazione (se necessario)
  - [ ] CORS configurato correttamente (se necessario)

---

## 📊 Metriche Performance da Registrare

Per confrontare performance locale vs production, registra questi valori:

### Homepage (`/`)
| Metrica | Locale | Production | Note |
|---------|--------|------------|------|
| First Contentful Paint | _____ | _____ | |
| Time to Interactive | _____ | _____ | |
| Total Load Time | _____ | _____ | |
| Number of Requests | _____ | _____ | |
| Total Size | _____ | _____ | |

### Listings Page (`/listings`)
| Metrica | Locale | Production | Note |
|---------|--------|------------|------|
| API Response Time | _____ | _____ | `/api/listings` |
| First Load | _____ | _____ | |
| Time to Interactive | _____ | _____ | |

### Dashboard (`/dashboard`)
| Metrica | Locale | Production | Note |
|---------|--------|------------|------|
| First Load | _____ | _____ | |
| API Calls Total | _____ | _____ | |
| Time to Interactive | _____ | _____ | |

---

## 🔍 Diagnostica Lentezza

Se il sito è ancora lento, controlla:

### Locale
- [ ] **Database Locale**
  - [ ] PostgreSQL è in locale o remoto?
  - [ ] Se remoto, latenza di rete potrebbe essere il problema
  - [ ] Considera database locale per sviluppo

- [ ] **Network Locale**
  - [ ] Velocità connessione internet
  - [ ] Se database è remoto, latenza può causare lentezza

- [ ] **Hardware**
  - [ ] CPU/RAM sufficienti?
  - [ ] Disco SSD o HDD?
  - [ ] Altri processi pesanti in esecuzione?

### Codice
- [ ] **Query Database**
  - [ ] Troppe query per pagina?
  - [ ] Query N+1 problem?
  - [ ] Manca indexing su colonne usate in WHERE?

- [ ] **Rendering**
  - [ ] Troppi re-render?
  - [ ] Componenti non memoizzati?
  - [ ] Immagini non ottimizzate?

- [ ] **Bundle Size**
  - [ ] Bundle JavaScript troppo grande?
  - [ ] Manca code splitting?
  - [ ] Dipendenze inutili?

---

## ✅ Checklist Finale Pre-Deploy

Prima di fare deploy, verifica:

- [ ] Tutti i test funzionali base passano
- [ ] Build production completa senza errori
- [ ] Variabili d'ambiente production configurate
- [ ] Performance accettabile (o almeno documentata)
- [ ] Error handling funziona
- [ ] Security checks passati
- [ ] Mobile responsiveness verificata
- [ ] Browser compatibility verificata (almeno Chrome, Firefox, Safari)

---

## 7. 💎 Test Nuove Funzionalità Premium

### Sistema Subscription
- [ ] **Visualizzazione Piani**
  - [ ] Vai su `/pricing`
  - [ ] Verifica che i 3 piani siano visibili (FREE, PREMIUM, PRO)
  - [ ] Verifica prezzi mensili e annuali
  - [ ] Verifica features elencate per ogni piano
  - [ ] Toggle mensile/annuale funziona

- [ ] **Attivazione Subscription (Simulato)**
  - [ ] Loggati come utente
  - [ ] Vai su `/pricing`
  - [ ] Clicca "Passa a Premium"
  - [ ] Verifica messaggio di conferma
  - [ ] Verifica che il piano sia attivo nel profilo

- [ ] **API Subscription**
  - [ ] `GET /api/subscriptions/plans` → Lista piani
  - [ ] `GET /api/subscriptions/my` → Subscription utente (401 se non loggato)
  - [ ] `POST /api/subscriptions` → Attiva subscription (richiede login)

### Early Access Listings
- [ ] **Creazione Listing con Early Access**
  - [ ] Loggati come utente Premium
  - [ ] Crea un nuovo listing
  - [ ] Verifica che il listing abbia `visibility: EARLY_ACCESS`
  - [ ] Verifica `earlyAccessEnd` sia 24h nel futuro

- [ ] **Visualizzazione Early Access**
  - [ ] Come utente FREE, verifica che listing early access NON siano visibili
  - [ ] Come utente Premium, verifica che listing early access SIANO visibili
  - [ ] Verifica badge "EARLY ACCESS" sui listing

- [ ] **Scadenza Early Access**
  - [ ] Dopo 24h, il listing deve diventare PUBLIC
  - [ ] Utenti FREE devono vederlo

### Community & Karma System
- [ ] **Visualizzazione Karma**
  - [ ] `GET /api/karma` → Ritorna karma utente
  - [ ] Verifica karma level (NEW, TRUSTED, ELITE, LEGEND)

- [ ] **Creazione Post con Rate Limiting**
  - [ ] Loggati come utente nuovo (karma < 50)
  - [ ] Crea post → Verifica che sia in attesa di approvazione
  - [ ] Prova a creare altro post entro 5 min → Dovrebbe essere bloccato

- [ ] **Auto-Approvazione**
  - [ ] Come utente con karma > 50, crea post
  - [ ] Verifica che sia auto-approvato

- [ ] **Spam Detection**
  - [ ] Crea post con keyword spam ("compra qui", link esterni)
  - [ ] Verifica che sia flaggato automaticamente

- [ ] **Topic Premium (Insider Circle)**
  - [ ] Come utente FREE, verifica che topic premium siano locked
  - [ ] Come utente Premium, verifica accesso a topic premium
  - [ ] Verifica badge "PREMIUM" sui topic

### Price Alerts
- [ ] **Creazione Alert**
  - [ ] Loggati
  - [ ] `POST /api/alerts` con condizioni (cardName, maxPrice, game)
  - [ ] Verifica che l'alert sia creato

- [ ] **Limiti Alert**
  - [ ] Come utente FREE, verifica limite 3 alert
  - [ ] Come utente Premium, verifica limite 20 alert
  - [ ] Come utente PRO, verifica alert illimitati

- [ ] **Trigger Alert**
  - [ ] Crea alert con maxPrice: 50
  - [ ] Crea listing con price: 40
  - [ ] Verifica che sia stato creato AlertTrigger
  - [ ] Verifica notifica utente

### Events Calendar
- [ ] **Visualizzazione Eventi**
  - [ ] Vai su `/events`
  - [ ] Verifica calendario mensile
  - [ ] Verifica lista eventi
  - [ ] Filtri per tipo e gioco funzionano

- [ ] **Registrazione Evento**
  - [ ] Loggati
  - [ ] Clicca "Iscriviti" su un evento
  - [ ] Verifica conferma registrazione
  - [ ] Verifica badge "Iscritto" sul pulsante

- [ ] **Eventi Premium**
  - [ ] Come utente FREE, verifica che eventi premium siano locked
  - [ ] Come utente Premium, verifica possibilità di iscriversi

- [ ] **Creazione Evento (Merchant)**
  - [ ] Loggati come Merchant/Admin
  - [ ] `POST /api/events` con dati evento
  - [ ] Verifica creazione evento

### Priority SafeTrade Queue
- [ ] **Priority Tier Assignment**
  - [ ] Come utente FREE, crea transazione → Verifica `priorityTier: STANDARD`
  - [ ] Come utente Premium, crea transazione → Verifica `priorityTier: PRIORITY`
  - [ ] Come utente PRO, crea transazione → Verifica `priorityTier: FAST_TRACK`

- [ ] **Ordinamento Transazioni**
  - [ ] `GET /api/transactions?shopId=xxx`
  - [ ] Verifica che le transazioni siano ordinate per priorityTier (FAST_TRACK > PRIORITY > STANDARD)

- [ ] **Limite Mensile Premium**
  - [ ] Come utente Premium, usa 5 transazioni priority
  - [ ] Alla 6a transazione, verifica che sia STANDARD

---

## 📝 Note

- Usa questa checklist sistematicamente
- Segna ogni test completato con `[x]`
- Documenta problemi trovati
- Confronta metriche locale vs production per identificare se la lentezza è ambientale o di codice

---

**Ultimo Aggiornamento**: 2026-01-09
**Versione**: 2.0 (con nuove features Premium)


