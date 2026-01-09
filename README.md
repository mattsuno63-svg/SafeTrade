# 🛡️ SafeTrade - Secure Card Trading Platform

SafeTrade è una piattaforma innovativa per lo scambio sicuro di carte da gioco collezionabili (TCG) in Italia, con un sistema di escrow integrato per proteggere acquirenti e venditori.

## 🚀 Caratteristiche Principali

### 🔐 Sistema SafeTrade Escrow
- **Garanzia di sicurezza** tramite negozi verificati locali (VLS)
- **Protezione completa** per acquirenti e venditori
- **Chat integrata** per comunicazione sicura tra le parti (EscrowSession, EscrowMessage)
- **Gestione pagamenti** con trattenimento e rilascio fondi (hold, release, refund)
- **Sistema anti-frode** con risk scoring automatico
- **QR code** per check-in in negozio
- **Sistema fee** completo (SELLER, BUYER, SPLIT)

### 🏪 Dashboard Merchant
- Gestione completa del negozio (shop setup, logo, cover, gallery)
- Creazione e gestione tornei
- Inventario prodotti (CRUD completo)
- Sistema di offerte esclusive
- Sistema di promozioni
- Gestione ordini e appuntamenti SafeTrade
- Landing page pubblica personalizzata (/shops/[slug])
- Gestione social media links

### 👥 Funzionalità Utente
- Marketplace con filtri avanzati (game, condition, price, location)
- Sistema di proposte P2P (accept, reject)
- Dashboard personale completa
- Gestione carte collezionabili (create, edit, delete listings)
- Sistema di notifiche real-time (Supabase Realtime)
- Gestione escrow sessions
- Profilo utente e impostazioni

### 🛡️ Pannello Admin
- Approvazione merchant (applications management)
- Moderazione inserzioni (approval system con notes)
- Gestione tornei
- Statistiche piattaforma
- Gestione listings (create, edit, delete per admin)

## 🛠️ Stack Tecnologico

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: Supabase Authentication
- **Storage**: Supabase Storage
- **Styling**: Tailwind CSS + Shadcn/ui
- **Language**: TypeScript
- **Real-time**: Supabase Realtime

## 📁 Struttura Progetto

```
3SafeTrade/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Autenticazione (login, signup)
│   │   ├── (marketplace)/     # Marketplace e listing
│   │   ├── admin/             # Pannello amministrazione
│   │   ├── dashboard/         # Dashboard utente
│   │   ├── escrow/            # Sistema escrow
│   │   ├── merchant/          # Dashboard merchant
│   │   └── api/               # API Routes
│   ├── components/            # Componenti React
│   │   ├── homepage/          # Componenti homepage
│   │   ├── layout/            # Layout (Header, Footer)
│   │   └── ui/                # UI Components (Shadcn)
│   ├── contexts/              # React Contexts
│   ├── hooks/                 # Custom React Hooks
│   ├── lib/                   # Utility e configurazioni
│   └── types/                 # TypeScript Types
├── prisma/                    # Database Schema & Migrations
├── scripts/                   # Utility Scripts
├── TECNICO/                   # Documentazione tecnica
│   ├── FLOW/                  # Flow documentation
│   ├── PRD/                   # Product Requirements
│   └── Rules/                 # Coding Standards
├── DAFARENUOVO.md            # Checklist sviluppo
└── SAFETRADE_ESCROW_IMPLEMENTATION.md  # Doc sistema escrow
```

## 🚀 Setup Locale

### Prerequisiti
- Node.js 18+
- PostgreSQL
- Account Supabase

### Installazione

1. **Clone del repository**
```bash
git clone [repository-url]
cd 3SafeTrade
```

2. **Installazione dipendenze**
```bash
npm install
```

3. **Configurazione ambiente**
Crea un file `.env.local` con:
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

4. **Setup database**
```bash
npx prisma db push
npx prisma generate
npx prisma db seed
```

5. **Avvio server di sviluppo**
```bash
npm run dev
```

L'applicazione sarà disponibile su `http://localhost:3000`

## 👤 Setup Utente Admin

Per configurare un utente come admin e merchant:

```bash
npx tsx scripts/setup-admin-merchant.ts
```

Modifica lo script con la tua email prima di eseguirlo.

## 📚 Documentazione

- **[TEST_CHECKLIST.md](./TEST_CHECKLIST.md)** - ✅ Checklist completa test pre-deploy (IMPORTANTE!)
- **[DAFARENUOVO.md](./DAFARENUOVO.md)** - Checklist completa funzionalità
- **[SAFETRADE_ESCROW_IMPLEMENTATION.md](./SAFETRADE_ESCROW_IMPLEMENTATION.md)** - Sistema escrow
- **[TECNICO/SEGUI.MD](./TECNICO/SEGUI.MD)** - Requirements originali
- **[TECNICO/FLOW/](./TECNICO/FLOW/)** - Documentazione flow utente
- **[TECNICO/PRD/](./TECNICO/PRD/)** - Product Requirements Document

## 🌐 Internazionalizzazione

L'applicazione supporta:
- 🇮🇹 Italiano (default)
- 🇬🇧 Inglese

Switch lingua disponibile nell'header della piattaforma.

## 🔐 Ruoli Utente

- **USER** - Utente base (acquisto/vendita P2P)
- **MERCHANT** - Negozio verificato (gestione shop, tornei, escrow)
- **ADMIN** - Amministratore piattaforma (approvazioni, moderazione)

## 🛡️ Sistema Escrow

Il sistema SafeTrade Escrow garantisce transazioni sicure:

1. Acquirente e venditore creano una proposta
2. Si crea automaticamente una sessione escrow
3. Le parti comunicano nella chat sicura
4. Il merchant (VLS) gestisce il pagamento
5. Verifica delle carte e rilascio fondi

**Protezioni anti-frode:**
- Risk scoring automatico
- Review manuale per transazioni ad alto rischio
- Trattenimento fondi fino a verifica
- Sistema di rimborso

## 📦 Deployment

### Vercel (Raccomandato)

1. Push su GitHub
2. Connetti repository su Vercel
3. Configura variabili d'ambiente
4. Deploy automatico

### Database
- Usa Supabase PostgreSQL
- Configura connection pooling per produzione

## 🤝 Contributi

Questo è un progetto privato. Per contributi o domande, contattare il team di sviluppo.

## 📄 Licenza

Proprietà privata - Tutti i diritti riservati

## 🐛 Bug Report & Feature Request

Usa la documentazione in `TECNICO/` per segnalare bug o richiedere nuove funzionalità.

---

**Sviluppato con ❤️ per la community italiana del Trading Card Game**
