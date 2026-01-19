# 📦 Guida Setup Shippo - Generazione Etichette Spedizione

**Data**: 2025-01-27  
**Provider**: Shippo (30 etichette/mese gratuite)

---

## 🎯 Obiettivo

Implementare generazione automatica etichette di spedizione per Verified Escrow usando Shippo API.

---

## 📋 Setup Shippo Account

### Step 1: Creare Account Shippo

1. Vai su https://goshippo.com
2. Clicca "Start for Free"
3. Registrati con la tua email
4. Conferma email

### Step 2: Ottenere API Keys

1. Vai su https://goshippo.com/dashboard/settings/api
2. Trova "API Keys" section
3. Copia **Test API Key** (per sviluppo)
4. **Production API Key** (per produzione - usa quando sei pronto)

⚠️ **IMPORTANTE**: 
- Test API Key genera etichette di test (non spedibili)
- Production API Key genera etichette reali (spedibili)

### Step 3: Configurare Variabili d'Ambiente

Aggiungi al file `.env`:

```env
# Shippo API Configuration
SHIPPO_API_KEY=shippo_test_xxxxx  # Sostituisci con la tua Test API Key
SHIPPO_API_BASE_URL=https://api.goshippo.com

# Hub SafeTrade Address (mittente)
SHIPPO_HUB_NAME=SafeTrade Hub
SHIPPO_HUB_STREET1=Via [Indirizzo Hub]
SHIPPO_HUB_CITY=[Città]
SHIPPO_HUB_STATE=
SHIPPO_HUB_ZIP=[CAP]
SHIPPO_HUB_COUNTRY=IT
SHIPPO_HUB_PHONE=[Telefono]
SHIPPO_HUB_EMAIL=hub@safetrade.it
```

⚠️ **NOTA**: Sostituisci i valori `[Indirizzo Hub]`, `[Città]`, `[CAP]`, `[Telefono]` con i dati reali dell'hub SafeTrade.

---

## 🔧 Setup Corrieri in Shippo

### Corrieri Supportati per Italia

Shippo supporta questi corrieri italiani:
- **DHL Express** (internazionale)
- **UPS** (internazionale)
- **FedEx** (internazionale)
- **Poste Italiane** (tramite provider partner)

⚠️ **NOTA**: Per Poste Italiane potresti dover configurare un provider partner o usare un corriere alternativo.

### Configurazione Corriere Preferito

1. Vai su https://goshippo.com/dashboard/carriers
2. Scegli un corriere (es. DHL Express)
3. Segui setup wizard
4. Configura account corriere (se necessario)

---

## 📊 Limiti Piano Gratuito

- **30 etichette/mese** gratuite
- Oltre 30: **$0.07 per etichetta**
- Nessun costo mensile fisso
- Tutte le funzionalità API incluse

---

## 🧪 Test Mode vs Production Mode

### Test Mode (Sviluppo)
- Usa `shippo_test_xxxxx` API key
- Genera etichette di test (non spedibili)
- Non addebita costi reali
- Perfetto per testing

### Production Mode (Produzione)
- Usa `shippo_live_xxxxx` API key
- Genera etichette reali (spedibili)
- Addebita costi reali corriere
- Solo quando sei pronto

---

## 🚀 Prossimi Passi

Dopo setup account:
1. ✅ Aggiungi API key a `.env`
2. ✅ Configura indirizzo hub
3. ✅ Scegli corriere preferito
4. ✅ Testa generazione etichetta

---

**Ultimo aggiornamento**: 2025-01-27

