# 🧪 TEST DA FARE - SafeTrade

## 📋 Indice
- [Test Sistema QR Code](#test-sistema-qr-code)
- [Test Sistema Fee](#test-sistema-fee)
- [Test Transazioni](#test-transazioni)
- [Test Listing Management](#test-listing-management)
- [Test Concorrenza](#test-concorrenza)
- [Test Sicurezza](#test-sicurezza)
- [Test UI/UX](#test-uiux)
- [Test Performance](#test-performance)

---

## 🔐 Test Sistema QR Code

### Test 1: Unicità QR Code
**Priorità:** 🔴 ALTA

**Obiettivo:** Verificare che non vengano mai generati QR code duplicati

**Script da creare:** `scripts/test-qr-uniqueness.ts`

```typescript
// Test da implementare:
// 1. Genera 1000 transazioni simultanee
// 2. Verifica che tutti i QR siano univoci
// 3. Tenta di inserire un QR duplicato nel database
// 4. Conferma che PostgreSQL blocca il duplicato
// 5. Test con timestamp identici (stesso millisecondo)
```

**Scenari:**
- ✅ Due transazioni nello stesso millisecondo
- ✅ 1000 transazioni in parallelo
- ✅ Inserimento manuale di duplicato (deve fallire)
- ✅ Verifica constraint `@unique` in PostgreSQL

**Risultato atteso:**
- Tutti i QR devono essere univoci al 100%
- Database deve bloccare duplicati con errore

---

### Test 2: Scansione QR Code
**Priorità:** 🔴 ALTA

**Obiettivo:** Verificare il flusso completo di scansione

**Scenari:**
1. **QR valido**: Merchant scansiona QR corretto
   - ✅ Deve mostrare dettagli transazione
   - ✅ Deve permettere conferma/rifiuto

2. **QR già scansionato**: Merchant scansiona QR già usato
   - ✅ Deve mostrare messaggio "Già scannerizzato"
   - ✅ Deve mostrare data/ora prima scansione

3. **QR inesistente**: Merchant scansiona QR fake
   - ✅ Deve mostrare errore "QR non valido"
   - ✅ Non deve crashare l'app

4. **QR scaduto**: Transazione completata/cancellata
   - ✅ Deve mostrare stato transazione
   - ✅ Non deve permettere modifiche

---

### Test 3: QR Code Timeout
**Priorità:** 🟡 MEDIA

**Obiettivo:** Gestire QR scaduti dopo X ore/giorni

**Test:**
- Transazione non completata dopo 24 ore
- QR deve restare valido o scadere?
- Implementare notifica automatica?

---

## 💰 Test Sistema Fee

### Test 4: Calcolo Fee SELLER
**Priorità:** 🔴 ALTA

**Input:** 
- Prezzo: €100
- Fee: 5%
- Pagata da: SELLER

**Output atteso:**
- Acquirente paga: €100
- Venditore riceve: €95
- Fee merchant: €5

---

### Test 5: Calcolo Fee BUYER
**Priorità:** 🔴 ALTA

**Input:** 
- Prezzo: €100
- Fee: 5%
- Pagata da: BUYER

**Output atteso:**
- Acquirente paga: €105
- Venditore riceve: €100
- Fee merchant: €5

---

### Test 6: Calcolo Fee SPLIT
**Priorità:** 🔴 ALTA

**Input:** 
- Prezzo: €100
- Fee: 5%
- Pagata da: SPLIT

**Output atteso:**
- Acquirente paga: €102.50
- Venditore riceve: €97.50
- Fee merchant: €5 (€2.50 da ognuno)

---

### Test 7: Arrotondamento Fee
**Priorità:** 🟡 MEDIA

**Test casi limite:**
- Prezzo: €10.33, Fee 5% = €0.5165 → Arrotonda a?
- Prezzo: €0.99, Fee 5% = €0.0495 → Arrotonda a?
- Prezzo: €999.99, Fee 5% = €49.9995 → Arrotonda a?

**Verifica:**
- Acquirente + Venditore + Fee = Prezzo originale (no perdite)
- Arrotondamento sempre a 2 decimali

---

### Test 8: Modifica Prezzo al Negozio
**Priorità:** 🔴 ALTA

**Scenario:** 
- Prezzo concordato: €100
- Merchant modifica a: €90
- Fee deve ricalcolarsi automaticamente

**Verifica:**
- Nuova fee: €4.50 (5% di €90)
- Se SELLER: Venditore riceve €85.50
- Se BUYER: Acquirente paga €94.50
- Se SPLIT: Acquirente €92.25, Venditore €87.75

---

## 🔄 Test Transazioni

### Test 9: Flow Completo End-to-End
**Priorità:** 🔴 ALTA

**Flow:**
1. Luca crea listing "Charizard" a €100
2. Marco fa proposta €90, sceglie SPLIT
3. Luca accetta proposta
4. Luca seleziona negozio e data
5. Sistema genera QR univoco
6. Entrambi ricevono notifiche
7. Vanno al negozio, merchant scansiona
8. Merchant conferma vendita a €90
9. Listing marcato come venduto
10. Fee divisa correttamente

**Verifica ogni step:**
- ✅ Notifiche inviate
- ✅ QR generato
- ✅ Calcoli corretti
- ✅ Stato listing aggiornato

---

### Test 10: Transazione Rifiutata
**Priorità:** 🔴 ALTA

**Scenario:**
1. Transazione in corso
2. Merchant rifiuta (motivo: "Carta danneggiata")
3. Sistema deve:
   - ✅ Marcare transazione CANCELLED
   - ✅ Rimettere listing disponibile (isActive=true, isSold=false)
   - ✅ Notificare acquirente e venditore
   - ✅ Non trattenere fee

---

### Test 11: Annullamento Pre-Appuntamento
**Priorità:** 🟡 MEDIA

**Scenario:**
- Luca accetta proposta
- Luca seleziona negozio/data
- Luca vuole cancellare prima dell'appuntamento

**Test:**
- Sistema deve permettere annullamento?
- Penalità per chi cancella?
- Listing torna disponibile?

---

## 📦 Test Listing Management

### Test 12: Listing Venduto
**Priorità:** 🔴 ALTA

**Verifica:**
1. Listing venduto → `isSold = true`, `isActive = false`
2. Non appare più in marketplace
3. Non accetta nuove proposte
4. Visibile in "Mie vendite completate"

---

### Test 13: Listing Ripristinato
**Priorità:** 🔴 ALTA

**Verifica:**
1. Transazione cancellata/rifiutata
2. Listing torna disponibile: `isSold = false`, `isActive = true`
3. Riappare in marketplace
4. Accetta nuove proposte

---

### Test 14: Listing con Multiple Proposte
**Priorità:** 🟡 MEDIA

**Scenario:**
- Charizard ha 3 proposte pending
- Venditore accetta proposta #2
- Proposta #1 e #3 devono essere:
  - ✅ Auto-rifiutate?
  - ✅ Notificate agli altri utenti?

---

## ⚡ Test Concorrenza

### Test 15: Doppia Accettazione
**Priorità:** 🔴 ALTA

**Scenario:**
- Due utenti accettano la stessa proposta simultaneamente
- Solo il primo deve avere successo
- Il secondo deve ricevere errore

---

### Test 16: Race Condition Listing
**Priorità:** 🔴 ALTA

**Scenario:**
- Listing ha 1 unità disponibile
- Due utenti fanno proposta nello stesso millisecondo
- Sistema deve gestire correttamente

---

### Test 17: Stress Test Transazioni
**Priorità:** 🟡 MEDIA

**Test:**
- 100 transazioni simultanee
- Verificare performance database
- Verificare integrità dati
- Verificare nessun QR duplicato

---

## 🔒 Test Sicurezza

### Test 18: Autenticazione QR
**Priorità:** 🔴 ALTA

**Scenari:**
1. Utente non autenticato tenta scansione
2. Merchant scansiona QR di altro negozio
3. Utente normale tenta scansione (non merchant)
4. Admin tenta scansione

**Verifica:**
- Solo merchant autorizzato può scannerizzare
- Admin può scannerizzare per debug

---

### Test 19: Manipolazione Fee
**Priorità:** 🔴 ALTA

**Attacchi da testare:**
1. Modificare `feePaidBy` via API diretta
2. Modificare `totalAmount` via API
3. Bypass calcolo fee
4. SQL injection nei campi prezzo

**Verifica:**
- API validano tutti gli input
- Calcoli server-side non bypassabili
- Nessuna manipolazione possibile da client

---

### Test 20: XSS e Injection
**Priorità:** 🔴 ALTA

**Test:**
- Input malevoli in form proposta
- Script injection in messaggi
- SQL injection in ricerche
- Path traversal in upload immagini

---

## 🎨 Test UI/UX

### Test 21: Form Proposta
**Priorità:** 🟡 MEDIA

**Verifica:**
1. Prezzo = 0 → Errore
2. Prezzo negativo → Errore
3. Prezzo con lettere → Errore
4. Prezzo troppo alto (>€10000) → Warning
5. Selezione fee visibile e chiara
6. Calcoli in tempo reale corretti

---

### Test 22: Pagina QR Code
**Priorità:** 🟡 MEDIA

**Verifica:**
1. QR visibile e grande
2. Pulsante Download funziona
3. Pulsante Stampa funziona
4. Breakdown pagamento chiaro
5. Responsive su mobile

---

### Test 23: Notifiche
**Priorità:** 🟡 MEDIA

**Verifica:**
1. Notifica proposta ricevuta
2. Notifica proposta accettata
3. Notifica appuntamento confermato
4. Notifica QR generato
5. Notifica transazione completata
6. Notifica transazione rifiutata

---

## ⚡ Test Performance

### Test 24: Caricamento Pagine
**Priorità:** 🟡 MEDIA

**Target:**
- Marketplace: < 2 secondi
- Listing detail: < 1 secondo
- Form proposta: < 1 secondo
- QR code page: < 0.5 secondi

---

### Test 25: Database Query
**Priorità:** 🟡 MEDIA

**Verifica:**
- Query listings con 10,000 record
- Query transazioni con 1,000 record
- Join complessi (listing + user + proposal)
- Indexes configurati correttamente

---

### Test 26: Upload Immagini
**Priorità:** 🟡 MEDIA

**Test:**
- Upload immagine 10MB
- Upload 5 immagini simultanee
- Formato non supportato
- Immagine corrotta
- Resize automatico

---

## 📱 Test Mobile

### Test 27: Responsive Design
**Priorità:** 🟡 MEDIA

**Device da testare:**
- iPhone SE (piccolo)
- iPhone 12 Pro (medio)
- iPad (tablet)
- Android vari

**Verifica:**
- Form leggibili
- QR ben visibile
- Bottoni cliccabili
- No overflow testo

---

### Test 28: Fotocamera QR
**Priorità:** 🔵 BASSA

**Test futuro:**
- Scansione QR da fotocamera
- Funziona con luce scarsa?
- Funziona con QR stampato male?

---

## 🔄 Test Integrazione

### Test 29: Supabase Auth
**Priorità:** 🔴 ALTA

**Verifica:**
- Login funziona
- Logout pulisce sessione
- Token refresh automatico
- Session sync tra tab

---

### Test 30: Prisma Database
**Priorità:** 🔴 ALTA

**Verifica:**
- Migrations funzionano
- Constraints rispettati
- Cascade delete corretti
- No orphan records

---

## 📊 Test Reportistica

### Test 31: Dashboard Merchant
**Priorità:** 🟡 MEDIA

**Verifica:**
- Totale fee guadagnate corrette
- Numero transazioni corretto
- Lista transazioni accurate
- Filtri funzionanti

---

### Test 32: Dashboard Admin
**Priorità:** 🟡 MEDIA

**Verifica:**
- Statistiche globali corrette
- Lista merchants accurate
- Approva/Rifiuta funziona
- Moderazione listings funziona

---

## 🎯 Test Edge Cases

### Test 33: Casi Limite Prezzo
**Priorità:** 🟡 MEDIA

**Test:**
- Prezzo €0.01 (minimo)
- Prezzo €999,999.99 (massimo)
- Prezzo con 3+ decimali
- Prezzo in formato errato

---

### Test 34: Casi Limite Date
**Priorità:** 🟡 MEDIA

**Test:**
- Appuntamento nel passato
- Appuntamento tra 1 anno
- Orario negozio chiuso
- Giorno festivo

---

### Test 35: Casi Limite Utenti
**Priorità:** 🟡 MEDIA

**Test:**
- Utente cancella account durante transazione
- Merchant disattivato durante transazione
- Listing cancellato dopo proposta accettata

---

## 📝 Note Implementazione Test

### Script da Creare:

1. **`scripts/test-qr-uniqueness.ts`**
   - Test generazione 1000 QR simultanei
   - Verifica unicità
   - Test constraint database

2. **`scripts/test-fee-calculation.ts`**
   - Test tutti i casi SELLER/BUYER/SPLIT
   - Test arrotondamento
   - Test edge cases

3. **`scripts/test-transaction-flow.ts`**
   - Test flow completo end-to-end
   - Automazione con Puppeteer/Playwright?

4. **`scripts/test-concurrency.ts`**
   - Test race conditions
   - Test doppia accettazione
   - Test stress

5. **`scripts/test-security.ts`**
   - Test SQL injection
   - Test XSS
   - Test bypass autenticazione

---

## ✅ Checklist Prima Deploy

Prima di andare in produzione, completare:

- [ ] Test 1: Unicità QR Code
- [ ] Test 2: Scansione QR Code
- [ ] Test 4-6: Calcolo Fee (SELLER/BUYER/SPLIT)
- [ ] Test 8: Modifica Prezzo al Negozio
- [ ] Test 9: Flow Completo End-to-End
- [ ] Test 10: Transazione Rifiutata
- [ ] Test 12-13: Listing Venduto/Ripristinato
- [ ] Test 15: Doppia Accettazione
- [ ] Test 18: Autenticazione QR
- [ ] Test 19: Manipolazione Fee
- [ ] Test 29: Supabase Auth
- [ ] Test 30: Prisma Database

---

## 📅 Timeline Suggerita

### Fase 1: Test Critici (Pre-MVP)
- Settimana 1-2: Test QR + Fee + Transazioni
- Target: 100% test critici passati

### Fase 2: Test Sicurezza (Pre-Beta)
- Settimana 3: Test autenticazione + injection
- Target: 0 vulnerabilità critiche

### Fase 3: Test Performance (Pre-Produzione)
- Settimana 4: Test carico + stress
- Target: < 2s caricamento pagine

### Fase 4: Test Mobile (Post-Lancio)
- Settimana 5-6: Test responsive + device
- Target: Funziona su 95% device

---

## 🎓 Best Practices Testing

1. **Automatizza dove possibile**
   - Unit tests con Jest
   - Integration tests con Supertest
   - E2E tests con Playwright

2. **Test in locale prima**
   - Database test separato
   - Seed data consistente
   - Reset database tra test

3. **Monitor in produzione**
   - Sentry per errori
   - LogRocket per session replay
   - Analytics per UX

4. **Continuous Testing**
   - GitHub Actions su ogni PR
   - Test automatici su push
   - Test di regressione settimanali

---

**Ultimo aggiornamento:** 2025-01-08
**Versione:** 1.0

---

## 🚀 Prossimi Passi

1. Prioritizza i test in base a:
   - 🔴 ALTA = Prima del lancio
   - 🟡 MEDIA = Prima settimana produzione
   - 🔵 BASSA = Quando possibile

2. Crea gli script test uno alla volta

3. Documenta risultati test in `TECNICO/RISULTATI_TEST.md`

4. Aggiorna questo file con nuovi test scoperti durante sviluppo

