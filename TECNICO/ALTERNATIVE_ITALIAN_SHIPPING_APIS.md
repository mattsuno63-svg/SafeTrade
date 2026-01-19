# 🇮🇹 Alternative a Shippo per Spedizioni Italia → Italia

**Data**: 2025-01-27  
**Problema**: Shippo non supporta spedizioni Italia → Italia (tutti i carrier disponibili non coprono questa rotta)

---

## 📊 Confronto Alternative

### **1. Sendcloud (🇪🇺 Specializzata Europa/Italia)** ⭐ RACCOMANDATO

**✅ Vantaggi:**
- Specializzata in Europa e Italia
- Supporta Poste Italiane, SDA, DHL Italia, GLS, BRT, ecc.
- API completa e ben documentata
- Supporto carrier italiani nativo
- Interfaccia user-friendly

**❌ Svantaggi:**
- Piano gratuito limitato
- Pricing dopo piano gratuito

**💰 Pricing:**
- Piano gratuito: limitato (controlla sito)
- Piano a pagamento: ~€20-50/mese

**🔗 Link:**
- Website: https://www.sendcloud.com/
- API Docs: https://docs.sendcloud.com/

---

### **2. ShippyPro (🇮🇹 Made in Italy)**

**✅ Vantaggi:**
- Specializzata in Italia
- Supporta Poste Italiane, SDA, DHL Italia, GLS, ecc.
- API completa e ben documentata
- Piano gratuito disponibile (limitato ma funzionale)

**❌ Svantaggi:**
- Piano gratuito molto limitato
- Pricing dopo il piano gratuito

**💰 Pricing:**
- Piano gratuito: limitato
- Piano a pagamento: ~€20-50/mese

**🔗 Link:**
- Website: https://www.shippypro.com/
- API Docs: https://www.shippypro.com/en/developers/

---

### **3. ShipEngine (Internazionale con API Robusta)**

**✅ Vantaggi:**
- API molto robusta e ben documentata
- Supporta Poste Italiane nativamente
- Spedizioni domestiche e internazionali Italia
- Buon supporto tecnico

**❌ Svantaggi:**
- Meno specializzata in Italia rispetto a Sendcloud/ShippyPro
- Pricing dopo piano gratuito

**💰 Pricing:**
- Piano gratuito: limitato (controlla sito)
- Piano a pagamento: variabile

**🔗 Link:**
- Website: https://www.shipengine.com/
- API Docs: https://www.shipengine.com/docs/
- Poste Italiane: https://www.shipengine.com/docs/carriers/poste-italiane/

---

### **4. EasyShip (Internazionale)**

**✅ Vantaggi:**
- Supporta Italia
- API gratuita per test
- Molti carrier italiani supportati

**❌ Svantaggi:**
- Meno specializzata in Italia rispetto a ShippyPro
- Pricing dopo piano gratuito

**💰 Pricing:**
- Piano gratuito: limitato
- Piano a pagamento: variabile

**🔗 Link:**
- Website: https://www.easyship.com/
- API Docs: https://developers.easyship.com/

---

### **5. Poste Italiane API Diretta**

**✅ Vantaggi:**
- Ufficiale
- Supporto nativo per tutte le spedizioni Poste Italiane
- Costi diretti Poste (senza intermediari)

**❌ Svantaggi:**
- API complessa da configurare
- Richiede account business con Poste Italiane
- Documentazione meno chiara
- Solo Poste Italiane (non altri carrier)

**💰 Pricing:**
- Costi spedizione diretti Poste Italiane
- Potrebbe richiedere setup business

**🔗 Link:**
- Website: https://www.poste.it/
- API: Richiede contatto Poste Italiane per accesso

---

### **6. ShipStation (Internazionale)**

**✅ Vantaggi:**
- Supporta alcuni carrier italiani
- API robusta
- Piano gratuito per test

**❌ Svantaggi:**
- Meno specializzata in Italia
- Limiti piano gratuito

**💰 Pricing:**
- Piano gratuito: 50 spedizioni/mese
- Piano a pagamento: $9.99+/mese

**🔗 Link:**
- Website: https://www.shipstation.com/
- API Docs: https://www.shipstation.com/docs/api/

---

## 🎯 Raccomandazione

### **Per Test/Sviluppo: Sendcloud o ShipEngine**

**Sendcloud** ⭐ se vuoi la soluzione più specializzata in Italia/Europa con ottimo supporto carrier italiani.  
**ShipEngine** se preferisci una API molto robusta con buona documentazione.

### **Per Produzione: Sendcloud o ShippyPro**

**Sendcloud** è la scelta migliore per produzione in Italia perché:
- Specializzata in Europa/Italia
- Supporto nativo per Poste Italiane, SDA, GLS, ecc.
- API completa e ben documentata
- Interfaccia user-friendly

**ShippyPro** (Made in Italy) è un'ottima alternativa perché:
- Made in Italy (supporto in italiano)
- Specializzata in carrier italiani
- Integrazione nativa con Poste Italiane, SDA, ecc.

---

## 🔄 Come Sostituire Shippo con Sendcloud/ShippyPro/ShipEngine

### **Passo 1: Scegli Provider**

- **Sendcloud**: Migliore per Italia/Europa ⭐
- **ShippyPro**: Made in Italy
- **ShipEngine**: API molto robusta

### **Passo 2: Setup Account**

1. Vai al sito del provider scelto
2. Registrati per account gratuito
3. Ottieni API Key da dashboard

### **Passo 3: Sostituisci Codice Shippo**

Il codice è già strutturato con `src/lib/shipping/shippo.ts`, quindi possiamo:
- Creare `src/lib/shipping/[provider].ts` (es. `sendcloud.ts` o `shippypro.ts`)
- Mantenere stessa interfaccia
- Sostituire chiamate Shippo con il nuovo provider

---

## 📝 Prossimi Passi

Se vuoi procedere con ShippyPro:
1. Setup account ShippyPro
2. Sostituisco codice Shippo con ShippyPro
3. Mantengo stessa struttura/interfaccia
4. Test generazione etichette

---

**Ultimo aggiornamento**: 2025-01-27

