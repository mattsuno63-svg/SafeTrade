# 📋 Product Requirements Document (PRD) - SafeTrade

## 🎯 Vision Statement

SafeTrade è un marketplace P2P per collezionisti di carte (Pokemon, Magic, Yu-Gi-Oh) che garantisce transazioni sicure attraverso un sistema di verifica presso negozi partner locali.

---

## 👥 Target Users

### Primary Users
1. **Collezionisti (USER)**
   - Età: 16-45 anni
   - Interessi: TCG, collezionismo, gaming
   - Bisogni: Comprare/vendere carte in sicurezza, trovare carte rare

2. **Negozi Verificati (MERCHANT)**
   - Proprietari negozi fisici di carte
   - Bisogni: Espandere vendite online, gestire inventario, verificare transazioni

### Secondary Users
3. **Verified Local Stores (VLS)**
   - Negozi partner che verificano transazioni
   - Bisogni: Processo semplice per verificare scambi

---

## 🎯 Goals & Objectives

### Business Goals
- Creare marketplace sicuro per collezionisti
- Ridurre frodi nelle transazioni P2P
- Connettere collezionisti e negozi locali

### User Goals
- **Collezionisti**: Comprare/vendere carte in sicurezza
- **Negozi**: Gestire inventario e vendite online
- **VLS**: Verificare transazioni facilmente

---

## 📊 Core Features

### 1. Marketplace P2P
**Priorità**: 🔴 Alta

**Descrizione**:
- Listings pubblici per vendita/scambio carte
- Ricerca avanzata con filtri
- Sistema proposte di acquisto
- Profili utente

**User Stories**:
- Come collezionista, voglio cercare carte per nome/set così da trovare quello che cerco
- Come venditore, voglio pubblicare annunci con foto così da mostrare le mie carte
- Come acquirente, voglio fare proposte così da negoziare il prezzo

**Acceptance Criteria**:
- [ ] Ricerca funziona con fuzzy matching
- [ ] Upload immagini multipli funziona
- [ ] Proposte vengono notificate in real-time
- [ ] Profili utente mostrano rating e storico

---

### 2. SafeTrade System
**Priorità**: 🔴 Alta

**Descrizione**:
- Transazioni verificate presso negozi partner
- QR code per check-in
- Verifica identità e oggetti
- Tracking transazione

**User Stories**:
- Come acquirente, voglio completare transazione in negozio così da essere sicuro
- Come VLS, voglio verificare transazioni facilmente così da aiutare utenti
- Come utente, voglio tracciare stato transazione così da sapere quando andare

**Acceptance Criteria**:
- [ ] QR code generato correttamente
- [ ] Check-in funziona con scanner o input manuale
- [ ] Verifica completa con checklist
- [ ] Notifiche real-time per ogni step

---

### 3. Merchant Dashboard
**Priorità**: 🟡 Media

**Descrizione**:
- Gestione inventario prodotti
- Creazione offerte esclusive
- Verifica transazioni SafeTrade
- Import da piattaforme esterne (futuro)

**User Stories**:
- Come merchant, voglio gestire inventario così da tenere traccia prodotti
- Come merchant, voglio creare offerte così da attirare clienti
- Come merchant, voglio verificare transazioni così da aiutare utenti

**Acceptance Criteria**:
- [ ] CRUD prodotti completo
- [ ] Create offer multi-step funziona
- [ ] VLS dashboard per verifiche
- [ ] Import inventario (futuro)

---

### 4. User Dashboard
**Priorità**: 🟡 Media

**Descrizione**:
- Gestione listing personali
- Gestione proposte (ricevute/inviate)
- Tracking transazioni
- Profilo e impostazioni

**User Stories**:
- Come utente, voglio vedere miei listing così da gestirli
- Come utente, voglio vedere proposte così da rispondere
- Come utente, voglio tracciare transazioni così da sapere stato

**Acceptance Criteria**:
- [ ] Lista listing con filtri
- [ ] Gestione proposte (accept/reject)
- [ ] Timeline transazioni
- [ ] Profilo modificabile

---

## 🎨 Design Requirements

### UI/UX
- **Design System**: "Liquid Glass" aesthetic
- **Responsive**: Mobile-first, funziona su tutti i dispositivi
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Lighthouse score > 90

### Branding
- Colori primari: Arancione (#FF6B35) e gradienti
- Typography: Font moderno e leggibile
- Icons: Material Symbols

---

## 🔒 Security Requirements

### Authentication
- Supabase Auth con email/password
- Session management sicuro (cookie httpOnly)
- Password reset flow
- Email verification (opzionale MVP)

### Data Protection
- HTTPS sempre
- Sanitizzazione input (prevent XSS)
- SQL injection prevention (Prisma)
- Rate limiting (futuro)

### Privacy
- GDPR compliance (futuro)
- Privacy policy
- Terms of service

---

## 📈 Success Metrics

### MVP Metrics
- **User Acquisition**: 100 utenti registrati in primo mese
- **Listings**: 500 listings creati in primo mese
- **Transactions**: 50 transazioni SafeTrade completate
- **Retention**: 30% utenti attivi dopo 1 mese

### Future Metrics
- Conversion rate (proposte → transazioni)
- Average transaction value
- Merchant satisfaction
- VLS verification time

---

## 🚀 MVP Scope

### In Scope (Must Have)
- ✅ Autenticazione (signup, login, logout)
- ✅ Marketplace P2P (ricerca, listings, proposte)
- ✅ SafeTrade flow completo
- ✅ Merchant dashboard base
- ✅ User dashboard base
- ✅ Notifiche real-time
- ✅ Upload immagini

### Out of Scope (Future)
- ❌ Pagamenti integrati
- ❌ Chrome extension import
- ❌ App mobile nativa
- ❌ Sistema rating avanzato
- ❌ Chat tra utenti
- ❌ Analytics avanzate

---

## 🗓️ Timeline

### Fase 1: Foundation (Settimana 1-2)
- Setup progetto
- Database schema
- Autenticazione
- UI base

### Fase 2: Core Features (Settimana 3-4)
- Marketplace P2P
- SafeTrade flow
- Dashboard base

### Fase 3: Polish (Settimana 5-6)
- Refinements
- Testing
- Bug fixes
- Deploy

---

## 🎯 Success Criteria

Il MVP è considerato successo se:
1. ✅ Utenti possono registrarsi e fare login
2. ✅ Utenti possono creare e cercare listings
3. ✅ Sistema proposte funziona end-to-end
4. ✅ SafeTrade flow completo funziona
5. ✅ Merchant può gestire inventario base
6. ✅ Notifiche real-time funzionano
7. ✅ Deploy su Vercel funziona

---

## 📝 Assumptions

1. Utenti hanno accesso a smartphone per QR code
2. Negozi partner sono disponibili nelle principali città
3. Utenti sono tech-savvy (sanno usare app web)
4. Supabase free tier sufficiente per MVP

---

## 🚨 Risks & Mitigation

### Risk 1: Pochi negozi partner
**Mitigation**: Iniziare con negozi esistenti, semplificare processo verifica

### Risk 2: Bassa adoption
**Mitigation**: Marketing mirato, referral program

### Risk 3: Problemi tecnici
**Mitigation**: Testing completo, monitoring, backup plans

---

## 📚 References

- Flow documentation: `TECNICO/FLOW/`
- Architecture: `ARCHITECTURE.md`
- Coding standards: `TECNICO/Rules/`

---

**Ultimo aggiornamento**: 2025-01-29
**Versione**: 1.0 (MVP)

