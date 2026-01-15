# 📋 GUIDA PASSO-PASSO: FIX #4 - Migration Production

**Priorità**: 🔴 CRITICA  
**Tempo stimato**: 10-15 minuti  
**Difficoltà**: Media (richiede accesso a Vercel/Database)

---

## 🎯 Obiettivo

Applicare le migrazioni del database Prisma al database di **produzione** per creare le tabelle mancanti che causano errori 500.

---

## 📋 Tabelle da Creare

Le seguenti tabelle devono essere create nel database di produzione:

1. ✅ `Dispute` - Sistema di gestione dispute
2. ✅ `DisputeMessage` - Messaggi nelle dispute
3. ✅ `AdminNotification` - Notifiche per admin
4. ✅ `PendingRelease` - Rilascio fondi in attesa di approvazione
5. ✅ `FinancialAuditLog` - Log audit per operazioni finanziarie

**Nota**: Potrebbero esserci anche altre tabelle aggiunte recentemente (EscrowSession, EscrowPayment, VaultCase, etc.)

---

## 🔍 STEP 1: Verifica Stato Attuale

### 1.1 Controlla se le tabelle esistono già

**Opzione A: Tramite Vercel Dashboard**
1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto SafeTrade
3. Vai su **Settings** → **Environment Variables**
4. Copia il valore di `DATABASE_URL` (ti servirà dopo)

**Opzione B: Tramite Prisma Studio (Locale)**
```bash
# Assicurati di avere DATABASE_URL di produzione nel .env
npx prisma studio
```
Apri il browser e verifica se le tabelle `Dispute`, `AdminNotification`, `PendingRelease` esistono.

**Opzione C: Tramite Query SQL (se hai accesso diretto al DB)**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'Dispute', 
  'DisputeMessage', 
  'AdminNotification', 
  'PendingRelease',
  'FinancialAuditLog'
);
```

---

## 🚀 STEP 2: Prepara l'Ambiente Locale

### 2.1 Installa dipendenze (se necessario)
```bash
npm install
```

### 2.2 Verifica che Prisma sia configurato
```bash
npx prisma --version
# Dovrebbe mostrare la versione di Prisma (es. 5.22.0)
```

### 2.3 Genera Prisma Client (se necessario)
```bash
npx prisma generate
```

---

## 📦 STEP 3: Crea le Migrazioni (Se Non Esistono)

### 3.1 Verifica se esistono migrazioni
```bash
ls prisma/migrations/
```

Se la cartella `migrations` è vuota o contiene solo file vecchi, devi creare una nuova migrazione:

### 3.2 Crea una nuova migrazione
```bash
npx prisma migrate dev --name add_missing_tables
```

**⚠️ ATTENZIONE**: Questo comando:
- Confronta lo schema Prisma con il database locale
- Crea un file di migrazione SQL
- Applica la migrazione al database locale

**✅ Risultato atteso**: Dovresti vedere un messaggio tipo:
```
✔ Created migration: 20250127_add_missing_tables
✔ Applied migration: 20250127_add_missing_tables
```

### 3.3 Verifica il file di migrazione creato
```bash
ls prisma/migrations/
# Dovresti vedere una nuova cartella con il nome della migrazione
```

---

## 🌐 STEP 4: Applica Migrazione su Produzione

### **OPZIONE A: Tramite Vercel CLI (CONSIGLIATO)** ⭐

#### 4.1 Installa Vercel CLI (se non l'hai già)
```bash
npm install -g vercel
```

#### 4.2 Login su Vercel
```bash
vercel login
```

#### 4.3 Collega il progetto (se non già collegato)
```bash
vercel link
```

#### 4.4 Scarica le variabili ambiente di produzione
```bash
vercel env pull .env.production
```

Questo crea un file `.env.production` con le variabili di produzione.

#### 4.5 Applica la migrazione usando DATABASE_URL di produzione
```bash
# Windows PowerShell
$env:DATABASE_URL="$(Get-Content .env.production | Select-String 'DATABASE_URL' | ForEach-Object { $_.Line.Split('=')[1] })"
npx prisma migrate deploy

# Windows CMD
set DATABASE_URL=<valore_da_.env.production>
npx prisma migrate deploy

# Linux/Mac
export DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2)
npx prisma migrate deploy
```

**✅ Risultato atteso**:
```
✔ Applied migration: 20250127_add_missing_tables
```

---

### **OPZIONE B: Tramite Vercel Dashboard (Build Command)**

#### 4.1 Vai su Vercel Dashboard
1. Apri il progetto SafeTrade
2. Vai su **Settings** → **General**
3. Scorri fino a **Build & Development Settings**

#### 4.2 Aggiungi Build Command
Nel campo **Build Command**, aggiungi:
```bash
prisma generate && prisma migrate deploy && next build
```

**Oppure** modifica `package.json`:
```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

#### 4.3 Trigger un nuovo deploy
1. Vai su **Deployments**
2. Clicca sui **3 puntini** dell'ultimo deployment
3. Seleziona **Redeploy**
4. Seleziona **Use existing Build Cache** = NO (per forzare la migrazione)

**⚠️ ATTENZIONE**: Questo applicherà la migrazione ad ogni deploy. Assicurati che sia quello che vuoi.

---

### **OPZIONE C: Tramite Database Direct (Se Hai Accesso)**

#### 4.1 Connettiti al database di produzione
Usa un client SQL (pgAdmin, DBeaver, etc.) o la CLI di PostgreSQL.

#### 4.2 Esegui manualmente il file SQL di migrazione
1. Apri il file di migrazione creato:
   ```
   prisma/migrations/YYYYMMDDHHMMSS_add_missing_tables/migration.sql
   ```
2. Copia tutto il contenuto SQL
3. Esegui lo script nel database di produzione

**⚠️ ATTENZIONE**: Verifica sempre il contenuto dello script prima di eseguirlo!

---

## ✅ STEP 5: Verifica che la Migrazione sia Applicata

### 5.1 Verifica tramite Prisma Studio (con DATABASE_URL di produzione)
```bash
# Windows PowerShell
$env:DATABASE_URL="<DATABASE_URL_di_produzione>"
npx prisma studio

# Linux/Mac
DATABASE_URL="<DATABASE_URL_di_produzione>" npx prisma studio
```

Apri il browser e verifica che le tabelle esistano:
- ✅ `Dispute`
- ✅ `DisputeMessage`
- ✅ `AdminNotification`
- ✅ `PendingRelease`
- ✅ `FinancialAuditLog`

### 5.2 Verifica tramite Query SQL
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'Dispute', 
  'DisputeMessage', 
  'AdminNotification', 
  'PendingRelease',
  'FinancialAuditLog'
)
ORDER BY table_name;
```

**✅ Risultato atteso**: 5 righe, una per ogni tabella.

### 5.3 Testa le funzionalità
1. Vai su `https://safe-trade-dusky.vercel.app/admin/disputes`
   - ✅ Dovrebbe caricare senza errori 500
2. Vai su `https://safe-trade-dusky.vercel.app/admin/pending-releases`
   - ✅ Dovrebbe caricare senza errori 500
3. Crea una transazione e verifica che funzioni
   - ✅ Dovrebbe creare `EscrowPayment` e `EscrowSession` correttamente

---

## 🔧 STEP 6: Risoluzione Problemi

### Problema: "Migration already applied"
**Causa**: La migrazione è già stata applicata in precedenza.

**Soluzione**:
```bash
# Verifica lo stato delle migrazioni
npx prisma migrate status

# Se tutto è OK, vedrai:
# ✅ All migrations have been applied
```

### Problema: "Database schema is not in sync"
**Causa**: Lo schema Prisma non corrisponde al database.

**Soluzione**:
```bash
# Sincronizza lo schema (ATTENZIONE: può modificare il database)
npx prisma db push

# Oppure crea una nuova migrazione
npx prisma migrate dev --name sync_schema
```

### Problema: "Connection refused" o "Timeout"
**Causa**: `DATABASE_URL` non è corretto o il database non è raggiungibile.

**Soluzione**:
1. Verifica che `DATABASE_URL` sia corretto
2. Verifica che il database sia accessibile (firewall, IP whitelist)
3. Se usi Supabase, verifica che il pooler sia attivo

### Problema: "Table already exists"
**Causa**: Alcune tabelle esistono già, altre no.

**Soluzione**:
```bash
# Usa db push invece di migrate deploy (più permissivo)
npx prisma db push --accept-data-loss
```

**⚠️ ATTENZIONE**: `--accept-data-loss` può eliminare dati. Usa solo se sei sicuro!

---

## 📝 STEP 7: Documenta la Migrazione

Dopo aver completato la migrazione, aggiorna:

1. ✅ `MIGRATION_COMPLETE.md` - Aggiungi data e tabelle create
2. ✅ `TODO_UNIFICATO.md` - Segna FIX #4 come completato
3. ✅ Commit e push delle modifiche (se hai creato nuove migrazioni)

```bash
git add prisma/migrations/
git commit -m "feat: aggiunta migrazione per tabelle mancanti in produzione"
git push
```

---

## 🎯 Checklist Finale

Prima di considerare completato FIX #4, verifica:

- [ ] Migrazione creata e salvata in `prisma/migrations/`
- [ ] Migrazione applicata al database di produzione
- [ ] Tutte le 5 tabelle esistono nel database di produzione
- [ ] `/admin/disputes` funziona senza errori 500
- [ ] `/admin/pending-releases` funziona senza errori 500
- [ ] Creazione transazione funziona correttamente
- [ ] Nessun errore in console del browser
- [ ] Documentazione aggiornata

---

## 🚨 IMPORTANTE: Backup Prima della Migrazione

**⚠️ SEMPRE fai un backup del database prima di applicare migrazioni in produzione!**

### Come fare backup (Supabase):
1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il progetto
3. Vai su **Database** → **Backups**
4. Clicca **Create Backup** (o usa backup automatico)

### Come fare backup (PostgreSQL diretto):
```bash
pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 📞 Supporto

Se incontri problemi:
1. Controlla i log di Vercel: **Deployments** → **Functions** → **Logs**
2. Controlla i log di Prisma: output del comando `migrate deploy`
3. Verifica che `DATABASE_URL` sia corretto
4. Verifica che il database sia raggiungibile

---

**Ultimo aggiornamento**: 2025-01-27  
**Versione**: 1.0

