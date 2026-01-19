# 📦 Status Implementazione Shippo - Generazione Etichette

**Data**: 2025-01-27  
**Status**: ✅ Backend completato, ⚠️ UI da aggiornare

---

## ✅ Completato

1. **Libreria Shippo** installata (`npm install shippo`)
2. **Utility Shippo** creata (`src/lib/shipping/shippo.ts`)
3. **Schema Database** esteso (`ShippingLabel` model)
4. **API Endpoint** creato (`POST /api/transactions/[id]/verified-escrow/generate-label`)
5. **Guida Setup** creata (`TECNICO/SHIPPO_SETUP_GUIDE.md`)

---

## ⚠️ Prossimi Passi

### 1. **Eseguire Migrazione Database**

```bash
# Genera Prisma Client con nuovo modello
npx prisma generate

# Applica modifiche schema
npx prisma db push
```

⚠️ **IMPORTANTE**: Se il server Next.js è in esecuzione, fermalo prima di eseguire `prisma generate`.

---

### 2. **Configurare Variabili d'Ambiente**

Aggiungi al file `.env`:

```env
# Shippo API Configuration
SHIPPO_API_KEY=shippo_test_xxxxx  # Sostituisci con la tua Test API Key da https://goshippo.com/dashboard/settings/api

# Hub SafeTrade Address (destinazione quando seller spedisce)
SHIPPO_HUB_NAME=SafeTrade Hub
SHIPPO_HUB_STREET1=Via [Indirizzo Hub]
SHIPPO_HUB_CITY=[Città]
SHIPPO_HUB_STATE=
SHIPPO_HUB_ZIP=[CAP]
SHIPPO_HUB_COUNTRY=IT
SHIPPO_HUB_PHONE=[Telefono]
SHIPPO_HUB_EMAIL=hub@safetrade.it
```

**Per ottenere API Key:**
1. Vai su https://goshippo.com
2. Registrati (gratis)
3. Vai su https://goshippo.com/dashboard/settings/api
4. Copia **Test API Key** (per sviluppo)

---

### 3. **Creare Account Shippo** (Se non già fatto)

Vedi `TECNICO/SHIPPO_SETUP_GUIDE.md` per istruzioni complete.

---

### 4. **Aggiornare UI** (Da completare)

**File da modificare:**
- `src/app/(marketplace)/transaction/[id]/verified-escrow/setup/page.tsx`

**Modifiche necessarie:**
- Sostituire form inserimento tracking con form generazione etichetta
- Aggiungere input per peso pacco (kg)
- Aggiungere input dimensioni (opzionale)
- Mostrare PDF etichetta generata
- Bottone "Download PDF Etichetta"
- Bottone "Ho Spedito il Pacco" (conferma spedizione)

---

## 📋 Flusso Attuale vs Nuovo

### **Flusso Attuale (da sostituire):**
```
1. Seller sceglie Verified Escrow
2. Seller va a /transaction/[id]/verified-escrow/setup
3. Seller inserisce tracking number manualmente
4. Admin valida tracking
5. Status diventa AWAITING_HUB_RECEIPT
```

### **Nuovo Flusso (con Shippo):**
```
1. Seller sceglie Verified Escrow
2. Seller va a /transaction/[id]/verified-escrow/generate-label
3. Seller inserisce peso pacco (kg)
4. Sistema genera etichetta automaticamente via Shippo
5. Seller scarica PDF etichetta
6. Seller stampa etichetta e incolla sul pacco
7. Seller clicca "Ho Spedito il Pacco"
8. Admin riceve notifica per validazione
9. Admin valida tracking
10. Status diventa AWAITING_HUB_RECEIPT
```

---

## 🔧 API Endpoint Disponibile

**POST** `/api/transactions/[id]/verified-escrow/generate-label`

**Body:**
```json
{
  "weight": 0.5,           // kg (obbligatorio)
  "weightUnit": "kg",      // opzionale, default "kg"
  "dimensions": {          // opzionale
    "length": 30,          // cm
    "width": 20,
    "height": 5
  },
  "courier": "dhl_express", // opzionale, default primo disponibile
  "service": "STANDARD"     // opzionale
}
```

**Response:**
```json
{
  "success": true,
  "shippingLabel": {
    "id": "...",
    "trackingNumber": "ABC123456789",
    "labelUrl": "https://...",
    "costAmount": 8.50,
    "chargedAmount": 12.75,
    "marginAmount": 4.25,
    "status": "CREATED"
  },
  "transaction": { ... }
}
```

---

## 🧪 Test

Dopo aver configurato le variabili d'ambiente:

1. **Test API Endpoint** (via Postman/curl):
```bash
curl -X POST http://localhost:3000/api/transactions/[id]/verified-escrow/generate-label \
  -H "Content-Type: application/json" \
  -d '{"weight": 0.5}'
```

2. **Test UI** (dopo aggiornamento):
- Login come seller
- Crea transazione Verified Escrow
- Vai a `/transaction/[id]/verified-escrow/generate-label`
- Genera etichetta
- Verifica PDF download

---

## 📊 Costi

**Shippo Piano Gratuito:**
- 30 etichette/mese gratuite
- Oltre 30: $0.07 per etichetta

**Esempio Costi (50 spedizioni/mese):**
- Costo Shippo: 20 × $0.07 = $1.40/mese
- Se guadagni €4 per spedizione: 50 × €4 = €200/mese
- **Profitto netto**: €198.60/mese

---

## ⚠️ Note Importanti

1. **Test API Key** genera etichette di test (non spedibili)
2. **Production API Key** genera etichette reali (spedibili)
3. **Indirizzo Hub** deve essere configurato correttamente
4. **Corrieri disponibili** dipendono dalla tua zona geografica
5. **Conversione valuta** non implementata (usa USD o EUR come currency)

---

## 🔗 Link Utili

- **Shippo Dashboard**: https://goshippo.com/dashboard
- **Shippo API Docs**: https://docs.goshippo.com/
- **Shippo Pricing**: https://goshippo.com/pricing
- **Guida Setup**: `TECNICO/SHIPPO_SETUP_GUIDE.md`

---

**Ultimo aggiornamento**: 2025-01-27

