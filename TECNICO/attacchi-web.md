# Audit Sicurezza — 3SafeTrade

> Mappatura reale dei vettori di attacco sul codebase attuale.
> Ogni voce ha: file coinvolti, rischio concreto, e checklist di fix.
> Priorità: 🔴 Critico | 🟠 Alto | 🟡 Medio | 🟢 Basso

---

## 🔴 1. MIDDLEWARE VUOTO — Nessuna protezione a livello di routing

**File:** `src/middleware.ts`

```ts
// Attualmente:
export function middleware(request: NextRequest) {
  return NextResponse.next() // PASS-THROUGH TOTALE
}
export const config = { matcher: ['/dashboard/:path*'] }
```

**Problema:**
- Il middleware matcha SOLO `/dashboard/*` e non fa nulla (pass-through)
- Le rotte `/admin/*`, `/merchant/*`, `/vault/*`, `/api/*` NON passano per nessun middleware
- Nessun header di sicurezza viene aggiunto alle risposte
- Nessun controllo CSRF a livello middleware
- Nessun refresh automatico della sessione Supabase

**Rischio:**
- Chiunque può chiamare endpoint admin/merchant senza che il middleware intercetti
- (la protezione c'è dentro ogni route handler, ma un middleware è la prima linea di difesa)

**Fix necessari:**
- [ ] Espandere il matcher a tutte le rotte protette (`/admin/:path*`, `/merchant/:path*`, `/vault/:path*`, `/api/:path*`)
- [ ] Aggiungere controllo sessione Supabase nel middleware (refresh token)
- [ ] Aggiungere security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- [ ] Redirect automatico a `/login` se sessione non valida su rotte protette
- [ ] Blocco diretto di rotte admin per utenti non-admin

---

## 🔴 2. NESSUN SECURITY HEADER — CSP, HSTS, X-Frame-Options assenti

**File:** `next.config.js`, `src/middleware.ts`

**Problema:**
- Zero header di sicurezza in TUTTE le risposte HTTP
- Nessuna Content-Security-Policy → XSS più facile da sfruttare
- Nessun X-Frame-Options → Clickjacking possibile (embedding in iframe malevolo)
- Nessun HSTS → Downgrade HTTPS→HTTP possibile
- Nessun X-Content-Type-Options → MIME sniffing attacks
- Nessun Referrer-Policy → Leak di URL sensibili nei referrer

**Fix necessari:**
- [ ] Aggiungere in middleware (o `next.config.js` headers):
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  ```
- [ ] CSP report-uri per monitorare violazioni in produzione

---

## 🔴 3. CSRF — Protezione insufficiente

**Stato attuale:** Nessun token CSRF. Si affida solo a `SameSite` cookie (Lax di default).

**Problema:**
- `SameSite=Lax` NON protegge da:
  - Top-level navigation POST (form submit cross-site)
  - Attacchi da sottodomini compromessi
- Tutte le 150+ API routes che fanno mutazioni (POST/PATCH/DELETE) sono vulnerabili se un attaccante riesce a far submitare un form dalla sessione della vittima

**Endpoint più critici senza CSRF:**
- `POST /api/escrow/payments/[id]/release` — rilascio fondi
- `POST /api/escrow/payments/[id]/refund` — rimborso
- `POST /api/admin/pending-releases/[id]/confirm-approval` — approvazione rilascio
- `PATCH /api/admin/users/[id]` — modifica ruolo utente
- `POST /api/vault/deposits` — creazione deposito
- `DELETE /api/listings/[id]` — cancellazione listing

**Fix necessari:**
- [ ] Implementare CSRF token (double-submit cookie pattern o sync token)
- [ ] Validare `Origin` / `Referer` header su tutte le mutazioni
- [ ] Impostare `SameSite=Strict` sui cookie di sessione (dove possibile)

---

## 🟠 4. RATE LIMITING IN-MEMORY — Non persiste, bypassabile

**File:** `src/lib/rate-limit.ts`

**Problema:**
- Lo store è un `Map()` in memoria → si resetta ad ogni restart/deploy
- Su Vercel (serverless): ogni function invocation può avere una Map diversa → rate limit praticamente inutile
- Rate limit basato solo su `userId`, mai su IP → utenti non autenticati non hanno rate limit
- Nessun rate limit sul login → brute-force possibile
- Nessun rate limit sulla registrazione → spam account

**Endpoint SENZA rate limit:**
- `POST /api/auth/login` ← CRITICO: brute-force password
- `POST /api/auth/signup` ← spam account
- `POST /api/auth/resend-verification` ← email bombing
- `GET /api/listings` ← scraping massivo
- `GET /api/admin/*` ← enumerazione dati admin
- `POST /api/disputes` ← spam dispute
- `POST /api/community/posts` ← spam post

**Fix necessari:**
- [ ] Migrare rate limiting su Redis (Upstash Redis è gratis per bassi volumi e si integra perfettamente con Vercel)
- [ ] Aggiungere rate limit per IP (non solo userId)
- [ ] Rate limit su login: max 5 tentativi / 15 min per IP
- [ ] Rate limit su signup: max 3 / ora per IP
- [ ] Rate limit su resend-verification: max 3 / ora per email
- [ ] Rate limit globale su tutti gli endpoint GET pubblici

---

## 🟠 5. SQL INJECTION — Protezione Prisma ma attenzione a raw queries

**File:** Tutti i route handler in `src/app/api/`

**Stato attuale:**
- Prisma usa prepared statements di default → SQLi classica molto improbabile
- **MA**: se ci sono `prisma.$queryRaw` o `prisma.$executeRaw` con interpolazione stringa, la protezione salta

**Cose da verificare:**
- [ ] Cercare tutti gli usi di `$queryRaw`, `$executeRaw`, `$queryRawUnsafe`, `$executeRawUnsafe`
- [ ] Verificare che usino template literals tagged (es. `prisma.$queryRaw\`SELECT...${Prisma.sql}...\``) e NON concatenazione stringa
- [ ] Verificare che i filtri in `where` non passino input utente non validato in campi che supportano oggetti complessi Prisma (es. `contains`, `mode`)
- [ ] Full-text search: controllare come vengono passati i termini di ricerca

---

## 🟠 6. XSS — React escapa ma ci sono punti deboli

**Contesto:**
- React escapa di default → XSS reflected/stored difficile nei componenti normali
- **MA** ci sono rischi concreti in:

**Punti vulnerabili da controllare:**
- [ ] Uso di `dangerouslySetInnerHTML` in qualsiasi componente
- [ ] Community posts: se accettano HTML/Markdown, verificare che DOMPurify sia usato OVUNQUE in rendering
- [ ] Descrizioni listing: controllare se vengono renderizzate come HTML
- [ ] Messaggi chat/escrow: verificare sanitizzazione
- [ ] URL generati da input utente (es. link a shop, link esterni in bio)
- [ ] Attributi `href` con `javascript:` protocol
- [ ] Immagini con URL controllabili dall'utente (onerror handler injection)
- [ ] CSP assente → se un XSS passa, può fare tutto (caricare script esterni, esfiltrare dati)

**Fix necessari:**
- [ ] Audit completo di `dangerouslySetInnerHTML` e `v-html`
- [ ] CSP restrittiva (punto 2)
- [ ] Sanitizzazione server-side di tutti i campi testo libero prima del salvataggio
- [ ] Validazione URL (whitelist protocolli: solo `http:` e `https:`)

---

## 🟠 7. BROKEN ACCESS CONTROL / IDOR

**Contesto:**
- La maggior parte degli endpoint verifica `userId === user.id` per ownership
- **MA** serve un audit completo, soprattutto su:

**Endpoint da verificare:**
- [ ] `GET /api/transactions/[id]` — un utente può leggere transazioni di altri?
- [ ] `GET /api/conversations/[id]/messages` — può leggere chat di altri?
- [ ] `GET /api/escrow/sessions/[sessionId]` — può accedere a sessioni escrow non sue?
- [ ] `GET /api/vault/deposits/[id]` — può vedere depositi vault di altri?
- [ ] `PATCH /api/listings/[id]` — verifica ownership prima di modificare
- [ ] `GET /api/disputes/[id]` — accesso limitato alle parti coinvolte?
- [ ] `GET /api/notifications` — filtra per userId?
- [ ] Tutti gli endpoint admin: verificano `role === 'ADMIN'` e non solo autenticazione?
- [ ] `requireRole()` in `auth.ts` accetta solo `USER | MERCHANT | ADMIN` — manca `MODERATOR` e `HUB_STAFF` come parametri validi. Verificare che non bypassino controlli.

**Fix necessari:**
- [ ] Audit sistematico di ogni endpoint con ID nel path
- [ ] Test: creare 2 utenti e provare accesso cross-account su ogni risorsa
- [ ] Aggiungere `MODERATOR` e `HUB_STAFF` a `requireRole()`

---

## 🟠 8. FILE UPLOAD — Validazione debole

**File:** `src/app/api/upload/route.ts`

**Problemi trovati:**
- Validazione basata SOLO su `file.type.startsWith('image/')` → il MIME type viene dal client, è falsificabile
- Nessun limite di dimensione file esplicito nell'endpoint (solo `bodySizeLimit: '2mb'` globale in next.config)
- Nessun rate limit sull'upload → un attaccante può saturare lo storage
- Il nome file include `Math.random().toString(36)` che non è crittograficamente sicuro
- Nessun controllo antivirus/malware sul contenuto

**Fix necessari:**
- [ ] Validare il MIME type reale leggendo i magic bytes del file (non fidarsi dell'header client)
- [ ] Aggiungere whitelist estensioni (solo `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`)
- [ ] Rate limit: max 20 upload/ora per utente
- [ ] Limite dimensione esplicito per-file (es. 5MB)
- [ ] Usare `crypto.randomUUID()` per nomi file
- [ ] Verificare che Sharp non processi file malevoli (SVG con script, image bombs)

---

## 🟠 9. SESSION MANAGEMENT — Token in localStorage

**File:** `src/lib/supabase/sync-session.ts`

**Problema:**
- `syncSessionFromCookies()` copia access_token e refresh_token in `localStorage` via Supabase client
- `localStorage` è accessibile da QUALSIASI JavaScript sulla pagina
- Se un XSS passa (punto 6), l'attaccante ruba entrambi i token → sessione completamente compromessa
- Il refresh_token ha vita lunga → l'attaccante mantiene accesso anche dopo che l'utente cambia password

**Fix necessari:**
- [ ] Valutare se eliminare la sync verso localStorage (usare solo cookie httpOnly)
- [ ] Se localStorage è necessario per il client Supabase, mitigare con CSP stretta
- [ ] Implementare rotazione refresh_token dopo ogni uso
- [ ] Invalidare TUTTI i refresh_token quando l'utente cambia password
- [ ] Aggiungere device fingerprinting / IP binding al token

---

## 🟠 10. AUTENTICAZIONE — Nessuna protezione brute-force su login

**Endpoint:** `POST /api/auth/login`

**Problema:**
- Zero rate limiting sul login
- Nessun lockout dopo N tentativi falliti
- Nessun CAPTCHA
- Nessun logging specifico dei tentativi di login falliti (il `SecurityAuditLog` monitora solo accessi a risorse, non login)
- Password policy: solo `min(8)` via Zod — nessun requisito di complessità

**Fix necessari:**
- [ ] Rate limit: max 5 tentativi / 15 min per IP + per email
- [ ] Lockout temporaneo: 30 min dopo 10 tentativi falliti
- [ ] CAPTCHA (Turnstile di Cloudflare o reCAPTCHA) dopo 3 tentativi falliti
- [ ] Log ogni tentativo di login fallito nel SecurityAuditLog
- [ ] Alert admin se > 20 tentativi falliti in 5 min dallo stesso IP
- [ ] Password policy: minimo 8 char + 1 maiuscola + 1 numero + 1 speciale (o meglio: zxcvbn score >= 3)

---

## 🟡 11. ENUMERAZIONE UTENTI

**Endpoint:** `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/resend-verification`

**Problema:**
- Se il messaggio di errore è diverso tra "email non trovata" e "password sbagliata", un attaccante può enumerare gli utenti registrati
- Stessa cosa per "email già registrata" nel signup

**Fix necessari:**
- [ ] Messaggio di errore login generico: "Credenziali non valide" (sia per email inesistente che password sbagliata)
- [ ] Signup: non rivelare se l'email esiste già (dire "Ti abbiamo inviato un'email di verifica" in entrambi i casi)
- [ ] Resend verification: risposta generica indipendentemente dall'esistenza dell'email
- [ ] Timing attack: assicurarsi che il tempo di risposta sia costante (hash password anche se utente non esiste)

---

## 🟡 12. EXPOSIZIONE INFORMAZIONI DI DEBUG

**File:** `src/lib/auth.ts`

**Problema:**
- `console.log` con informazioni sensibili in produzione:
  ```ts
  console.log('[getCurrentUser] getUser result:', { hasUser, userId, hasError, errorMessage })
  console.log('[getCurrentUser] Fetching user from Prisma...')
  ```
- Errori API che espongono stack trace o messaggi interni:
  ```ts
  return NextResponse.json({ error: error.message }, { status: 500 })
  ```
  `error.message` può contenere dettagli del database, query Prisma, ecc.

**Fix necessari:**
- [ ] Rimuovere TUTTI i `console.log` con dati sensibili in `auth.ts` e ovunque
- [ ] In produzione: restituire solo messaggi generici ("Internal server error"), loggare dettagli solo server-side
- [ ] Usare un logger strutturato (es. Pino) con livelli (debug/info/warn/error)
- [ ] Mai esporre `error.message` di catch generico nelle risposte API

---

## 🟡 13. OPEN REDIRECT

**Contesto:**
- Se qualche endpoint o pagina accetta un parametro `redirect`, `returnTo`, `callbackUrl` e fa redirect senza validare

**Cose da verificare:**
- [ ] Cercare tutti gli usi di `redirect()`, `router.push()`, `window.location` con parametri dinamici
- [ ] Verificare che le URL di redirect siano validate contro una whitelist di path interni
- [ ] Mai permettere redirect a URL esterne controllate dall'utente

---

## 🟡 14. API ADMIN — CRON ENDPOINT ESPOSTI

**Endpoint:**
- `POST /api/admin/cron/create-pending-releases`
- `POST /api/admin/cron/check-auto-release`
- `POST /api/admin/cron/notify-pending-timeout`

**Problema:**
- Se questi endpoint non verificano un secret/token cron, chiunque può trigggerare operazioni finanziarie (rilascio fondi automatico, creazione pending releases)

**Fix necessari:**
- [ ] Verificare che ogni cron endpoint controlli un `CRON_SECRET` header
- [ ] Usare il pattern Vercel Cron con `CRON_SECRET` in env var
- [ ] Rate limit aggressivo su questi endpoint
- [ ] Log ogni invocazione

---

## 🟡 15. DENIAL OF SERVICE (DoS) LOGICO

**Contesto:**
- Endpoint che fanno operazioni pesanti senza limiti

**Vettori:**
- [ ] `GET /api/listings` senza limit → query che restituisce migliaia di risultati
- [ ] Upload massivo: nessun rate limit → saturazione storage Supabase
- [ ] `POST /api/community/posts` senza rate limit → spam
- [ ] `POST /api/conversations` — 10/ora ma crea record DB + notifiche
- [ ] Richieste con payload JSON enormi (body size limit solo su Server Actions, non su API routes standard)

**Fix necessari:**
- [ ] `limit` e `skip` obbligatori e con massimi su tutti i GET che restituiscono liste
- [ ] Body size limit esplicito su API routes (middleware)
- [ ] Rate limit su upload, post, conversazioni
- [ ] Timeout su operazioni lunghe

---

## 🟡 16. DEPENDENCY VULNERABILITIES

**Problema:**
- Le dipendenze npm possono avere vulnerabilità note (CVE)
- Nessun audit automatico visibile nella CI/CD

**Fix necessari:**
- [ ] Eseguire `npm audit` e fixare vulnerabilità critiche/alte
- [ ] Aggiungere `npm audit` nella CI pipeline
- [ ] Valutare Snyk o Dependabot per monitoring continuo
- [ ] Aggiornare dipendenze regolarmente

---

## 🟡 17. ERROR HANDLING INCONSISTENTE

**Problema:**
- Molti endpoint hanno `catch(error: any)` e restituiscono `error.message` direttamente
- In caso di errore Prisma, il messaggio può contenere: nome tabella, colonne, constraint, dettagli query

**Fix necessari:**
- [ ] Creare un error handler centralizzato che:
  - Logga il full error server-side
  - Restituisce messaggio generico al client
  - Restituisce status code appropriato
- [ ] Mappare errori Prisma comuni (unique constraint, not found, ecc.) a messaggi user-friendly
- [ ] Mai esporre `error.message` raw nelle risposte JSON

---

## 🟢 18. LOGGING E MONITORING

**Stato attuale:**
- `SecurityAuditLog` per accessi non autorizzati ← buono
- `FinancialAuditLog` per operazioni finanziarie ← buono
- Ma: molti endpoint non loggano nulla quando falliscono per ragioni di sicurezza

**Fix necessari:**
- [ ] Loggare OGNI tentativo di login fallito
- [ ] Loggare OGNI tentativo di accesso a risorsa non propria (IDOR)
- [ ] Loggare OGNI rate limit hit
- [ ] Dashboard admin per visualizzare i log in tempo reale
- [ ] Alert via email/webhook per pattern sospetti

---

## 🟢 19. COOKIE CONFIGURATION

**File:** `src/lib/supabase/server.ts`

**Da verificare:**
- [ ] Cookie di sessione Supabase: ha flag `HttpOnly`? (dipende dalla configurazione `@supabase/ssr`)
- [ ] Flag `Secure` in produzione?
- [ ] `SameSite` impostato a cosa?
- [ ] Scadenza del cookie ragionevole?

**Fix necessari:**
- [ ] Verificare e documentare la configurazione cookie Supabase
- [ ] Forzare `Secure: true` in produzione
- [ ] `SameSite: Lax` minimo, `Strict` dove possibile

---

## 🟢 20. SSRF (Server-Side Request Forgery)

**Contesto:**
- Se il sistema fa richieste HTTP verso URL fornite dall'utente (es. webhook, preview link)
- Integrazioni: Shippo, Sendcloud → queste usano API key server-side, se un attaccante riesce a controllare la URL chiamata può accedere a servizi interni

**Fix necessari:**
- [ ] Verificare se ci sono endpoint che accettano URL dall'utente e fanno fetch server-side
- [ ] Se sì: validare URL, bloccare IP privati/localhost, whitelist domini

---

## Riepilogo priorità

| # | Vulnerabilità | Priorità | Effort |
|---|---------------|----------|--------|
| 1 | Middleware vuoto | 🔴 Critico | Medio |
| 2 | Security headers assenti | 🔴 Critico | Basso |
| 3 | CSRF assente | 🔴 Critico | Medio |
| 4 | Rate limit in-memory | 🟠 Alto | Medio |
| 5 | SQL Injection (raw queries) | 🟠 Alto | Basso (audit) |
| 6 | XSS (dangerouslySetInnerHTML, CSP) | 🟠 Alto | Medio |
| 7 | IDOR / Broken Access Control | 🟠 Alto | Alto |
| 8 | File upload debole | 🟠 Alto | Basso |
| 9 | Token in localStorage | 🟠 Alto | Medio |
| 10 | Brute-force login | 🟠 Alto | Basso |
| 11 | Enumerazione utenti | 🟡 Medio | Basso |
| 12 | Debug info leak | 🟡 Medio | Basso |
| 13 | Open redirect | 🟡 Medio | Basso (audit) |
| 14 | Cron endpoint esposti | 🟡 Medio | Basso |
| 15 | DoS logico | 🟡 Medio | Medio |
| 16 | Dependency vulnerabilities | 🟡 Medio | Basso |
| 17 | Error handling | 🟡 Medio | Medio |
| 18 | Logging incompleto | 🟢 Basso | Medio |
| 19 | Cookie config | 🟢 Basso | Basso |
| 20 | SSRF | 🟢 Basso | Basso (audit) |

---

## Piano di lavoro consigliato

**Fase 1 — Quick wins (1-2 giorni):**
1. Security headers nel middleware
2. Espandere middleware matcher
3. Rate limit su login/signup (anche in-memory, meglio di niente)
4. Rimuovere console.log sensibili
5. Error handler centralizzato

**Fase 2 — Protezioni core (3-5 giorni):**
6. Migrare rate limit su Redis (Upstash)
7. CSRF token implementation
8. File upload hardening
9. Audit completo IDOR su tutti gli endpoint con ID
10. Brute-force protection (lockout + CAPTCHA)

**Fase 3 — Hardening avanzato (5-7 giorni):**
11. CSP restrittiva
12. Audit XSS (dangerouslySetInnerHTML, sanitizzazione)
13. Valutare rimozione localStorage token
14. Cron endpoint protection
15. Audit raw SQL queries
16. Dependency audit + Dependabot

**Fase 4 — Monitoring continuo:**
17. Logging completo
18. Dashboard security admin
19. Alert automatici
20. Penetration test manuale
