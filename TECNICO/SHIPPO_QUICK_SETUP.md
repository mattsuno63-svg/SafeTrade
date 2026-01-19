# 🚀 Guida Rapida Setup Shippo - Solo API Key

**Data**: 2025-01-27  
**Per**: Generare etichette di spedizione via API (non serve collegare e-commerce)

---

## ⚡ Quick Setup (2 minuti)

### **PASSO 1: Salta l'Onboarding**

La pagina "Add your orders" che vedi è per chi vuole **sincronizzare ordini da Shopify/Amazon/eBay**.

**Per noi NON serve!** Stiamo usando solo l'API per generare etichette.

**Cosa fare:**
1. Clicca **"Skip"** o **"Next"** (puoi saltare questa fase)
2. Oppure clicca **"X"** in alto a destra per chiudere l'onboarding

---

### **PASSO 2: Vai alle Impostazioni API**

Dopo aver saltato l'onboarding:

1. Clicca sul tuo **profilo** in alto a destra
2. Vai su **"Settings"** (Impostazioni)
3. Nel menu laterale, clicca su **"API"** o **"API Keys"**

**URL diretto**: https://apps.goshippo.com/settings/api

---

### **PASSO 3: Ottieni Test API Key**

Nella pagina "API":

1. Trova la sezione **"API Keys"**
2. Vedrai due chiavi:
   - **Test API Key**: `shippo_test_xxxxx` ← **USA QUESTA per ora!**
   - **Live API Key**: `shippo_live_xxxxx` (per produzione)

3. Clicca **"Copy"** accanto a **Test API Key**

⚠️ **IMPORTANTE**: 
- **Test API Key** genera etichette di test (non spedibili) - perfetta per sviluppo
- **Live API Key** genera etichette reali (spedibili) - usa solo quando sei pronto per produzione

---

### **PASSO 4: Configura Variabili d'Ambiente**

Aggiungi al file `.env`:

```env
# Shippo API Configuration
SHIPPO_API_KEY=shippo_test_xxxxx  # Incolla qui la Test API Key che hai copiato

# Hub SafeTrade Address (destinazione quando seller spedisce)
SHIPPO_HUB_NAME=SafeTrade Hub
SHIPPO_HUB_STREET1=Via [Indirizzo Hub]  # Sostituisci con indirizzo reale
SHIPPO_HUB_CITY=[Città]                 # Sostituisci con città reale
SHIPPO_HUB_STATE=
SHIPPO_HUB_ZIP=[CAP]                    # Sostituisci con CAP reale
SHIPPO_HUB_COUNTRY=IT
SHIPPO_HUB_PHONE=[Telefono]             # Opzionale
SHIPPO_HUB_EMAIL=hub@safetrade.it
```

**Sostituisci i valori tra `[...]` con i dati reali dell'hub SafeTrade.**

---

### **PASSO 5: Configura Corrieri (Opzionale - per Test)**

Per generare etichette di test:

1. Vai su **"Settings"** → **"Carriers"** o **"Shipping Providers"**
2. Shippo usa i suoi account corrieri di default per test
3. Non serve configurare account propri per test (solo per produzione)

---

## ✅ Verifica Setup

Dopo aver configurato le variabili d'ambiente:

1. **Riavvia il server Next.js**:
```bash
# Ferma il server (Ctrl+C)
npm run dev
```

2. **Testa API** (opzionale):
```bash
curl -X POST http://localhost:3000/api/transactions/[id]/verified-escrow/generate-label \
  -H "Content-Type: application/json" \
  -d '{"weight": 0.5}'
```

---

## 📋 Note Importanti

### **Test Mode vs Production Mode**

**Test Mode** (usa `shippo_test_xxxxx`):
- ✅ Genera etichette di test (non spedibili)
- ✅ Nessun costo reale
- ✅ Perfetto per sviluppo/testing
- ❌ Non puoi spedire pacchi reali

**Production Mode** (usa `shippo_live_xxxxx`):
- ✅ Genera etichette reali (spedibili)
- ⚠️ Addebita costi reali corriere
- ⚠️ Usa solo quando sei pronto per produzione

### **Limiti Piano Gratuito**

- **30 etichette/mese gratuite**
- Oltre 30: **$0.07 per etichetta**
- Nessun costo mensile fisso

---

## 🆘 Problemi Comuni

### **"API Key non valida"**
- Verifica di aver copiato l'intera chiave (inizia con `shippo_test_` o `shippo_live_`)
- Controlla che non ci siano spazi extra nel file `.env`
- Riavvia il server dopo aver modificato `.env`

### **"Indirizzo hub non configurato"**
- Verifica che tutte le variabili `SHIPPO_HUB_*` siano presenti nel `.env`
- Controlla che `SHIPPO_HUB_STREET1`, `SHIPPO_HUB_CITY`, `SHIPPO_HUB_ZIP` non siano vuoti

### **"Nessuna tariffa disponibile"**
- Shippo potrebbe non avere corrieri disponibili per la tua zona
- Prova a configurare un corriere specifico (DHL Express, UPS, FedEx)
- Verifica che gli indirizzi siano validi

---

## 🔗 Link Utili

- **Dashboard Shippo**: https://apps.goshippo.com
- **Settings API**: https://apps.goshippo.com/settings/api
- **Documentazione API**: https://docs.goshippo.com/
- **Support**: https://support.goshippo.com/

---

**Ultimo aggiornamento**: 2025-01-27

