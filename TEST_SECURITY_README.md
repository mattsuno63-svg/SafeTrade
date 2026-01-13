# 🔒 SafeTrade - Test di Sicurezza e Stabilità

Suite completa di test per verificare sicurezza e stabilità del sistema prima del deploy su dominio definitivo.

## 📋 Panoramica

Questa suite include:
- **Test di Sicurezza**: SQL injection, XSS, autenticazione, autorizzazione, validazione input
- **Test di Stabilità**: Performance, carico, gestione errori, integrità database

## 🚀 Esecuzione Test

### Prerequisiti

1. Assicurati che il server di sviluppo sia in esecuzione:
   ```bash
   npm run dev
   ```

2. Configura le variabili d'ambiente (opzionale):
   ```bash
   export TEST_BASE_URL=http://localhost:3000
   export TEST_EMAIL=test@safetrade.it
   export TEST_PASSWORD=Test123456!
   ```

### Eseguire Tutti i Test

```bash
npm run test:all
```

Questo comando:
- Esegue tutti i test di sicurezza
- Esegue tutti i test di stabilità
- Genera un report completo in `TEST_SECURITY_REPORT.md`

### Eseguire Test Singoli

**Test di Sicurezza:**
```bash
npm run test:security
```

**Test di Stabilità:**
```bash
npm run test:stability
```

## 📊 Test Inclusi

### 🛡️ Test di Sicurezza

1. **SQL Injection - Query Parameters**
   - Verifica protezione contro SQL injection nei parametri query
   - Test: `'; DROP TABLE users; --`

2. **SQL Injection - Body Parameters**
   - Verifica protezione contro SQL injection nel body delle richieste
   - Test: Input maliziosi nel body JSON

3. **XSS Input Sanitization**
   - Verifica sanitizzazione input per prevenire XSS
   - Test: `<script>alert("XSS")</script>`

4. **Authentication Bypass**
   - Verifica che le route protette richiedano autenticazione
   - Test: Accesso a `/api/admin/stats` senza autenticazione

5. **Authorization Bypass**
   - Verifica che utenti normali non possano accedere a route admin
   - Test: Accesso a route admin senza privilegi

6. **IDOR Protection**
   - Verifica protezione contro Insecure Direct Object Reference
   - Test: Accesso a risorse di altri utenti

7. **Input Validation - Data Types**
   - Verifica validazione tipi di dati
   - Test: Invio di tipi errati (number invece di string, ecc.)

8. **Input Validation - Boundary Values**
   - Verifica validazione valori limite
   - Test: Stringhe troppo lunghe, valori negativi, ecc.

9. **Rate Limiting**
   - Verifica implementazione rate limiting
   - Test: Invio di molte richieste rapidamente

10. **Error Handling**
    - Verifica che gli errori non espongano informazioni sensibili
    - Test: Verifica che stack traces non siano esposti

### ⚡ Test di Stabilità

1. **Load Test - Concurrent Requests**
   - Test con 50 richieste concorrenti
   - Verifica che almeno il 95% delle richieste abbia successo

2. **Database Connection Pool**
   - Test pool di connessioni database
   - Verifica performance con 100 query concorrenti

3. **Memory Usage Over Time**
   - Monitora uso memoria durante iterazioni multiple
   - Verifica assenza di memory leaks

4. **API Endpoint Availability**
   - Verifica disponibilità di tutti gli endpoint principali
   - Test response time per ogni endpoint

5. **Database Query Optimization**
   - Test performance query complesse con join
   - Verifica che le query completino in < 1 secondo

6. **Error Recovery**
   - Verifica che il sistema si riprenda da errori
   - Test che richieste valide funzionino dopo errori

7. **Transaction Rollback**
   - Verifica che le transazioni facciano rollback correttamente
   - Test integrità dati dopo errori

8. **Large Payload Handling**
   - Verifica gestione payload grandi
   - Test che il sistema non crashi con input molto grandi

## 📄 Report

Dopo l'esecuzione, viene generato un report completo in `TEST_SECURITY_REPORT.md` che include:
- Summary dei risultati
- Dettagli di ogni test
- Metriche di performance
- Raccomandazioni

## ⚠️ Note Importanti

### Prima del Deploy

1. **Esegui tutti i test** e verifica che passino
2. **Rivedi il report** generato
3. **Correggi eventuali problemi** identificati
4. **Esegui test su ambiente staging** se disponibile

### Test in Produzione

⚠️ **NON eseguire questi test direttamente su produzione!**

I test includono tentativi di SQL injection e altri attacchi che potrebbero:
- Generare log di sicurezza
- Creare confusione nei monitoraggi
- Potenzialmente causare problemi se non gestiti correttamente

### Ambiente di Test Consigliato

- **Locale**: `http://localhost:3000` (sviluppo)
- **Staging**: Ambiente separato identico a produzione
- **Produzione**: Solo test non invasivi (endpoint availability, performance base)

## 🔧 Troubleshooting

### Test Falliscono

1. **Verifica che il server sia in esecuzione**
   ```bash
   npm run dev
   ```

2. **Verifica variabili d'ambiente**
   - `DATABASE_URL` deve essere configurato
   - `NEXT_PUBLIC_SUPABASE_URL` deve essere configurato

3. **Verifica connessione database**
   ```bash
   npx prisma db push
   ```

4. **Controlla i log del server** per errori

### Test Lenti

- Alcuni test (come load test) possono richiedere tempo
- Se i test sono troppo lenti, verifica:
  - Performance database
  - Connessione di rete
  - Risorse server

## 📝 Checklist Pre-Deploy

Prima di fare il deploy su dominio definitivo, verifica:

- [ ] Tutti i test di sicurezza passati (`npm run test:security`)
- [ ] Tutti i test di stabilità passati (`npm run test:stability`)
- [ ] Report generato e rivisto (`TEST_SECURITY_REPORT.md`)
- [ ] Nessun errore critico nei log
- [ ] Build production funzionante (`npm run build`)
- [ ] Environment variables configurate correttamente
- [ ] Database migrations applicate
- [ ] Backup database creato

## 🎯 Metriche Target

| Test | Target |
|------|--------|
| API Response Time | < 1 secondo |
| Database Query Time | < 1 secondo |
| Concurrent Requests Success Rate | ≥ 95% |
| Memory Increase (1000 iterazioni) | < 50MB |
| Endpoint Availability | 100% |

## 📚 Documentazione Correlata

- [TEST_CHECKLIST.md](./TEST_CHECKLIST.md) - Checklist test funzionalità
- [DAFARENUOVO.md](./DAFARENUOVO.md) - Checklist sviluppo
- [TECNICO/CHECKLIST_PRE_HOSTING.md](./TECNICO/CHECKLIST_PRE_HOSTING.md) - Checklist pre-hosting

---

**Ultimo aggiornamento**: 2026-01-11

