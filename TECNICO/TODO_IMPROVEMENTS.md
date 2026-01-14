# TODO - Miglioramenti SafeTrade

## Analisi e Piano di Implementazione

### 1. NOTIFICHE ADMIN - Richiesta Teca Vault
**Problema**: Quando un merchant richiede una teca, l'admin non riceve notifiche.

**File da modificare**: 
- `src/app/api/vault/requests/route.ts` (POST handler)
- Verificare `src/lib/vault/notifications.ts` o creare notifica admin

**Implementazione**:
- Dopo la creazione di `VaultCaseRequest`, creare una `AdminNotification` con:
  - `type: 'VAULT_CASE_REQUEST'` (o tipo appropriato)
  - `referenceType: 'VAULT_CASE_REQUEST'`
  - `referenceId: vaultRequest.id`
  - `targetRoles: ['ADMIN', 'HUB_STAFF']`
  - `priority: 'NORMAL'` o `'HIGH'`

---

### 2. FIX COMMUNITY - Thread con Internal Error
**Problema**: Aprendo un thread nella community si ottiene "internal error".

**File da verificare**:
- `src/app/community/**/page.tsx` (pagina thread)
- `src/app/api/community/**/route.ts` (API routes)
- Verificare autenticazione, query Prisma, error handling

**Implementazione**:
- Verificare endpoint API per i thread
- Controllare errori Prisma (relazioni mancanti, query errate)
- Aggiungere try-catch appropriati
- Verificare che i dati siano caricati correttamente

---

### 3. VETRINA - Carte Reali invece di Placeholder
**Problema**: La vetrina mostra placeholder invece di carte reali.

**File da modificare**:
- Componente che mostra la vetrina (probabilmente `FeaturedSection.tsx` o simile)
- API endpoint che fornisce i dati

**Implementazione**:
- Verificare endpoint API che fornisce featured listings
- Assicurarsi che restituisca dati reali dal database
- Se non esiste, creare endpoint `/api/listings/featured`
- Filtrare per listings premium/featured con immagini reali

---

### 4. TORNEI HOMEPAGE - Dati Reali
**Problema**: Homepage mostra placeholder invece di tornei reali.

**File da modificare**:
- Componente tornei homepage (probabilmente `TournamentCard.tsx` o sezione tornei)
- API endpoint tornei

**Implementazione**:
- Verificare endpoint `/api/tournaments` (GET)
- Assicurarsi che restituisca tornei reali
- Mostrare solo tornei futuri/attivi
- Limitare a N tornei (es. 3-6) per homepage

---

### 5. FILTRO TORNEI PER DISTANZA
**Problema**: I tornei devono essere filtrati per distanza basata su città utente e preferenza onboarding.

**File da modificare**:
- `src/app/onboarding/page.tsx` - Aggiungere campo città con dropdown province
- Schema Prisma `User` - Verificare che `city` e `province` siano salvati
- `src/app/api/tournaments/route.ts` - Aggiungere filtro per distanza
- Homepage tornei - Passare filtro distanza

**Implementazione**:
- **Onboarding**: 
  - Aggiungere dropdown autocompilante con tutte le province italiane
  - Salvare `city` e `province` nel profilo utente
  - La distanza è già salvata in `settings.distance` durante onboarding
- **API Tornei**:
  - Calcolare distanza tra città utente e città torneo
  - Filtrare tornei entro la distanza massima scelta
  - Usare formula Haversine o API geocoding
- **Homepage**:
  - Passare `city`, `province`, `distance` all'API tornei
  - Mostrare solo tornei filtrati

**Note**: Serve lista completa province italiane (107 province).

---

### 6. MARKETPLACE - Animazioni e Accenti Arancioni
**Problema**: Marketplace ha bisogno di animazioni (palle arancioni) e accenti arancioni.

**File da modificare**:
- `src/app/(marketplace)/listings/page.tsx`
- Creare componente animazioni (palle arancioni interattive)

**Implementazione**:
- Creare componente `AnimatedOrbs.tsx` con:
  - Palle arancioni animate (GSAP o CSS animations)
  - Interattive (hover, click effects)
  - Posizionate strategicamente nella pagina
- Aggiungere accenti arancioni:
  - Border, shadows, highlights
  - Gradient backgrounds
  - Hover effects

---

### 7. AGGIUNGERE SEZIONE ONE PIECE
**Problema**: Aggiungere One Piece come categoria dopo Pokemon.

**File da modificare**:
- Componente categorie homepage
- Verificare che `CardGame.ONEPIECE` esista nello schema Prisma

**Implementazione**:
- Verificare enum `CardGame` in Prisma (dovrebbe già esserci `ONEPIECE`)
- Aggiungere card One Piece nella sezione "Esplora Categorie"
- Posizionare dopo Pokemon, prima di Magic/Yu-Gi-Oh

---

### 8. ICONE CATEGORIE - Migliorare Magic e Yu-Gi-Oh
**Problema**: Icone Magic e Yu-Gi-Oh non sono belle come Pokemon.

**File da modificare**:
- Componente categorie homepage
- Creare/sostituire icone SVG o immagini

**Implementazione**:
- Creare icone SVG personalizzate per:
  - Magic: The Gathering (simbolo mana o carta stilizzata)
  - Yu-Gi-Oh! (simbolo Millennium Puzzle o carta stilizzata)
  - One Piece (Jolly Roger o simbolo stilizzato)
- Mantenere stile simile a Pokemon (pulito, moderno, riconoscibile)
- Usare colori brand appropriati

---

### 9. PAGINA LISTINGS - Aggiungere Dettagli e Animazioni
**Problema**: `/listings?game=pokemon` è troppo semplice, serve più dettagli.

**File da modificare**:
- `src/app/(marketplace)/listings/page.tsx`

**Implementazione**:
- Aggiungere palle arancioni animate (come in Marketplace)
- Aggiungere dissolvenze (fade-in) per le card
- Migliorare layout con più dettagli visivi
- Aggiungere filtri avanzati (prezzo, condizione, etc.)

---

### 10. RIMUOVERE POKEMON DA "ESPLORA CATEGORIE"
**Problema**: Nella sezione "Esplora Categorie" non deve esserci il gioco stesso se si è nella pagina di quel gioco.

**File da modificare**:
- Componente categorie (probabilmente in homepage o listings page)
- Logica di filtraggio categorie

**Implementazione**:
- Passare `currentGame` come prop al componente categorie
- Filtrare categorie per escludere `currentGame`
- Se siamo in `/listings?game=pokemon`, non mostrare Pokemon in "Esplora Categorie"

---

### 11. FILTRO PER GIOCO - Pagine Dedicata
**Problema**: Cliccando su un gioco (es. Magic), deve portare alla pagina di quel gioco senza mostrarlo in "Esplora Categorie".

**File da verificare**:
- Routing per `/listings?game=magic`, `/listings?game=yugioh`, `/listings?game=onepiece`
- Componente categorie deve ricevere `game` filter

**Implementazione**:
- Verificare che il routing funzioni per tutti i giochi
- Assicurarsi che il componente categorie escluda il gioco corrente
- Testare navigazione tra giochi

---

### 12. RIORDINARE SEZIONI - "In Vetrina" sotto "Tutte le Carte"
**Problema**: La sezione "In Vetrina" deve essere spostata sotto "Tutte le Carte".

**File da modificare**:
- Homepage o pagina listings
- Componente che renderizza le sezioni

**Implementazione**:
- Identificare componente che renderizza "Tutte le Carte" e "In Vetrina"
- Riordinare l'ordine di rendering
- Verificare che il layout sia corretto

---

## PRIORITÀ DI IMPLEMENTAZIONE

### Fase 1 - Fix Critici (Prima di tutto)
1. ✅ Notifiche Admin per Richiesta Teca
2. ✅ Fix Community Thread Error

### Fase 2 - Dati Reali (Fondamentale)
3. ✅ Vetrina con Carte Reali
4. ✅ Tornei Homepage con Dati Reali

### Fase 3 - Filtri e UX (Importante)
5. ✅ Filtro Tornei per Distanza
6. ✅ Marketplace Animazioni
7. ✅ Pagina Listings Migliorata

### Fase 4 - Design e Categorie (Miglioramenti)
8. ✅ Aggiungere One Piece
9. ✅ Migliorare Icone Categorie
10. ✅ Rimuovere Pokemon da "Esplora Categorie" quando in pagina Pokemon
11. ✅ Filtro per Gioco funzionante
12. ✅ Riordinare Sezioni

---

## NOTE TECNICHE

### Province Italiane
Creare file `src/lib/data/italian-provinces.ts` con array di tutte le 107 province italiane per il dropdown.

### Calcolo Distanza
Usare formula Haversine o libreria come `geolib` per calcolare distanza tra coordinate città.

### Animazioni
Usare GSAP (già presente) o CSS animations per palle arancioni e dissolvenze.

### Icone
Creare componenti SVG React per le icone categorie, mantenendo stile consistente.

