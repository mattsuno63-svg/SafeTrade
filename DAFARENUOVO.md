# 📋 CHECKLIST PRIORITARIA - SafeTrade

## ⚠️ REGOLA FONDAMENTALE

> **OGNI ordine su SafeTrade è TRACCIATO e PROTETTO da ESCROW.**  
> Non esistono ordini "non tracciati". SafeTrade = Safe Trade.

> **OGNI rilascio di fondi richiede APPROVAZIONE MANUALE** (Admin/Moderator) con **DOPPIA CONFERMA**.

---

## 🔴 PRIORITÀ CRITICA - DA IMPLEMENTARE SUBITO

### 1. **Sistema Approvazione Manuale Rilascio Fondi** 🆕
- [x] API lista pending releases (`GET /api/admin/pending-releases`)
- [x] API inizia approvazione (`POST /api/admin/pending-releases/[id]/initiate-approval`)
- [x] API conferma approvazione (`POST /api/admin/pending-releases/[id]/confirm-approval`)
- [x] API rifiuta rilascio (`POST /api/admin/pending-releases/[id]/reject`)
- [x] API notifiche admin (`GET /api/admin/notifications`)
- [x] API audit log (`GET /api/admin/audit-log`)
- [x] Worker: crea pending_release quando ordine pronto (NO auto-release!) (`POST /api/admin/cron/create-pending-releases`)
- [x] Worker: notifica admin per pending in attesa >24h (`POST /api/admin/cron/notify-pending-timeout`)
- [x] UI Dashboard Admin/Moderator pending releases (`/admin/pending-releases`)
- [x] UI Modal doppia conferma "Sì, sono sicuro!"
- [x] UI Audit log consultabile (`/admin/audit-log`)
- [x] UI Badge notifiche admin nel header (`AdminNotificationBell` component)

### 2. **Hub Escrow (Gestione Admin-Only)** ✅ SEMPLIFICATO
> ⚠️ Per ora solo l'admin può fare da Hub. Niente registrazione pubblica.
- [x] API hub admin (`GET/PATCH /api/admin/hub`) - crea automaticamente hub per admin
- [x] API gestione pacchi admin (`GET /api/admin/hub/packages`)
- [x] API azioni pacchi admin (`PATCH /api/admin/hub/packages/[id]`) - receive/verify/ship/deliver
- [x] UI dashboard hub integrata in Admin (`/admin/hub`)
- [x] UI gestione pacchi con foto verifica e tracking
- [~] Integrazione selezione hub nelle transazioni (solo hub admin disponibile)

### 3. **Sistema Disputes** ✅ Schema già creato
- [x] API apertura dispute (`POST /api/transactions/[id]/dispute`)
- [x] API gestione dispute (`GET/PATCH /api/disputes/[id]`)
- [x] API messaggi dispute (`POST/GET /api/disputes/[id]/messages`)
- [x] API lista dispute (`GET /api/disputes`)
- [x] Workflow 3-fasi (Apertura → Mediazione → Risoluzione) - implementato in PATCH
- [x] Deadline risposte 48h per seller (calcolato automaticamente)
- [x] Upload foto/documenti per dispute (supportato in API)
- [x] Collegamento dispute → pending_release (rimborso crea PendingRelease!)
- [x] UI dashboard disputes admin (`/admin/disputes`)
- [x] UI dettagli disputa con chat (`/disputes/[id]`)
- [x] UI risoluzione dispute (modal con opzioni)

---

## 🟡 PRIORITÀ ALTA

### 4. **Assicurazione Pacchi** ✅ COMPLETATO
- [x] API creazione assicurazione (`POST /api/transactions/[id]/insurance`)
- [x] API calcolo preview premio (`GET /api/transactions/[id]/insurance/calculate`)
- [x] API gestione sinistri (`POST /api/insurance/[id]/claim`)
- [x] API risoluzione sinistri (`POST /api/insurance/[id]/settle`) - Admin
- [x] API lista assicurazioni (`GET /api/admin/insurance`) - Admin
- [x] Calcolo automatico premio (formula: valore × 2% × fattore rischio)
- [x] Calcolo fattore rischio (valore, storia buyer/seller, dispute)
- [x] Sistema rimborsi (crea pending_release per approvazione!)
- [x] UI dashboard assicurazioni admin (`/admin/insurance`)
- [ ] UI opzione assicurazione (durante creazione transazione) ⏳
- [ ] UI gestione sinistri per buyer (`/my-transactions`)

### 5. **Dashboard Analytics Hub**
- [ ] API metriche hub (`GET /api/hub/my/analytics`)
- [ ] Calcolo metriche (revenue, transazioni, rating, tempi)
- [ ] Grafici revenue (giornaliero/settimanale/mensile)
- [ ] Grafici transazioni (trend temporale)
- [ ] Statistiche disputes (aperte/risolte/rate)
- [ ] UI dashboard analytics (`/hub/analytics`)

### 6. **Hub Certification Program** ✅ Schema già creato
- [ ] Sistema verifica identità (carta identità, selfie, indirizzo, telefono)
- [ ] API upload documenti verifica (`POST /api/hub/certification/verify`)
- [ ] API gestione certificazione (`GET/PATCH /api/hub/certification`)
- [ ] Calcolo automatico livello certificazione
- [ ] Sistema badge visuali (Basic → Verified → Certified → Premium)
- [ ] UI verifica identità (`/hub/certification/verify`)
- [ ] UI stato certificazione (`/hub/certification`)
- [ ] Badge visuali su profilo hub

---

## 🟢 PRIORITÀ MEDIA

### 7. **Sistema Referral Hub**
- [ ] Generazione codici referral univoci
- [ ] API gestione referral (`GET /api/hub/my/referrals`)
- [ ] API registrazione con referral (`POST /api/hub/register?ref=CODE`)
- [ ] Calcolo commissioni referral (10% prima transazione, max €50)
- [ ] Sistema pagamenti commissioni (crea pending_release!)
- [ ] UI dashboard referral (`/hub/referrals`)

### 8. **Sistema Multi-Package** ✅ Schema già creato
- [ ] API creazione package (`POST /api/transactions/[id]/packages`)
- [ ] API gestione package (`GET/PATCH /api/packages/[id]`)
- [ ] Tracking individuale per ogni package
- [ ] Verifica individuale per ogni package
- [ ] UI gestione pacchi multipli

### 9. **Sistema Consolidamento Pacchi** ✅ Schema già creato
- [ ] API richiesta consolidamento (`POST /api/transactions/[id]/consolidate`)
- [ ] Logica consolidamento (pacchi → hub → verifica → spedizione unica)
- [ ] Calcolo risparmio spedizione
- [ ] UI richiesta consolidamento

---

## 🔵 PRIORITÀ BASSA (Futuro)

### 10. **Miglioramenti Generali**
- [ ] Notifiche email per eventi (pacco ricevuto, verificato, spedito)
- [ ] Integrazione tracking corrieri (Poste Italiane, DHL)
- [ ] Sistema rating dettagliato (velocità, accuratezza, comunicazione)
- [ ] Badge hub top-rated
- [ ] Filtri ricerca hub avanzati

---

## ✅ COMPLETATO

### Database Schema
- [x] Schema database EscrowHub
- [x] Schema SafeTradeTransaction con supporto Hub
- [x] Schema tracking pacchi (PENDING → DELIVERED)
- [x] Schema PendingRelease (approvazione manuale)
- [x] Schema FinancialAuditLog (audit trail)
- [x] Schema AdminNotification
- [x] Schema Dispute e DisputeMessage
- [x] Schema PackageInsurance
- [x] Schema Package e PackageConsolidation
- [x] Ruolo MODERATOR aggiunto a UserRole

### API Backend Hub Base
- [x] API registrazione hub (`POST /api/hub/register`)
- [x] API gestione hub (`GET/PATCH /api/hub/my`)
- [x] API lista hub (`GET /api/hub/list`)
- [x] API dettagli hub (`GET /api/hub/[id]`)
- [x] API gestione pacchi (`POST /api/transactions/[id]/package/*`)
- [x] API reviews hub (`POST/GET /api/hub/[id]/review`)

### Hub Admin-Only (Semplificato)
- [x] API hub admin auto-create (`GET/PATCH /api/admin/hub`)
- [x] API lista pacchi admin (`GET /api/admin/hub/packages`)
- [x] API azioni pacchi admin (`PATCH /api/admin/hub/packages/[id]`)
- [x] UI Dashboard Hub in Admin (`/admin/hub`)
- [x] Modal verifica con upload foto
- [x] Modal spedizione con tracking

### Documentazione
- [x] Specifica tecnica escrow (`TECNICO/ESCROW_RULES_SPECIFICATION.md`)
- [x] Regole rilascio manuale con doppia conferma

---

## 🎯 ORDINE DI IMPLEMENTAZIONE

### Fase 1: Sistema Approvazione Manuale (CRITICO)
1. API pending releases (list, approve, reject)
2. UI Dashboard Admin con modal doppia conferma
3. Worker per creare pending_release
4. Audit log completo

### Fase 2: Hub Admin-Only ✅ COMPLETATO
5. ~~UI registrazione hub~~ → Hub creato automaticamente per admin
6. UI dashboard hub integrata in admin (`/admin/hub`)
7. UI gestione pacchi con azioni (ricevi/verifica/spedisci/consegna)
8. ~~UI lista hub~~ → Solo hub admin attivo

### Fase 3: Sistema Disputes
9. API disputes complete
10. Collegamento disputes → pending_release
11. UI disputes

### Fase 4: Funzionalità Avanzate
12. Assicurazione pacchi
13. Analytics hub
14. Certificazione hub
15. Referral system
16. Multi-package e consolidamento

---

**Ultimo aggiornamento**: 2026-01-11
**Focus attuale**: Fase 4 Assicurazione Pacchi 🚧 IN CORSO
