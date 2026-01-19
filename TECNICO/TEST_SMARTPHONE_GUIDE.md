# 📱 Guida Test con Smartphone - SafeTrade

## 🎯 Strategia Consigliata

**Approccio a 2 fasi:**
1. **Test Rapidi in Locale** → Verifica funzionalità base con smartphone
2. **Test Completi su Vercel** → Ambiente di produzione, test end-to-end

---

## 📋 FASE 1: Test in Locale con Smartphone

### Opzione A: Usare l'IP Locale (PIÙ SEMPLICE) ⭐

#### Requisiti:
- Computer e smartphone sulla **stessa rete WiFi**
- Next.js dev server in esecuzione su `localhost:3000`

#### Passi:

1. **Trova l'IP locale del tuo computer:**
   ```powershell
   # Windows PowerShell
   ipconfig
   ```
   Cerca `IPv4 Address` (es: `192.168.1.100`)

2. **Avvia Next.js in modalità network:**
   ```powershell
   # Nel terminale dove hai già il server
   # Ferma il server (Ctrl+C) e riavvialo con:
   npm run dev -- -H 0.0.0.0
   ```
   
   Oppure modifica `package.json`:
   ```json
   "scripts": {
     "dev": "next dev -H 0.0.0.0"
   }
   ```

3. **Accedi da smartphone:**
   - Apri browser su smartphone
   - Vai a: `http://192.168.1.100:3000` (sostituisci con il tuo IP)
   - ✅ Dovresti vedere il sito!

#### ⚠️ Limitazioni:
- Funziona solo sulla stessa rete WiFi
- Alcune funzionalità potrebbero non funzionare (notifiche push, webhooks)
- HTTPS non disponibile (alcuni servizi richiedono HTTPS)

---

### Opzione B: Usare ngrok (PIÙ COMPLETO) 🌐

#### Requisiti:
- Account ngrok (gratuito): https://ngrok.com/
- ngrok installato sul computer

#### Passi:

1. **Installa ngrok:**
   ```powershell
   # Windows (con Chocolatey)
   choco install ngrok
   
   # Oppure scarica da: https://ngrok.com/download
   ```

2. **Autentica ngrok:**
   ```powershell
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```
   (Token disponibile su https://dashboard.ngrok.com/get-started/your-authtoken)

3. **Avvia tunnel:**
   ```powershell
   # In un nuovo terminale
   ngrok http 3000
   ```

4. **Copia l'URL HTTPS:**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3000
   ```

5. **Accedi da smartphone:**
   - Apri browser su smartphone (anche da rete diversa!)
   - Vai a: `https://abc123.ngrok.io`
   - ✅ Funziona da qualsiasi rete!

#### ✅ Vantaggi:
- Funziona da qualsiasi rete (anche mobile data)
- HTTPS incluso
- URL pubblico temporaneo
- Supporta webhooks

#### ⚠️ Limitazioni:
- URL cambia ad ogni avvio (gratuito)
- Rate limiting su piano gratuito
- Alcune funzionalità potrebbero richiedere configurazione aggiuntiva

---

## 📋 FASE 2: Test su Vercel (CONSIGLIATO PER TEST COMPLETI)

### Perché Vercel è migliore per test finali:
- ✅ Ambiente identico alla produzione
- ✅ HTTPS automatico
- ✅ URL stabile
- ✅ Performance reali
- ✅ Tutte le funzionalità (webhooks, notifiche, etc.)

### Passi:

1. **Push su GitHub:**
   ```powershell
   git add .
   git commit -m "feat: SafeVault FASE 2 - Depositi utente"
   git push origin main
   ```

2. **Vercel deploy automatico:**
   - Se hai già configurato Vercel, il deploy parte automaticamente
   - Altrimenti: https://vercel.com/new → Importa repository

3. **Accedi da smartphone:**
   - URL: `https://tuo-progetto.vercel.app`
   - ✅ Test completo in ambiente reale!

---

## 🧪 Checklist Test Smartphone

### Test Base:
- [ ] Login/Logout funziona
- [ ] Navigazione tra pagine
- [ ] Form di creazione listing
- [ ] Upload immagini
- [ ] Visualizzazione marketplace

### Test SafeVault:
- [ ] Accesso `/sell` → 3 opzioni visibili
- [ ] Click "Vendi in Contovendita" → `/vault/deposit/new`
- [ ] Form multi-step funziona
- [ ] Upload immagini per carte
- [ ] Validazione prezzo minimo 40€
- [ ] Creazione deposito
- [ ] Lista depositi (`/vault/deposits`)
- [ ] Dettaglio deposito (`/vault/deposits/[id]`)
- [ ] Modifica deposito (solo CREATED)
- [ ] Aggiunta tracking
- [ ] Eliminazione deposito (solo CREATED)

### Test Responsive:
- [ ] Layout si adatta allo schermo
- [ ] Form sono utilizzabili
- [ ] Bottoni sono cliccabili
- [ ] Immagini si caricano correttamente
- [ ] Testi sono leggibili

---

## 🛠️ Troubleshooting

### Problema: "Connection refused" su IP locale
**Soluzione:**
- Verifica firewall Windows
- Assicurati che Next.js sia in ascolto su `0.0.0.0`
- Controlla che smartphone e PC siano sulla stessa rete

### Problema: ngrok non funziona
**Soluzione:**
- Verifica autenticazione: `ngrok config check`
- Controlla che porta 3000 sia libera
- Riavvia ngrok

### Problema: Vercel deploy fallisce
**Soluzione:**
- Controlla build logs su Vercel dashboard
- Verifica variabili ambiente
- Controlla errori di linting/TypeScript

---

## 📝 Note Importanti

1. **Variabili Ambiente:**
   - Per test locali: usa `.env.local`
   - Per Vercel: configura su dashboard Vercel → Settings → Environment Variables

2. **Database:**
   - Test locali: usa database locale o Supabase
   - Vercel: usa lo stesso database (Supabase) o configura variabile `DATABASE_URL`

3. **Storage:**
   - Assicurati che Supabase Storage sia accessibile da rete esterna
   - Configura CORS se necessario

4. **Performance:**
   - Test locali possono essere più lenti
   - Vercel offre performance migliori

---

## 🎯 Raccomandazione Finale

**Per test rapidi durante sviluppo:**
→ Usa **IP locale** (Opzione A)

**Per test completi prima del deploy:**
→ Usa **Vercel** (FASE 2)

**Per test con webhooks/notifiche:**
→ Usa **ngrok** (Opzione B) o **Vercel**

---

## 🚀 Quick Start - Test Locale

```powershell
# 1. Trova IP
ipconfig | findstr IPv4

# 2. Avvia server (se non già avviato)
npm run dev -- -H 0.0.0.0

# 3. Su smartphone: http://TUO_IP:3000
```

---

## 🔗 Link Utili

- **ngrok:** https://ngrok.com/
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Next.js Network Mode:** https://nextjs.org/docs/api-reference/cli#development

---

**Buon testing! 🎉**

