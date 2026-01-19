# 📖 Guida Completa MERCHANT - Sistema SafeVault

## 🎯 Panoramica

Questa guida ti spiega come utilizzare tutte le funzionalità SafeVault come **MERCHANT**:
- Scansionare QR codes degli slot
- Caricare e assegnare carte agli slot
- Spostare carte tra slot
- Vendere carte fisicamente
- Gestire ordini online
- Visualizzare inventario e statistiche

---

## 📋 Prerequisiti

- ✅ Account **MERCHANT** attivo
- ✅ Negozio **APPROVATO** e con teca Vault **AUTORIZZATA**
- ✅ Teca Vault **PAGATA** e **ATTIVA**
- ✅ Server in esecuzione

---

## 🚀 FUNZIONALITÀ PRINCIPALI

### **1. SCANSIONE QR CODE E GESTIONE SLOT**

#### 1.1: Accedi alla Pagina di Scansione

1. Vai su `http://localhost:3000/merchant/vault/scan`
   - Oppure clicca su **"Vault"** nel menu merchant
   - Poi clicca su **"Scansiona QR"** o **"Gestisci Slot"**

2. ✅ **Verifica**: Dovresti vedere la pagina con 5 tab:
   - **Posiziona** - Assegna carte agli slot
   - **Sposta** - Sposta carte tra slot
   - **Vendi** - Registra vendite fisiche
   - **Lista Online** - Metti in vendita online
   - **Fulfillment** - Gestisci ordini online

---

### **2. POSIZIONARE CARTE NEGLI SLOT (Tab "Posiziona")**

#### Step 2.1: Scansiona QR Code dello Slot

**Opzione A - Scanner Integrato:**
1. Clicca sul pulsante **"Scansiona QR Code"** o **"Apri Scanner"**
2. ✅ **Verifica**: Si apre lo scanner QR
3. Punta la fotocamera verso il QR code dello slot sulla teca
4. ✅ **Verifica**: Il QR viene riconosciuto automaticamente
5. ✅ **Verifica**: Vedi le informazioni dello slot:
   - **Codice Slot**: Es. "S01", "S02", ecc.
   - **Status**: "Libero" o "Occupato"
   - **Teca**: Nome della teca

**Opzione B - Inserimento Manuale:**
1. Se non hai la fotocamera, clicca su **"Inserisci Token Manualmente"**
2. Inserisci il token QR dello slot (puoi trovarlo nella pagina di stampa QR)
3. Clicca **"Cerca Slot"**

#### Step 2.2: Seleziona Carta da Assegnare

1. ✅ **Verifica**: Vedi una lista di **"Carte Disponibili"** (dropdown)
   - Queste sono carte che sono state:
     - Ricevute dall'hub (status `IN_SHOP`)
     - Rimosse da altri slot
     - Non ancora assegnate a nessuno slot

2. Seleziona la carta dal dropdown:
   - **Nome Carta**: Es. "Pikachu VMAX"
   - **Gioco**: Es. "Pokémon"
   - **Set**: Es. "Base Set"
   - **Condizione**: Es. "Near Mint"

3. ✅ **Verifica**: Vedi un'anteprima della carta (se ha foto)

#### Step 2.3: Conferma Assegnazione

1. Clicca **"Assegna Carta allo Slot"**
2. ✅ **Verifica**: Vedi un messaggio di successo: **"Carta assegnata con successo!"**
3. ✅ **Verifica**: Lo slot ora mostra:
   - Status: **"Occupato"**
   - Carta assegnata con dettagli completi
   - Foto della carta (se disponibile)

#### Step 2.4: Verifica nella Vista Teca

1. Vai a `/merchant/vault/cases/[id]` (sostituisci `[id]` con l'ID della tua teca)
2. ✅ **Verifica**: Vedi una griglia di 30 slot (S01-S30)
3. ✅ **Verifica**: Lo slot che hai appena riempito mostra:
   - Badge **"Occupato"** o colore diverso
   - Nome della carta
   - Foto della carta (se disponibile)

---

### **3. SPOSTARE CARTE TRA SLOT (Tab "Sposta")**

#### Step 3.1: Scansiona Slot di Origine

1. Seleziona il tab **"Sposta"**
2. Clicca **"Scansiona Slot di Origine"**
3. Scansiona il QR code dello slot che contiene la carta da spostare
4. ✅ **Verifica**: Vedi le informazioni dello slot di origine:
   - Codice slot
   - Carta attualmente nello slot
   - Foto della carta

#### Step 3.2: Scansiona Slot di Destinazione

1. Clicca **"Scansiona Slot di Destinazione"**
2. Scansiona il QR code dello slot vuoto dove vuoi spostare la carta
3. ✅ **Verifica**: Vedi le informazioni dello slot di destinazione:
   - Codice slot
   - Status: **"Libero"**

#### Step 3.3: Conferma Spostamento

1. Clicca **"Sposta Carta"**
2. ✅ **Verifica**: Vedi un messaggio di successo: **"Carta spostata con successo!"**
3. ✅ **Verifica**: 
   - Slot di origine: ora **"Libero"**
   - Slot di destinazione: ora **"Occupato"** con la carta

---

### **4. VENDERE CARTE FISICAMENTE (Tab "Vendi")**

#### Step 4.1: Scansiona Slot della Carta da Vendere

1. Seleziona il tab **"Vendi"**
2. Clicca **"Scansiona Slot"**
3. Scansiona il QR code dello slot che contiene la carta venduta
4. ✅ **Verifica**: Vedi le informazioni della carta:
   - Nome, gioco, set
   - Prezzo finale (se impostato)
   - Foto

#### Step 4.2: Inserisci Dettagli Vendita

1. **Prezzo di Vendita** (obbligatorio):
   - Inserisci il prezzo a cui hai venduto la carta
   - Es. "25.00" per € 25,00

2. **Foto Prova** (opzionale ma consigliato):
   - Carica una foto della ricevuta o del pagamento
   - Questo serve come prova della vendita

3. **Note** (opzionale):
   - Aggiungi eventuali note sulla vendita
   - Es. "Venduto a cliente fisico, pagamento contanti"

#### Step 4.3: Conferma Vendita

1. Clicca **"Registra Vendita"**
2. ✅ **Verifica**: Vedi un messaggio di successo: **"Vendita registrata con successo!"**
3. ✅ **Verifica**: 
   - Lo slot diventa **"Libero"**
   - La carta viene rimossa dallo slot
   - La vendita viene registrata nel sistema
   - I ricavi vengono calcolati automaticamente (split 70/20/10)

---

### **5. METTERE CARTE IN VENDITA ONLINE (Tab "Lista Online")**

#### Step 5.1: Scansiona Slot della Carta

1. Seleziona il tab **"Lista Online"**
2. Clicca **"Scansiona Slot"**
3. Scansiona il QR code dello slot che contiene la carta
4. ✅ **Verifica**: Vedi le informazioni della carta

#### Step 5.2: Imposta Prezzo Online

1. **Prezzo di Vendita** (obbligatorio):
   - Inserisci il prezzo a cui vuoi vendere la carta online
   - Es. "30.00" per € 30,00

2. Clicca **"Metti in Vendita Online"**
3. ✅ **Verifica**: Vedi un messaggio di successo: **"Carta messa in vendita online!"**
4. ✅ **Verifica**: 
   - La carta appare nel marketplace
   - Gli utenti possono acquistarla
   - Lo slot rimane occupato fino alla vendita

---

### **6. GESTIRE ORDINI ONLINE (Tab "Fulfillment")**

#### Step 6.1: Visualizza Ordini da Evadere

1. Seleziona il tab **"Fulfillment"**
2. ✅ **Verifica**: Vedi una lista di ordini online:
   - **Filtri disponibili**: 
     - "Tutti" - Tutti gli ordini
     - "Riservati" - Ordini in attesa di pagamento
     - "Pagati" - Ordini pagati, da evadere
     - "In Spedizione" - Ordini già spediti
     - "Spediti" - Ordini completati

#### Step 6.2: Evadi un Ordine

1. Clicca su un ordine con status **"Pagato"**
2. ✅ **Verifica**: Vedi i dettagli dell'ordine:
   - Cliente
   - Carta acquistata
   - Slot da cui prelevare
   - Indirizzo di spedizione

3. Clicca **"Prepara Spedizione"**
4. ✅ **Verifica**: Vedi un form per:
   - **Corriere**: Seleziona il corriere (es. "Poste Italiane", "GLS")
   - **Codice Tracking**: Inserisci il codice di tracking

5. Clicca **"Marca come Spedito"**
6. ✅ **Verifica**: 
   - L'ordine cambia status in **"Spedito"**
   - Lo slot diventa **"Libero"**
   - Il cliente riceve una notifica con il tracking

---

### **7. VISUALIZZARE INVENTARIO E STATISTICHE**

#### Step 7.1: Dashboard Vault

1. Vai su `/merchant/vault`
2. ✅ **Verifica**: Vedi la dashboard con:
   - **Statistiche**:
     - Totale carte in negozio
     - Valore totale inventario
     - Vendite totali
   - **Inventario**:
     - Lista di tutte le carte nei tuoi slot
     - Filtri per gioco, set, condizione
   - **Vendite Recenti**:
     - Ultime vendite registrate
   - **Ordini in Attesa**:
     - Ordini online da evadere

#### Step 7.2: Vista Dettaglio Teca

1. Vai su `/merchant/vault/cases/[id]`
2. ✅ **Verifica**: Vedi una **griglia interattiva** di 30 slot:
   - **Slot Liberi**: Mostrano il codice (S01, S02, ecc.)
   - **Slot Occupati**: Mostrano:
     - Nome della carta
     - Foto (se disponibile)
     - Badge con status
   - **Clic su uno slot**: Apre un dialog con dettagli completi

#### Step 7.3: Stampa QR Codes

1. Vai su `/merchant/vault/cases/[id]/qr-print`
2. ✅ **Verifica**: Vedi tutti i 30 QR codes della teca:
   - QR code per ogni slot (S01-S30)
   - Codice slot visibile
   - Opzione per stampare tutti i QR in una volta

3. Clicca **"Stampa Tutti i QR Codes"**
4. ✅ **Verifica**: Si apre una finestra di stampa con tutti i QR codes
5. Stampa e attacca i QR codes agli slot fisici della teca

---

## 🔍 TROUBLESHOOTING

### **Problema 1: "Nessuna carta disponibile" nel dropdown**

**Possibili cause:**
- Le carte non sono ancora state ricevute dall'hub
- Le carte sono già assegnate ad altri slot
- Le carte sono state vendute

**Soluzione:**
1. Verifica che l'hub abbia inviato le carte al tuo negozio
2. Controlla lo status delle carte in `/merchant/vault`
3. Se necessario, rimuovi una carta da uno slot per renderla disponibile

### **Problema 2: QR Code non viene riconosciuto**

**Possibili cause:**
- QR code danneggiato o non stampato correttamente
- Token QR non valido
- Slot non appartiene alla tua teca

**Soluzione:**
1. Prova a scansionare di nuovo con migliore illuminazione
2. Usa l'inserimento manuale del token
3. Verifica che lo slot appartenga alla tua teca autorizzata

### **Problema 3: "Non autorizzato" quando scansiono un QR**

**Possibili cause:**
- Lo slot appartiene a un'altra teca/negozio
- La tua teca non è ancora autorizzata

**Soluzione:**
1. Verifica che la teca sia stata pagata e autorizzata
2. Contatta l'amministratore se il problema persiste

### **Problema 4: Carta non si sposta tra slot**

**Possibili cause:**
- Slot di destinazione già occupato
- Errore di rete
- Slot non valido

**Soluzione:**
1. Verifica che lo slot di destinazione sia libero
2. Ricarica la pagina e riprova
3. Controlla la console del browser per errori

---

## 📝 NOTE IMPORTANTI

1. **Backup QR Codes**: Stampa sempre i QR codes e conservali in un luogo sicuro
2. **Verifica Slot**: Prima di assegnare una carta, verifica sempre che lo slot sia libero
3. **Foto Carte**: Carica sempre foto di alta qualità delle carte per una migliore gestione
4. **Tracking Vendite**: Registra sempre le vendite fisiche con foto prova quando possibile
5. **Ordini Online**: Evadi gli ordini online entro 48 ore dalla ricezione del pagamento

---

## 🎉 Fine Guida

Ora sei pronto per utilizzare tutte le funzionalità SafeVault come merchant!

Per domande o problemi, contatta il supporto tecnico.

