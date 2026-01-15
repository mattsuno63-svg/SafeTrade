# TODO: Miglioramenti Marketplace e SafeTrade

## 📋 Task List Completa

### 1. 🎨 Marketplace - Aggiungere AnimatedOrbs con GSAP
**File**: `src/app/marketplace/page.tsx`
- [ ] Importare `AnimatedOrbs` component
- [ ] Aggiungere `<AnimatedOrbs count={6} />` nel background (come in `listings/page.tsx`)
- [ ] Verificare che le palle arancioni animate funzionino correttamente

**Riferimento**: `src/components/marketplace/AnimatedOrbs.tsx` e `src/app/(marketplace)/listings/page.tsx` (linee 194-198)

---

### 2. 🎯 Categorie - Sostituire Immagini con Icone SVG Custom
**File**: `src/app/marketplace/page.tsx` e `src/app/(marketplace)/listings/page.tsx`

#### 2.1 Pokemon
- [ ] Mantenere icona Pokéball esistente (già implementata in listings/page.tsx)
- [ ] Verificare che sia identica in entrambe le pagine

#### 2.2 One Piece
- [ ] Sostituire immagine con icona SVG "Teschio" (Jolly Roger)
- [ ] Usare SVG già creato in `listings/page.tsx` (linee 254-272)
- [ ] Assicurarsi che dimensioni siano identiche al Pokéball

#### 2.3 Magic: The Gathering
- [ ] Creare nuova icona SVG "M" più simile all'originale Magic logo
- [ ] Il logo Magic originale ha:
  - Lettera "M" stilizzata con fiamme/corona
  - Colori: rosso/nero su sfondo bianco
  - Stile gotico/medievale
- [ ] Sostituire SVG esistente in `listings/page.tsx` (linee 294-320)
- [ ] Assicurarsi che dimensioni siano identiche al Pokéball

#### 2.4 Yu-Gi-Oh!
- [ ] Sostituire immagine con icona SVG "Triangolo" (Millennium Puzzle)
- [ ] Creare SVG triangolo stilizzato (simbolo caratteristico Yu-Gi-Oh!)
- [ ] Assicurarsi che dimensioni siano identiche al Pokéball

**Note**: Le icone devono essere tutte della stessa dimensione (w-10 h-10 o w-12 h-12) per coerenza visiva.

---

### 3. 🃏 Categorie - Aggiungere Carte Demo
**File**: `src/app/marketplace/page.tsx`

Per ogni categoria (Pokemon, Magic, Yu-Gi-Oh!, One Piece):
- [ ] Aggiungere almeno 1 carta demo nella sezione "Featured Listings" o creare sezione dedicata
- [ ] Le carte demo devono essere visibili quando si clicca sulla categoria
- [ ] Usare dati mock o creare listings demo nel database

**Opzioni**:
- Aggiungere sezione "Carte Demo" sotto ogni CategoryCard
- Oppure modificare `FeaturedListingsGrid` per mostrare carte demo per categoria
- Oppure creare component `DemoCardsSection` che mostra 1 carta per categoria

---

### 4. 🏪 SafeTrade Info - Modificare Icona "Network di Negozi"
**File**: `src/app/safetrade/info/page.tsx`

- [ ] Trovare sezione "Network di Negozi" (linea 136-146)
- [ ] Rimuovere icona Material Symbol `storefont` (linea 138)
- [ ] Rimuovere scritta "FONT" se presente
- [ ] Creare nuova icona SVG per "Network di Negozi":
  - Icona che rappresenti una rete di negozi (es. più negozi collegati, mappa con pin, o edifici collegati)
  - Colore verde (mantenere `bg-green-500/20` e `text-green-500`)
  - Dimensioni: `text-2xl` (come le altre icone)

**Riferimento**: Linee 112-146 in `src/app/safetrade/info/page.tsx`

---

### 5. 🎬 SafeTrade Info - Animazione Rettangolo Escrow
**File**: `src/app/safetrade/info/page.tsx`

- [ ] Trovare Card con "Fondi bloccati in Escrow" (linee 150-172)
- [ ] Creare componente `EscrowAnimation` o aggiungere animazione inline
- [ ] Animazione deve mostrare il processo Escrow:
  - Step 1: Fondi depositati (icona lock)
  - Step 2: Verifica in corso (icona check/loading)
  - Step 3: Transazione completata (icona success)
- [ ] Usare GSAP per animazioni fluide
- [ ] **IMPORTANTE**: Non cambiare layout o dimensioni del rettangolo
- [ ] Animazione deve essere discreta e intuitiva

**Idee per animazione**:
- Pulse effect sull'icona lock
- Progress bar che si riempie gradualmente
- Icone che cambiano in sequenza (lock → check → success)
- Colori che cambiano gradualmente (primary → green)

**Riferimento**: Linee 150-172 in `src/app/safetrade/info/page.tsx`

---

### 6. 🗺️ Nuova Pagina "Trova Store Partner"
**File**: `src/app/stores/page.tsx` (nuovo file)

- [ ] Creare nuova pagina `/stores` o `/shops`
- [ ] Pagina deve mostrare tutti i negozi che hanno aderito al progetto SafeTrade
- [ ] Filtri:
  - Per città/provincia
  - Per nome negozio
  - Per rating
- [ ] Layout:
  - Grid di card negozi
  - Ogni card mostra:
    - Logo negozio
    - Nome
    - Città
    - Rating
    - Badge "Partner SafeTrade"
    - Link a pagina negozio (`/shops/[slug]`)
- [ ] API endpoint: `GET /api/shops` (già esistente o da creare)
- [ ] Filtrare solo negozi con `isApproved: true` e `vaultEnabled: true` (o flag simile)

**Riferimento**: 
- `src/app/shops/[slug]/page.tsx` per struttura card negozio
- `src/app/api/shops/route.ts` per API (se esiste)

---

### 7. 🔗 Collegare "Trova Store Partner" alla Nuova Pagina
**File**: `src/app/safetrade/page.tsx`

- [ ] Trovare bottone "Trova Store Partner" (linea 248-251)
- [ ] Cambiare `href` da `/marketplace` a `/stores` (o `/shops`)
- [ ] Verificare che il link funzioni correttamente

**Riferimento**: Linea 248-251 in `src/app/safetrade/page.tsx`

---

### 8. 📍 Registrazione - Aggiungere Campo Provincia
**File**: `src/app/(auth)/signup/page.tsx` e `src/app/onboarding/page.tsx`

#### 8.1 Pagina Signup
- [ ] Aggiungere campo "Provincia" nel form di registrazione
- [ ] Usare dropdown con lista province italiane (già esiste `src/lib/data/italian-provinces.ts`)
- [ ] Salvare provincia nel campo `province` del modello `User`

#### 8.2 Pagina Onboarding
- [ ] Verificare che campo provincia sia già presente (sembra già implementato)
- [ ] Se non presente, aggiungere step per selezionare provincia
- [ ] Assicurarsi che provincia venga salvata nel profilo utente

#### 8.3 API
- [ ] Verificare che `POST /api/auth/signup` salvi il campo `province`
- [ ] Verificare che `PATCH /api/user/profile` supporti aggiornamento `province`

**Riferimento**: 
- `src/lib/data/italian-provinces.ts` per lista province
- `src/app/onboarding/page.tsx` per vedere come è già implementato
- `prisma/schema.prisma` - modello `User` ha già campo `province`

---

### 9. 🎯 Tornei - Usare Provincia per Filtro
**File**: `src/app/api/tournaments/route.ts`

- [ ] Verificare che il filtro per distanza usi già `user.city` (già implementato)
- [ ] Se necessario, aggiungere fallback a `user.province` se `city` non è disponibile
- [ ] Testare che i tornei vengano filtrati correttamente in base alla provincia dell'utente

**Riferimento**: `src/app/api/tournaments/route.ts` (già modificato per usare `city`)

---

## 📝 Note Implementative

### Icone SVG
- Tutte le icone devono essere SVG inline (non immagini)
- Dimensioni uniformi: `w-10 h-10` o `w-12 h-12`
- Colori: usare `currentColor` per adattarsi al tema
- Stile: minimale e riconoscibile

### Animazioni GSAP
- Usare GSAP già caricato (come in `AnimatedOrbs.tsx`)
- Animazioni devono essere performanti (usare `will-change` CSS se necessario)
- Evitare animazioni troppo aggressive o distraenti

### Carte Demo
- Creare almeno 1 listing demo per categoria nel database
- Oppure usare dati mock nel componente
- Le carte devono essere visivamente accattivanti

### Pagina Stores
- Layout responsive (mobile-first)
- Performance: paginazione o lazy loading se molti negozi
- SEO: meta tags appropriati

---

## ✅ Checklist Finale

Prima di considerare completato:
- [ ] Tutte le animazioni funzionano correttamente
- [ ] Tutte le icone sono uniformi e riconoscibili
- [ ] Carte demo sono visibili per ogni categoria
- [ ] Pagina "Trova Store Partner" è funzionale
- [ ] Campo provincia è presente in registrazione
- [ ] Filtro tornei funziona con provincia
- [ ] Test responsive su mobile/tablet/desktop
- [ ] Nessun errore in console
- [ ] Build passa senza errori

---

## 🚀 Ordine di Implementazione Consigliato

1. **Task 1**: Aggiungere AnimatedOrbs al marketplace (veloce)
2. **Task 2**: Sostituire icone categorie (medio)
3. **Task 3**: Aggiungere carte demo (medio)
4. **Task 4**: Modificare icona Network di Negozi (veloce)
5. **Task 5**: Animazione rettangolo Escrow (medio)
6. **Task 6**: Creare pagina Stores (lungo)
7. **Task 7**: Collegare bottone a pagina Stores (veloce)
8. **Task 8**: Aggiungere campo provincia (medio)
9. **Task 9**: Verificare filtro tornei (veloce)

---

**Data Creazione**: 2025-01-XX
**Priorità**: Alta
**Stima Tempo Totale**: ~4-6 ore

