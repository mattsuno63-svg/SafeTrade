# Task di remediation – Security Audit 3SafeTrade

Ogni sezione è un task. Segui l’ordine; alla fine di ogni fix metti `[x]` nel checkbox.

---

## Modifiche effettuate (log sessione)

- **Task 6 (completato):** Tutti i `console.log` sensibili (user id, session, token, cookies, PII) sono stati avvolti in `if (process.env.NODE_ENV === 'development')` nei file:
  - `src/app/(auth)/login/page.tsx` – log login/session/redirect
  - `src/app/(auth)/login/actions.ts` – log email/session/cookies
  - `src/app/api/escrow/public/scan/[token]/route.ts` – token e session found
  - `src/lib/shipping/sendcloud.ts` – params, auth, parcel, label
  - `src/app/api/admin/hub/packages/[id]/receive|ship-to-buyer|start-verification/route.ts` – user/role
  - `src/app/api/auth/logout/route.ts` – cookie names
  - `src/app/api/disputes/[id]/route.ts` – user, dispute id, auth check
  - `src/app/api/tournaments/route.ts` – userCity, query params, tornei
  - `src/app/merchant/shop/page.tsx` – user, role, shop data
- In produzione questi log non vengono eseguiti; in development restano disponibili per debug.

---

## Task 1 – Upgrade Next.js (CRITICO)

**Priorità:** 10/10  
**Tempo:** ~5 min + test  
**Problema:** Next 14.0.4 ha vulnerabilità critical/high (authorization bypass middleware, SSRF, cache poisoning, DoS).

**Passi:**
1. Esegui: `npm install next@14.2.35`
2. Esegui: `npm run build` e verifica che non ci siano errori
3. Test rapidi: login, una API protetta, una pagina admin
4. Esegui: `npm audit` e verifica che le critical su `next` siano risolte

- [x] Next aggiornato a 14.2.35
- [ ] Build OK (restano errori prerender/useSearchParams preesistenti, non da questa remediation)
- [x] npm audit senza critical su next (1 high resta: Next 15+ per full fix)

---

## Task 2 – .gitignore completo

**Priorità:** 8/10  
**Tempo:** 1 min  
**Problema:** Mancano `.env.*`, `.env.production`, `credentials.json`, `service-account*.json`.

**File:** `.gitignore`

**Aggiungere dopo la riga `.env` (sezione "local env files"):**
```
.env.*
.env.production
credentials.json
service-account*.json
```

- [x] Modifica applicata

---

## Task 3 – Open redirect in auth callback

**Priorità:** 6/10 (high)  
**Tempo:** 2 min  
**Problema:** Il parametro `next` nell’OAuth callback non è validato → redirect verso URL esterni.

**File:** `src/app/auth/callback/route.ts`

**Comportamento richiesto:**
- Accettare solo path che iniziano con `/` (stesso origin)
- Se `next` è assoluto (es. `https://...`) o non inizia con `/`, usare `/dashboard`

**Implementazione:** Validare `next` prima di usarlo in `NextResponse.redirect(new URL(next, requestUrl.origin))`: se non è un path relativo sicuro, usare `'/dashboard'`.

- [x] Validazione `next` implementata (safeRedirectPath in auth/callback/route.ts)
- [ ] Test manuale: `?next=https://evil.com` non deve portare a evil.com (redirect a /dashboard)

---

## Task 4 – Error leakage – usare handleApiError ovunque

**Priorità:** 6/10  
**Tempo:** ~20 min  
**Problema:** Molte route restituiscono `{ error: error.message }` esponendo dettagli interni.

**Soluzione:** Usare `handleApiError(error, 'RouteName')` da `@/lib/api-error` nei catch e restituire la risposta che produce (non esporre mai `error.message` al client).

**File da aggiornare (cercare `error.message` nelle risposte JSON e sostituire con handleApiError):**

| # | File |
|---|------|
| 1 | `src/app/api/admin/escrow/confirm-payment/route.ts` |
| 2 | `src/app/api/escrow/create-payment-intent/route.ts` |
| 3 | `src/app/api/webhooks/stripe/route.ts` (solo nel catch: 200 senza error.message) |
| 4 | `src/app/api/admin/escrow-agents/route.ts` |
| 5 | `src/app/api/admin/merchant-invoices/route.ts` |
| 6 | `src/app/api/admin/merchant-invoices/[id]/route.ts` |
| 7 | `src/app/api/transactions/route.ts` |
| 8 | `src/app/api/vault/cases/route.ts` |
| 9 | `src/app/api/vault/deposits/[id]/mark-shipped/route.ts` |
| 10 | `src/app/api/vault/deposits/[id]/route.ts` |
| 11 | `src/app/api/vault/deposits/[id]/review/route.ts` |
| 12 | `src/app/api/vault/merchant/items/[id]/move-slot/route.ts` |
| 13 | `src/app/api/vault/payouts/batches/route.ts` |
| 14 | `src/app/api/vault/merchant/assign-item-to-slot/route.ts` |
| 15 | `src/app/api/vault/items/assign/route.ts` |
| 16 | `src/app/api/merchant/verify/scan/route.ts` |
| 17 | `src/app/api/vault/merchant/inventory/route.ts` |
| 18 | `src/app/api/vault/cases/[id]/slots/[slotId]/qr/route.ts` |
| 19 | `src/app/api/vault/deposits/[id]/receive/route.ts` |
| 20 | `src/app/api/vault/payouts/batches/[id]/pay/route.ts` |
| 21 | `src/app/api/vault/orders/[id]/pay/route.ts` |
| 22 | `src/app/api/vault/merchant/items/[id]/list-online/route.ts` |
| 23 | `src/app/api/vault/merchant/orders/[id]/fulfill/route.ts` |
| 24 | `src/app/api/escrow/payments/route.ts` |
| 25 | `src/app/api/transactions/[id]/verified-escrow/generate-label/route.ts` |
| 26 | `src/app/api/escrow/sessions/[sessionId]/verification/route.ts` |
| 27 | `src/app/api/vault/merchant/sales/route.ts` |
| 28 | `src/app/api/escrow/sessions/[sessionId]/extend/route.ts` |
| 29 | `src/app/api/escrow/sessions/[sessionId]/close/route.ts` |
| 30 | `src/app/api/escrow/sessions/[sessionId]/checkin/route.ts` |
| 31 | `src/app/api/vault/merchant/scan-slot/route.ts` |
| 32 | `src/app/api/vault/cases/[id]/route.ts` |
| 33 | `src/app/api/vault/cases/[id]/qr-batch/route.ts` |
| 34 | `src/app/api/merchant/verify/[qrCode]/route.ts` |
| 35 | `src/app/api/escrow/sessions/[sessionId]/qr/route.ts` |
| 36 | `src/app/api/vault/payouts/route.ts` |
| 37 | `src/app/api/listings/featured/route.ts` |
| 38 | `src/app/api/vault/merchant/orders/route.ts` |
| 39 | `src/app/api/vault/merchant/available-items/route.ts` |
| 40 | `src/app/api/user/profile/route.ts` |
| 41 | `src/app/api/community/posts/[id]/route.ts` |
| 42 | `src/app/api/vault/orders/route.ts` |
| 43 | `src/app/api/admin/shops/[id]/authorize-vault-case/route.ts` |
| 44 | `src/app/api/vault/deposits/route.ts` |
| 45 | `src/app/api/admin/cron/create-pending-releases/route.ts` |
| 46 | `src/app/api/vault/requests/route.ts` |
| 47 | `src/app/api/auth/logout/route.ts` |
| 48 | `src/app/api/admin/cron/notify-pending-timeout/route.ts` |
| 49 | `src/lib/escrow/session-utils.ts` |
| 50 | `src/lib/shipping/shippo.ts` |
| 51 | `src/app/(auth)/login/actions.ts` |

**Pattern da sostituire:**  
Da: `return NextResponse.json({ error: error.message || '...' }, { status: 500 })` (e simili)  
A: `return handleApiError(error, 'NomeRoute')` (e in catch: `return handleApiError(e, 'NomeRoute')`).

**Webhook Stripe:** Nel catch non restituire `error.message`; rispondere 200 con `{ received: true }` e loggare l’errore solo server-side.

- [x] Tutti i file sopra aggiornati per usare handleApiError (o risposta generica)
- [x] Webhook Stripe: catch senza error.message in risposta

---

## Task 5 – dangerouslySetInnerHTML (QR)

**Priorità:** 6/10  
**Tempo:** 5 min  
**Problema:** In `QRCodeDisplay.tsx` si usa `dangerouslySetInnerHTML` con `qrData`. Se `qrData` fosse user‑controlled, rischio XSS.

**File:** `src/components/qr/QRCodeDisplay.tsx`

**Opzioni:**
- **A)** Garantire che `qrData` arrivi solo da API/backend (commento in codice + eventuale validazione tipo MIME).  
- **B)** Evitare innerHTML: se è sempre `data:image/svg+xml,...`, usare `<img src={qrData} alt="QR" />` invece di decodificare e iniettare SVG.

**Raccomandazione:** Usare `<img src={qrData} alt="QR Code" />` quando `qrData.startsWith('data:image/')`, così nessun HTML viene interpretato. Mantenere `dangerouslySetInnerHTML` solo se serve davvero SVG inline per styling; in quel caso documentare che `qrData` deve essere solo server‑generated.

- [x] Scelta implementata (img per data:image/*, niente innerHTML)
- [x] Nessun path user‑controlled verso dangerouslySetInnerHTML

---

## Task 6 – Rimuovere / ridurre console.log sensibili

**Priorità:** 5/10  
**Tempo:** ~15 min  
**Problema:** `console.log` con user id, session, token, cookies in vari file (auth, use-user, API).

**File principali:**
- `src/app/api/auth/me/route.ts` – cookies, user
- `src/hooks/use-user.ts` – session, user id, email
- `src/app/(auth)/login/page.tsx` – user, session, token
- `src/app/(auth)/login/actions.ts` – user, session
- `src/app/api/escrow/public/scan/[token]/route.ts` – token, session
- `src/lib/shipping/sendcloud.ts` – auth (già mascherato, ma meglio rimuovere in prod)
- `src/app/api/admin/hub/packages/[id]/receive|ship-to-buyer|start-verification/route.ts` – user/role
- `src/app/api/auth/logout/route.ts` – cookie names
- `src/app/api/disputes/[id]/route.ts` – user
- `src/app/api/tournaments/route.ts` – userCity
- `src/app/merchant/shop/page.tsx` – user, role

**Passi:**
1. Rimuovere i `console.log` che stampano PII/token/session/cookies, oppure
2. Avvolgerli in `if (process.env.NODE_ENV === 'development')` così in produzione non partono.

- [x] Log sensibili in auth/me e use-user condizionati a NODE_ENV=development
- [x] Altri file (login, escrow/scan, sendcloud, hub, logout, disputes, tournaments, merchant/shop) condizionati a NODE_ENV=development

---

## Task 7 – Dipendenze (lodash / preact)

**Priorità:** 7/10  
**Tempo:** 5 min  
**Problema:** `npm audit` segnala lodash (moderate) e preact (high, transitiva).

**Passi:**
1. Esegui: `npm audit fix`
2. Se restano vulnerabilità: `npm audit fix --force` solo se accetti breaking change, altrimenti documenta il rischio e pianifica aggiornamento del pacchetto che dipende da preact/lodash.

- [x] npm audit fix eseguito (lodash/preact risolti)
- [x] 1 high su Next resta (fix con next@15+ breaking)

---

## Task 8 – Verifiche finali

- [x] `npm run build` OK (build completato con successo)
- [x] `npm audit` senza critical
- [ ] Login + callback testati (manuale: testare login e `?next=https://evil.com` → deve andare a /dashboard)
- [x] API con handleApiError (no error.message al client)

---

**Fine task.** Quando tutti i checkbox sono [x], la remediation dell’audit è completa.
