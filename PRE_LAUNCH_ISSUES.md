# SafeTrade – Pre‑Launch Issues & Decisions

**Last update**: 2026‑02‑18  
**Scope**: tutto ciò che va valutato/fissato prima di un lancio pubblico “serio”.

---

## Stato Checklist (aggiornato 2026-02-18)

**Bug SafeVault risolti:** confirm-payment, canListOnline, ASSIGNED_TO_SHOP→RETURNED, split-calculator (centesimi), canSellPhysically, race condition (VaultCase lock), handleApiError in confirm-payment.

**Listings API:** validazione title max 500, description max 5000, price number/range (Large Payload fix).

**SafeVault flow (2026-02-18):** qr-batch genera qrToken on-the-fly; Tab Vendi con canSellPhysically; Cases modal con Sposta/Lista online; scan pubblica link Acquista Online a listing; list-online crea ListingP2P.

**Da fare:** Security/Stability tests (richiedono dev server), deploy.

---

## 1. Blocking issues (da risolvere prima del lancio pubblico)

### 1.1 Test di sicurezza & stabilità

- [ ] **Security tests falliti**
  - Comando: `npx tsx scripts/security-tests.ts` (o `npm run test:security`).
  - Stato attuale: 3/18 test falliscono (`TEST_SECURITY_REPORT.md`).
  - TODO (step‑by‑step):
    1. Lancia i test in locale con `npx tsx scripts/security-tests.ts` e copia l’output completo in un file tipo `logs/security-tests-latest.txt`.
    2. Per ogni test fallito, annota:
       - nome del test / suite,
       - endpoint/feature coinvolta,
       - expected vs actual (status code, body, side‑effects).
    3. Apri i file sorgente puntati dal test (route/api/lib) e:
       - verifica che la logica sia effettivamente sbagliata **oppure** che il test sia rimasto indietro rispetto alle modifiche,
       - se la logica è sbagliata → correggi il codice,
       - se la logica è giusta ma il test è vecchio → aggiorna il test in modo esplicito (mai commentare il test).
    4. Rilancia solo i test interessati (se supportato) finché non passano, poi rilancia l’intera suite per conferma.
    5. Quando 18/18 sono verdi, spunta il checkbox qui e in `TEST_SECURITY_REPORT.md` aggiorna la data/nota.

- [ ] **Stability tests falliti**
  - Comando: `npx tsx scripts/stability-tests.ts` (o `npm run test:stability`).
  - Stato: 3/8 falliti – in particolare: **Database Connection Pool**, **Error Recovery**, **Large Payload Handling**.
  - TODO (step‑by‑step):
    1. Esegui `npx tsx scripts/stability-tests.ts` e salva output dettagliato.
    2. **Database Connection Pool**:
       - controlla configurazione `prisma` (pool size, timeout) e del DB managed (Supabase/Neon/etc.),
       - verifica se il test simula più process/threads: aggiusta pool size o implementa connection reuse dove mancante,
       - se alcune API aprono connessioni “a mano” (non Prisma) chiudile esplicitamente o convertili a Prisma.
    3. **Error Recovery**:
       - individua quali endpoint vengono “killati” nel test,
       - aggiungi handling esplicito per failure di servizi esterni (retry/backoff dove ha senso, messaggi di errore chiari, nessun crash non gestito),
       - assicurati che il servizio torni “healthy” dopo il fault (testa manualmente se serve).
    4. **Large Payload Handling**:
       - identifica le route stressate dal test (upload/import/etc.),
       - aggiungi validazione dello schema e limiti (`size`/`maxLength`, `bodySizeLimit`, ecc.),
       - ritorna 413 o 422 con messaggio pulito invece di timeout / 500.
    5. Rilancia la suite di stability finché tutti e 8 i test non sono verdi, poi aggiorna `TEST_SECURITY_REPORT.md`.

### 1.2 SafeVault – bug logici su soldi / stati

Tutti da `SAFEVAULT_BUG_REPORT.md`:

- [x] **Bug conferma pagamento – stato iniziale vs PENDING** (fix: check null/UNPAID, handleApiError)
  - File: `src/app/api/vault/requests/[id]/confirm-payment/route.ts`
  - Problema: check sbagliato su `paymentStatus`; flusso corretto: `null/UNPAID → PENDING → PAID`, con blocco se già non‑null.
  - TODO (step‑by‑step):
    1. Apri la route e individua il blocco che controlla `vaultRequest.paymentStatus`.
    2. Sostituisci la condizione con quella suggerita nel bug report:
       - consenti l’operazione solo se `paymentStatus` è `null` o `UNPAID`,
       - ritorna 400 con messaggio chiaro se è già `PENDING` o `PAID`.
    3. Aggiungi un test (unit/integration) con i tre casi:
       - stato iniziale `null/UNPAID` → OK,
       - stato `PENDING` → errore 400,
       - stato `PAID` → errore 400.
    4. Rilancia i test Vault e aggiorna il checkbox.

- [x] **`canListOnline` incoerente con la state machine**
  - File: `src/lib/vault/state-machine.ts`
  - Problema: `canListOnline()` dice che si può listare da `ASSIGNED_TO_SHOP`, ma la mappa di transizioni accetta solo `IN_CASE → LISTED_ONLINE`.
  - TODO (step‑by‑step):
    1. Apri il file e trova sia la funzione `canListOnline` sia la mappa delle transizioni.
    2. Aggiorna `canListOnline` a:
       - restituire `true` solo per `status === 'IN_CASE'`,
       - aggiungi un commento breve che lo spiega (per evitare regressioni).
    3. Cerca tutti gli usi di `canListOnline` (API/list‑online, UI) e verifica che non ci siano assunzioni sbagliate (es. UI che mostra pulsante in stati non validi).
    4. Aggiungi test unit sullo state machine per `canListOnline`.

- [x] **Transizione mancante `ASSIGNED_TO_SHOP → RETURNED`**
  - File: `src/lib/vault/state-machine.ts`
  - Problema: non puoi restituire un item assegnato al negozio ma non ancora in teca.
  - TODO (step‑by‑step):
    1. Nella mappa delle transizioni, aggiungi `RETURNED` per lo stato `ASSIGNED_TO_SHOP` (`ASSIGNED_TO_SHOP: ['IN_CASE', 'RETURNED']`).
    2. Verifica dove viene usato lo stato `RETURNED` (API di ritorno item al proprietario) e assicurati che la logica sia coerente con questa nuova transizione.
    3. Aggiungi/aggiorna test per il caso “item assegnato ma non in teca viene restituito”.

- [x] **Split calculator – arrotondamento incoerente**
  - File: `src/lib/vault/split-calculator.ts`
  - Problema: owner/merchant con `Math.floor`, platform con `Math.round` → rischio discrepanze sui centesimi.
  - TODO (step‑by‑step):
    1. Decidi una policy unica: consigliato calcolare tutto in centesimi (`amountCents`) e redistribuire l’eventuale centesimo di differenza alla piattaforma.
    2. Implementa il calcolo in centesimi:
       - `grossCents = Math.round(grossAmount * 100)`,
       - `ownerCents = Math.round(grossCents * 0.70)`,
       - `merchantCents = Math.round(grossCents * 0.20)`,
       - `platformCents = grossCents - ownerCents - merchantCents`.
    3. Converti i centesimi indietro in importi decimali solo al momento di salvare/mostrare.
    4. Aggiungi test con importi “edge” (0.01, 0.03, 0.10, 1.99, 9.99, ecc.) per verificare che la somma esatta ritorni sempre al gross.

- [x] **`canSellPhysically` troppo permissivo**
  - File: `src/lib/vault/state-machine.ts`
  - Problema: permette vendita anche in stati tipo `PENDING_REVIEW` / `ACCEPTED`; vendita fisica dovrebbe essere consentita solo da `IN_CASE` / `LISTED_ONLINE`.
  - TODO (step‑by‑step):
    1. Aggiorna l’implementazione di `canSellPhysically` per restituire `true` solo se `status` è in `['IN_CASE', 'LISTED_ONLINE']`.
    2. Cerca tutti i call site di `canSellPhysically` nelle API (vendita fisica, tab “Vendi”) e verifica che non ci siano altri controlli duplicati/confusi.
    3. Aggiungi test unit per tutti gli stati possibili e assicurati che solo quelli previsti restituiscano `true`.

- [x] **Race condition in transazioni atomiche**
  - File: `src/lib/vault/transactions.ts`
  - Problema: `assignItemToSlotAtomic` locka item e slot ma non la `VaultCase`; lo status case può cambiare in parallelo.
  - TODO (step‑by‑step):
    1. Nel corpo della transazione Prisma/SQL usata da `assignItemToSlotAtomic`, aggiungi una query di lock sulla `VaultCase` (`FOR UPDATE` o equivalente tramite Prisma).
    2. Assicurati che dopo il lock venga ricontrollato lo status della case prima di proseguire con assegnazione slot/item.
    3. Aggiungi un test di concorrenza simulato (anche solo con due chiamate parallele in test) per verificare che il secondo tentativo fallisca correttamente.
    4. Logga in modo strutturato eventuali failure di concorrenza per poterle debuggare in prod.

### 1.3 SafeVault – flow core incompleto (GA per tutti i merchant con teca)

SafeVault deve essere **GA** per tutti i venditori che richiedono e pagano la teca. Questi pezzi vanno chiusi in questo ordine.

- [x] **Pagina generazione/stampa QR teche veramente pronta** (qr-batch genera 30 slot on-the-fly)
  - File: `src/app/merchant/vault/cases/[id]/qr-print/page.tsx`
  - Obiettivo: generazione e download/stampa dei 30 QR per teca, layout stampabile pulito, niente uso diretto di `window` lato SSR.
  - TODO (step‑by‑step):
    1. Sistemare l’uso di `window.location.origin`:
       - usare `typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL`,
       - assicurarsi che la pagina sia `use client` se necessario.
    2. Collegare in modo consistente l’API `GET /api/vault/cases/[id]/qr-batch`:
       - caricare tutti i 30 slot con i rispettivi QR,
       - gestire loading/error state.
    3. Implementare:
       - preview dei QR (lista 30),
       - download singolo (PNG/SVG) per slot,
       - download batch (PDF/print layout con tutti e 30).
    4. Creare un layout di stampa dedicato (CSS `@media print`) con:
       - dimensioni etichetta, codice slot, QR, eventuale logo/URL.
    5. Aggiungere un test manuale di stampa: stampare una pagina completa e verificare che i QR siano leggibili/scansionabili.

- [x] **Vista teca completa (30 slot)** (griglia 6x5, filtri, modal con Sposta/Lista online/Vendi)
  - File: `src/app/merchant/vault/cases/[id]/page.tsx`
  - Obiettivo: griglia 30 slot con stati, info carta, filtri, stats e azioni (genera QR, scansiona, assegna, rimuovi, sposta, vendi).
  - TODO (step‑by‑step):
    1. Definire il layout (6x5 o 10x3) e mappare gli slot `S01..S30` su righe/colonne.
    2. Usare l’API `GET /api/vault/cases/[id]` per caricare:
       - stato della case,
       - lista slot con info base,
       - item associati (thumbnail, game, prezzo).
    3. Implementare la griglia:
       - colore/stato per FREE/OCCUPIED,
       - mini preview QR (opzionale) o indicatore che QR esiste.
    4. Aggiungere filtri (status, game, price range) lato client consumando parametri della risposta/nuove API se necessarie.
    5. Aggiungere azioni per slot:
       - click → modal dettaglio slot,
       - da modal: “Rimuovi carta”, “Sposta carta”, “Vendi”, “Lista online”, “Apri scan”.
    6. Collegare i pulsanti “Genera QR” e “Scansiona Slot” alle pagine/flow di cui sopra.

- [x] **Vendite fisiche – UI end‑to‑end** (Tab Vendi con canSellPhysically, POST sales, sales page completa)
  - File: `src/app/merchant/vault/sales/page.tsx` + tab “Vendi” in `merchant/vault/scan/page.tsx`
  - Obiettivo: registrare vendite fisiche con prezzo finale, eventuale foto, split generato e visibile, lista vendite e stats minime.
  - TODO (step‑by‑step):
    1. Nella scan page:
       - completare la tab “Vendi” usando `canSellPhysically` aggiornato,
       - flusso: scan slot → mostra carta → form (prezzo, foto opzionale, note) → submit all’API sales.
    2. Verificare/creare le API:
       - `POST /api/vault/merchant/sales` per registrare la vendita e generare `VaultSplit`,
       - `GET /api/vault/merchant/sales` per listare vendite.
    3. Implementare `/merchant/vault/sales`:
       - lista vendite con filtri per data/game/prezzo,
       - colonna con split (70/20/10) calcolato dal backend,
       - stats minime: vendite oggi/settimana/mese, totale ricavi.
    4. Aggiungere test (anche manuali) per:
       - vendita singola → item passa a `SOLD` e slot torna `FREE`,
       - split corretti in DB.

- [ ] **Vendite online – listing e fulfillment**
  - File: tab “Lista Online” / “Fulfillment” in `merchant/vault/scan/page.tsx` + `/merchant/vault/orders`
  - Obiettivo: listare item online, creare ordini, gestire pick/ship/status usando le API già presenti (`orders`, `fulfill`, `pay`).
  - TODO (step‑by‑step):
    1. Tab “Lista Online”:
       - scan slot → carica item,
       - form per prezzo online, condizioni spedizione, note,
       - call a `POST /api/vault/merchant/items/[id]/list-online`.
    2. Homepage/marketplace:
       - assicurati che i listing generati da Vault compaiano correttamente tra i listings normali,
       - etichetta visiva (“In teca”, “Vault”).
    3. Tab “Fulfillment”:
       - mostra lista ordini pendenti per il negozio (`GET /api/vault/merchant/orders`),
       - per ogni ordine: info buyer, indirizzo, carta, stato,
       - azioni: “Prepara spedizione” → “Spedito” (tracking, ecc.).
    4. `/merchant/vault/orders`:
       - vista completa degli ordini con filtri per status,
       - collegamento ai dettagli e allo storico fulfillment.
    5. Testare end‑to‑end:
       - listing online da slot Vault → ordine buyer → fulfillment → split ELIGIBLE dopo il flusso di consegna.

- [x] **Tab “Sposta” realmente funzionante**
  - File: `src/app/merchant/vault/scan/page.tsx`
  - Obiettivo: flusso 2 step (slot origine → slot destinazione) con validazioni e audit log.
  - TODO (step‑by‑step):
    1. Nella tab “Sposta”, separare chiaramente:
       - step 1: scan slot origine (verifica che sia OCCUPIED),
       - step 2: scan slot destinazione (verifica che sia FREE).
    2. Collegare lo step 2 all’API `POST /api/vault/merchant/items/[id]/move-slot`:
       - passando itemId corrente, slot origine, slot destinazione.
    3. Aggiornare lo stato locale (senza full reload) dopo spostamento riuscito.
    4. Garantire che ogni spostamento crei un audit log (già previsto nelle API, ma da verificare).

- [x] **Pagina pubblica scan QR** (link Acquista Online a listing, listingId da API)
  - File: `src/app/scan/[token]/page.tsx`
  - Obiettivo: consumare `GET /api/vault/public/scan/[token]` e mostrare info carta/negozio + opzione “Acquista online” se applicabile.
  - TODO (step‑by‑step):
    1. Creare la pagina client (o server‑component con fetch lato server) che chiama `GET /api/vault/public/scan/[token]`.
    2. Gestire casi:
       - token valido con carta assegnata,
       - token valido con slot vuoto,
       - token non valido/expired.
    3. UI:
       - foto carta, nome, game, set, condizione, prezzo,
       - info negozio (nome, indirizzo, link mappa),
       - se carta è listata online → bottone “Acquista online” che porta al listing/checkout.
    4. Ottimizzare per mobile, visto che l’uso principale è da smartphone in negozio.

### 1.4 Deployment & infra

- [ ] **Migrazioni DB produzione**
  - `npx prisma migrate deploy` contro DB prod, con backup prima e verifica tabelle/relazioni dopo (come in `PROGETTO.md`).

- [ ] **Seed dati base**
  - Piani subscription, topics community di default, config base necessaria.

- [ ] **Environment variables produzione**
  - `DATABASE_URL`, Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), Cloudinary, Shippo/Sendcloud, Stripe (anche solo test key pronte).

- [ ] **Build & lint su config di produzione**
  - `npm run build` dopo tutti i fix.
  - `npm run lint` + type‑check TS senza errori.

### 1.5 Sicurezza residua

- [ ] **Test manuale open redirect OAuth callback**
  - File: `src/app/auth/callback/route.ts`
  - Test: `?next=https://evil.com` e varianti; deve sempre riportare ad una route interna safe (es. `/dashboard`).

- [ ] **Login + callback end‑to‑end**
  - Cross‑check con checkbox aperti in `SECURITY_REMEDIATION_TASKS.md` (Task 3/8).

- [x] **Allineare nuove API a `handleApiError`**
  - `src/app/api/admin/contacts/[id]/route.ts` aggiornato con handleApiError.

---

## 2. High‑priority (entro 1–2 settimane dal lancio)

### 2.1 Decisione SafeVault: GA vs Beta

- Opzione A – **SafeVault GA subito**:
  - Richiede: tutti i bug logici + flow core di §1.2/1.3 chiusi, test di sicurezza/stabilità verdi, UX di base accettabile.
  - Pro: narrativa prodotto coerente (“Vault fisico pronto”).
  - Contro: più tempo prima del lancio, più superficie di bug su soldi/logistica.

- Opzione B – **App GA, SafeVault in Beta / feature flag** (raccomandato):
  - Azioni:
    - Nascondere entrypoint Vault per utenti non whitelisted (feature flag per merchant selezionati).
    - Etichettare chiaramente come “Beta – solo per negozi pilota”.
    - Tenere attive tutte le API ma dietro controlli di autorizzazione stretti + toggle.
  - Pro: puoi lanciare marketplace + SafeTrade core, limitando l’esposizione del sistema più complesso.
  - Contro: roadmap di comunicazione da gestire (“Vault in arrivo / beta chiusa”).

### 2.2 SafeVault – coerenza dati & UX

- [ ] Pending payout e total sales reali (no `0 // TODO`).
- [ ] Filtri statement funzionanti (`merchant/vault/statement/page.tsx` → query string all’API).
- [ ] Error handling visible (banner/empty state) su tutte le pagine Vault, non solo `console.error`.
- [ ] Valori hardcoded (IBAN, percentuali, stats fake) estratti da config/DB e non duplicati nel frontend.

### 2.3 Core prodotto non finanziario

- [ ] Flow SafeTrade check‑in buyer/seller completamente verificato (transazione → QR → verify → completion/cancel).
- [ ] Notifiche coerenti per eventi importanti (proposte, messaggi escrow, eventi Vault se GA/beta).
- [ ] Tornei: risultati/bracket/classifiche implementati oppure chiaramente marcati come “basic” nella UI.

### 2.4 Email transazionali minime

- [ ] Provider email (Resend/SendGrid o similare) configurato.
- [ ] Email minime:
  - conferma registrazione (o conferma che Supabase email bastano),
  - conferma transazione SafeTrade,
  - notifica nuovo messaggio / evento escrow critico.

---

## 3. Post‑GA / nice‑to‑have

Queste sono già mappate in `STATO_PROGETTO_COMPLETO.md` / `PROGETTO.md`, qui solo il riassunto:

- [ ] Pagamenti online completi (Stripe Connect, subscription reali, billing/fatture).
- [ ] Rating & review system + trust score.
- [ ] Chat real‑time completa (UI + notifiche + storico).
- [ ] Search avanzata (set/rarità/anno, autocomplete, filtro geografico).
- [ ] Analytics dashboard (admin/merchant) con grafici e export.
- [ ] Notifiche real‑time consolidate (Supabase Realtime, badge, ecc.).
- [ ] Refactor `merchant/vault/scan/page.tsx` in più tab/componenti.
- [ ] Pulizia `as any` nelle API Vault + indici Prisma suggeriti nel bug report.
- [ ] Performance pass con target load < 2s su homepage/marketplace/dashboard/community.
- [ ] UX/UI polishing (dark mode completo, animazioni extra, mobile tuning).

---

## 4. Cosa significa GA (General Availability) per questo progetto

**GA (General Availability)** = una feature o l’intera app sono considerate:

- Stabili (no bug noti “grossi” su soldi, auth, dati).
- Supportate (se un utente rompe qualcosa, ti senti in dovere di fixarlo subito).
- Default per tutti (nessun flag nascosto, niente “use at your own risk”).
- Coperte da test minimi (unit/integration/security) e da un setup prod decente (DB, backup, env, logging).

**Non‑GA / Beta / Preview** = il contrario:

- Accesso limitato (inviti, whitelisting, feature flag).
- Aspettativa dichiarata di bug e cambiamenti breaking.
- Nessuna promessa implicita di affidabilità: è un laboratorio controllato.

### Raccomandazione pratica

- Tratta **l’app (marketplace + SafeTrade base + community + dashboard)** come candidata GA, a patto che:
  - i test di sicurezza/stabilità siano verdi,
  - il deploy prod/DB/env sia fatto correttamente.
- Tratta **SafeVault** come **Beta limitata** al lancio:
  - chiudi prima i bug logici critici e una parte del flow core,
  - tieni il feature flag per pochi negozi reali con cui puoi iterare veloce,
  - promuovi pubblicamente “Vault in beta / early access” invece che “è pronto per tutti”.

Questo ti permette di:

- Non bloccare tutto il progetto sulle parti più complesse (Vault).
- Limitare la superficie di rischio legata a denaro e logistica fisica.
- Fare GA del valore principale (SafeTrade P2P + esperienza marketplace) senza over‑promettere sulla parte “teche fisiche”, che richiede comunque un po’ di validazione sul campo.

