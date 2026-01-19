# 📦 Guida Setup Sendcloud per SafeTrade

**Data**: 2025-01-27  
**Provider**: Sendcloud (specializzato in Europa/Italia)

---

## 🎯 Obiettivo

Sostituire Shippo con Sendcloud per generazione etichette spedizione Italia → Italia.

---

## 📋 Setup Sendcloud Account

### **Passo 1: Creare Account Sendcloud**

1. Vai su https://www.sendcloud.com/
2. Clicca "Start for Free" o "Sign Up"
3. Registrati con la tua email
4. Conferma email

### **Passo 2: Ottenere API Keys**

1. **Vai al Dashboard Sendcloud**: https://panel.sendcloud.sc/
2. **Vai su Settings → API**: Cerca "API" o "API Keys" nelle impostazioni
3. **Copia Public Key e Secret Key**:
   - **Public Key**: `xxxxx` (visibile)
   - **Secret Key**: `xxxxx` (copia subito, mostrata solo una volta!)

⚠️ **IMPORTANTE**: Salva le chiavi subito! La Secret Key viene mostrata solo una volta.

---

## 🔧 Configurazione Variabili d'Ambiente

Aggiungi al file `.env`:

```env
# Sendcloud API Configuration
SENDCLOUD_API_KEY=xxxxx        # Public Key
SENDCLOUD_API_SECRET=xxxxx     # Secret Key

# Hub SafeTrade Address (destinazione quando seller spedisce)
# IMPORTANTE: Via e numero civico devono essere separati!
# Se l'indirizzo è "Via Tindari 15", usa:
#   SENDCLOUD_HUB_STREET1=Via Tindari
#   (il numero civico verrà estratto automaticamente)
SENDCLOUD_HUB_NAME=SafeTrade Hub
SENDCLOUD_HUB_STREET1=Via Tindari
SENDCLOUD_HUB_CITY=Ragusa
SENDCLOUD_HUB_STATE=Sicilia
SENDCLOUD_HUB_ZIP=97100
SENDCLOUD_HUB_COUNTRY=IT
SENDCLOUD_HUB_PHONE=  # Opzionale
SENDCLOUD_HUB_EMAIL=hub@safetrade.it
```

---

## 🚚 Configurazione Carrier Italiani

### **Passo 3: Abilita Carrier Italiani (CRITICO!)**

⚠️ **IMPORTANTE**: Senza almeno un carrier attivo, Sendcloud NON può generare etichette!

1. **Vai su Shipping → Carriers** nel dashboard Sendcloud
2. **Cerca e attiva almeno UN carrier italiano**:
   - **Poste Italiane Delivery** (consigliato per iniziare)
   - **GLS IT** (richiede piano Lite o superiore)
   - **InPost IT** (richiede approvazione)
   - **DHL Express** (richiede approvazione)

3. **Per attivare un carrier**:
   - Clicca sul **toggle switch** per attivarlo
   - Se vedi "Request in review", attendi l'approvazione di Sendcloud
   - Se vedi "upgrade to Lite or above plan", devi passare a un piano superiore

4. **Verifica che il carrier sia ATTIVO**:
   - Il toggle deve essere **VERDE/ON**
   - Non deve dire "Could not load data"
   - Non deve dire "Not offered"

5. **Se hai contratto diretto con un carrier**:
   - Vai su "My contracts" → "Add my own contract"
   - Segui le istruzioni per connettere il tuo account corriere

---

## ✅ Verifica Setup

Dopo aver configurato le variabili d'ambiente:

1. **Riavvia il server Next.js**:
```bash
# Ferma il server (Ctrl+C)
npm run dev
```

2. **Testa generazione etichetta**:
   - Vai su `/transaction/[id]/verified-escrow/generate-label`
   - Inserisci peso del pacco
   - Clicca "Genera Etichetta"

---

## 📝 Note Importanti

### **Piano Gratuito vs Piano a Pagamento**

**Piano Gratuito**:
- ✅ Perfetto per test/sviluppo
- ⚠️ Limitato (controlla i limiti sul sito Sendcloud)
- ❌ Potrebbe non supportare contratti diretti con carrier

**Piano a Pagamento**:
- ✅ Supporta contratti diretti con carrier
- ✅ Limiti più alti
- ⚠️ Costo mensile (~€20-50/mese)

---

## 🔗 Link Utili

- **Dashboard Sendcloud**: https://panel.sendcloud.sc/
- **Documentazione API**: https://docs.sendcloud.com/
- **Support**: https://support.sendcloud.com/

---

## 🆘 Problemi Comuni

### **"API Key non valida"**
- Verifica di aver copiato Public Key e Secret Key correttamente
- Controlla che non ci siano spazi extra nel file `.env`
- Riavvia il server dopo aver modificato `.env`

### **"Nessun carrier disponibile"**
- Verifica che i carrier italiani siano abilitati in Settings → Carriers
- Controlla che l'indirizzo mittente sia in Italia
- Assicurati che il piano supporti i carrier selezionati

---

**Ultimo aggiornamento**: 2025-01-27

