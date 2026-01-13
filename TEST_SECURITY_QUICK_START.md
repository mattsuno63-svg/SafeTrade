# 🚀 Quick Start - Test Sicurezza SafeTrade

Guida rapida per eseguire i test di sicurezza e stabilità.

## ⚡ Esecuzione Rapida

### 1. Avvia il server di sviluppo

```bash
npm run dev
```

Lascia il server in esecuzione in un terminale.

### 2. Esegui tutti i test (in un altro terminale)

```bash
npm run test:all
```

Questo comando eseguirà:
- ✅ Test di sicurezza (SQL injection, XSS, autenticazione, ecc.)
- ✅ Test di stabilità (performance, carico, error handling)
- ✅ Generazione report completo

### 3. Verifica i risultati

Il report viene salvato in: `TEST_SECURITY_REPORT.md`

## 📊 Cosa Testare

### Test di Sicurezza
- SQL Injection protection
- XSS protection
- Authentication/Authorization
- Input validation
- Error handling

### Test di Stabilità
- API response time
- Database performance
- Concurrent requests
- Memory usage
- Error recovery

## ⚠️ Importante

- **NON eseguire su produzione!** Usa solo su ambiente locale o staging
- Assicurati che il server sia in esecuzione prima di eseguire i test
- I test possono richiedere alcuni minuti per completarsi

## 🔧 Comandi Disponibili

```bash
# Tutti i test
npm run test:all

# Solo test di sicurezza
npm run test:security

# Solo test di stabilità
npm run test:stability
```

## 📝 Output

Dopo l'esecuzione vedrai:
- ✅ Test passati
- ❌ Test falliti (con dettagli)
- 📊 Metriche di performance
- 📄 Report completo in `TEST_SECURITY_REPORT.md`

---

Per maggiori dettagli, vedi [TEST_SECURITY_README.md](./TEST_SECURITY_README.md)

