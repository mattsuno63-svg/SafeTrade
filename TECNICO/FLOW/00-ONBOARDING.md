# 🚀 Onboarding Flow - SafeTrade

## Overview
Il flusso di onboarding guida i nuovi utenti attraverso la registrazione e la configurazione iniziale del loro account SafeTrade.

---

## 📋 Step 1: Landing Page

**Pagina**: `/` (Homepage)

**Componenti**:
- Hero section con CTA "Get Started"
- Categories showcase (Pokemon, Magic, Yu-Gi-Oh)
- Tournaments section
- Features highlights

**Azioni utente**:
- Clicca "Get Started" → Vai a `/signup`
- Clicca "Log In" → Vai a `/login`
- Naviga categorie → Vai a `/marketplace`

**Stato**: ✅ Completato

---

## 📋 Step 2: Scelta Tipo Account

**Pagina**: `/signup`

**Componenti**:
- Form registrazione base
- Selezione ruolo: **USER** (Collezionista) o **MERCHANT** (Negozio)

**Flussi**:
- **USER**: Registrazione semplice → Dashboard collezionista
- **MERCHANT**: Registrazione + verifica negozio → Dashboard merchant

**Campi form**:
- Email (obbligatorio)
- Password (min 8 caratteri)
- Nome (opzionale)
- Ruolo (USER/MERCHANT)

**Validazione**:
- Email formato valido
- Password sicura
- Email non già registrata

**Azioni**:
- Submit → Crea account in Supabase Auth
- Crea record in Prisma `User` table
- Invia email verifica (se configurato)
- Redirect a `/dashboard` dopo successo

**Stato**: ✅ Completato

---

## 📋 Step 3: Verifica Email (Opzionale)

**Pagina**: `/verify-email` (da creare)

**Componenti**:
- Messaggio "Verifica la tua email"
- Link per reinvio email
- Bottone "Skip for now"

**Azioni**:
- Utente clicca link in email → Verifica account
- Redirect a `/dashboard` dopo verifica

**Stato**: ⏳ Da implementare

---

## 📋 Step 4: First Login

**Pagina**: `/login`

**Componenti**:
- Form login (email + password)
- Link "Forgot password?"
- Link "Don't have an account? Sign up"

**Validazione**:
- Email e password obbligatori
- Credenziali corrette

**Azioni**:
- Submit → Autentica con Supabase
- Salva sessione in cookie (base64url)
- Redirect a `/dashboard`

**Stato**: ✅ Completato

---

## 📋 Step 5: Dashboard Iniziale

**Pagina**: `/dashboard`

**Componenti**:
- Welcome message
- Quick actions basate su ruolo
- Tutorial/onboarding tooltips (opzionale)

**Per USER**:
- "Browse Listings" → `/marketplace`
- "Sell Cards" → `/sell`
- "View Profile" → `/dashboard/profile`

**Per MERCHANT**:
- "Manage Inventory" → `/dashboard/merchant/inventory`
- "Create Offer" → `/dashboard/merchant/create-offer`
- "View Offers" → `/dashboard/merchant/offers`

**Stato**: ✅ Completato (base)

---

## 📋 Step 6: Setup Profilo (Opzionale)

**Pagina**: `/dashboard/profile`

**Componenti**:
- Form profilo utente
- Upload avatar
- Informazioni personali
- Preferenze

**Campi**:
- Nome completo
- Avatar (immagine)
- Bio (opzionale)
- Preferenze notifiche

**Per MERCHANT**:
- Informazioni negozio
- Indirizzo
- Orari apertura
- Verifica negozio

**Stato**: ⏳ Da implementare

---

## 🔄 Flussi Alternativi

### Skip Onboarding
- Utente può saltare setup profilo
- Può completare dopo

### Re-login
- Utente già registrato → `/login` → `/dashboard`
- Session persistente (cookie)

### Password Reset
- `/forgot-password` → Invia link reset
- `/reset-password?token=xxx` → Nuova password

**Stato**: ⏳ Da implementare

---

## ✅ Checklist Onboarding

- [x] Landing page con CTA
- [x] Pagina signup con selezione ruolo
- [x] Pagina login funzionante
- [x] Dashboard base per USER e MERCHANT
- [ ] Verifica email
- [ ] Setup profilo completo
- [ ] Password reset
- [ ] Tutorial/onboarding tooltips

---

## 🎯 Prossimi Step

Dopo onboarding, utente può:
1. **USER**: Cercare carte, creare listing, fare proposte
2. **MERCHANT**: Gestire inventario, creare offerte, verificare transazioni

Vedi flow specifici:
- `01-MARKETPLACE.md` - Flow marketplace P2P
- `02-MERCHANT.md` - Flow merchant
- `03-SAFETRADE.md` - Flow transazioni SafeTrade

