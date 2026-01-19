# 🇮🇹 Come Aggiungere Carrier Italiani in Shippo

**Data**: 2025-01-27  
**Problema**: Non vedi carrier italiani (Poste Italiane, DHL Italia) nella dashboard Shippo

---

## 🔍 Passo 1: Cerca Carrier Italiani

1. **Vai alla Dashboard Shippo**: https://apps.goshippo.com
2. **Clicca "Settings"** (Impostazioni) in alto a destra (icona ingranaggio)
3. **Nel menu laterale, clicca "Carriers"** (sotto "Shipping")
4. **Cerca nella sezione "Europe"**:
   - Scrolla verso il basso
   - Cerca "**Poste Italiane**" o "**Italy**"
   - Cerca anche "**DHL Italia**" o "**DHL Italy**"

---

## ➕ Passo 2: Aggiungi Carrier Italiano (se non lo trovi)

Se NON vedi carrier italiani:

1. **Clicca il pulsante verde "+ Connect Carrier Account"** (in alto a destra nella pagina Carriers)
2. **Nella finestra modale che si apre**:
   - Cerca "**Poste Italiane**" nella barra di ricerca
   - Oppure cerca "**Italy**" per vedere tutti i carrier italiani
   - Oppure cerca "**DHL**" e verifica se c'è "DHL Italia" o "DHL Italy"

3. **Se trovi Poste Italiane o un carrier italiano**:
   - Clicca su di esso
   - Segui le istruzioni per connettere il tuo account
   - **Per modalità TEST**: Potresti non aver bisogno di credenziali reali
   - **Per modalità PRODUCTION**: Dovrai fornire credenziali API dal tuo account corriere

---

## ⚠️ Problema Comune: Modalità Test

**IMPORTANTE**: Se stai usando **Test API Key** (`shippo_test_...`), alcuni carrier locali potrebbero **non essere disponibili** in modalità test.

### Soluzione 1: Usa Carrier Europei Esistenti
Alcuni carrier europei già attivi potrebbero coprire l'Italia:
- **DHL Express** (spesso copre Italia)
- **DPD** (può avere servizio Italia)
- **FedEx** (può coprire Italia)

### Soluzione 2: Passa a Live API Key (temporaneamente)
1. Vai su **Settings → API**
2. Usa **Live API Key** per vedere se compaiono più carrier
3. **ATTENZIONE**: Con Live API Key generi etichette reali (spedibili) - usa solo per test!

---

## 🧪 Test: Verifica se i Carrier Funzionano

Dopo aver attivato/aggiunto un carrier italiano:

1. **Riprova a generare un'etichetta** dalla tua applicazione
2. **Controlla i log del server** per vedere quale carrier viene usato
3. Se funziona: ✅ Ottimo!
4. Se ancora errore: Controlla i messaggi di errore nei log

---

## 📞 Supporto Shippo

Se non riesci a trovare/aggiungere carrier italiani:

1. **Contatta Support Shippo**: https://support.goshippo.com/
2. **Chiedi**: "Come attivare Poste Italiane per spedizioni Italia → Italia in modalità test?"
3. **Menziona**: Che stai usando Test API Key e hai bisogno di carrier italiani per sviluppo

---

## ✅ Verifica Finale

Dopo aver aggiunto/attivato un carrier italiano:

✅ Vedi "Poste Italiane" o un carrier italiano nella lista Carriers  
✅ Il toggle è **attivo/ON** (verde)  
✅ Provi a generare un'etichetta → Funziona!

---

**Ultimo aggiornamento**: 2025-01-27

