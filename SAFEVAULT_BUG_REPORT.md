# SafeVault - Report Bug & Task Dettagliato

> Generato: 12 Febbraio 2026
> File analizzati: 28 API routes, 13 pagine frontend, 6 lib files, 12 modelli Prisma

---

## TASK 1: Bug Logico - Conferma Pagamento (CRITICO)

**File:** `src/app/api/vault/requests/[id]/confirm-payment/route.ts`
**Righe:** 60-78

**Problema:** La logica di verifica del `paymentStatus` e' invertita. Il check a riga 60 blocca la richiesta se `paymentStatus === 'PENDING'`, ma poi a riga 78 imposta `paymentStatus: 'PENDING'`. Il flusso corretto dovrebbe essere:
- Stato iniziale: `null` o `UNPAID`
- Dopo conferma merchant: `PENDING` (in attesa verifica admin)
- Dopo verifica admin: `PAID`

**Effetto:** Se il `paymentStatus` parte da `null` il codice funziona la prima volta, ma se viene chiamato di nuovo con stato `PENDING` blocca correttamente. Il vero problema e' che manca un check per `paymentStatus === null` (l'unico stato da cui si dovrebbe poter confermare).

**Fix richiesto:**
```typescript
// Accetta solo se paymentStatus e' null/UNPAID (primo tentativo)
if (vaultRequest.paymentStatus && vaultRequest.paymentStatus !== 'UNPAID') {
  return NextResponse.json(
    { error: 'Il pagamento e\' gia\' stato confermato' },
    { status: 400 }
  )
}
```

---

## TASK 2: Incoerenza State Machine - canListOnline() (MEDIO)

**File:** `src/lib/vault/state-machine.ts`
**Righe:** 14-24, 78-79

**Problema:** `canListOnline()` accetta `ASSIGNED_TO_SHOP` ma la mappa delle transizioni valide NON permette `ASSIGNED_TO_SHOP -> LISTED_ONLINE`. Solo `IN_CASE -> LISTED_ONLINE` e' valido (riga 19). Quindi `canListOnline()` restituisce `true` per `ASSIGNED_TO_SHOP` ma poi `canTransitionItemStatus()` restituisce `false`.

**Effetto:** Nell'API `list-online` il check a riga 53 (`status !== 'IN_CASE'`) salva la situazione, ma la funzione `canListOnline()` e' fuorviante e potrebbe causare bug futuri.

**Fix richiesto:**
```typescript
export function canListOnline(status: VaultItemStatus): boolean {
  return status === 'IN_CASE' // Solo IN_CASE puo' essere listato online
}
```

---

## TASK 3: Transizione Mancante - ASSIGNED_TO_SHOP -> RETURNED (MEDIO)

**File:** `src/lib/vault/state-machine.ts`
**Riga:** 18

**Problema:** Un item `ASSIGNED_TO_SHOP` non puo' essere restituito (RETURNED). La transizione `ASSIGNED_TO_SHOP -> RETURNED` manca dalla mappa. Se un proprietario chiede indietro la carta prima che venga messa nella teca, non c'e' modo di restituirla nel sistema.

**Fix richiesto:**
```typescript
ASSIGNED_TO_SHOP: ['IN_CASE', 'RETURNED'],
```

---

## TASK 4: Split Calculator - Arrotondamento Inconsistente (MEDIO)

**File:** `src/lib/vault/split-calculator.ts`
**Righe:** 19-22

**Problema:** Owner e merchant usano `Math.floor()`, la platform usa `Math.round()`. Per importi piccoli (es. 0.03) il risultato puo' dare split negativi o inaspettati. Esempio:
- grossAmount = 0.03
- ownerAmount = floor(0.021) = 0.02
- merchantAmount = floor(0.006) = 0.00
- platformAmount = round(0.01) = 0.01
- Totale = 0.03 (ok in questo caso, ma con altri valori puo' sbagliare)

**Effetto:** Possibili discrepanze di 1 centesimo nei conteggi finanziari.

**Fix richiesto:** Usare `Math.round()` per tutti e tre, oppure calcolare platform come differenza.

---

## TASK 5: canSellPhysically() Troppo Permissivo (MEDIO)

**File:** `src/lib/vault/state-machine.ts`
**Riga:** 72

**Problema:** `canSellPhysically()` permette la vendita in stato `PENDING_REVIEW`, `ACCEPTED`, e `ASSIGNED_TO_SHOP` (tutti gli stati non nella blacklist). Un item `PENDING_REVIEW` non dovrebbe poter essere venduto.

**Fix richiesto:**
```typescript
export function canSellPhysically(status: VaultItemStatus): boolean {
  return ['IN_CASE', 'LISTED_ONLINE'].includes(status)
}
```

---

## TASK 6: Valori Hardcoded nel Frontend (BASSO)

### 6a. IBAN e importo hardcoded
**File:** `src/app/merchant/vault/requests/page.tsx`
**Righe:** ~481, ~489

**Problema:** IBAN `IT60 X054 2811 1010 0000 0123 456` e importo `€ 299,00` sono hardcoded nella pagina. Dovrebbero venire da environment variables o dal backend.

### 6b. Percentuali hardcoded
**File:** `src/app/merchant/vault/cases/[id]/page.tsx`, `src/app/merchant/vault/sales/page.tsx`

**Problema:** Le percentuali di split (70%, 20%, 10%) sono hardcoded nelle pagine frontend. Se cambiano nel backend, il frontend mostra valori sbagliati.

### 6c. Statistiche fake
**File:** `src/app/vault/page.tsx`, `src/app/merchant/vault/statement/page.tsx`

**Problema:** Valori come "+5.2%", "+8.4%", "+12.4%", "Avg. 10%" sono hardcoded, non calcolati dai dati reali.

**Fix richiesto:** Usare costanti condivise o caricarle dal backend.

---

## TASK 7: TODO non implementati (MEDIO)

### 7a. Pending Payout non calcolato
**File:** `src/app/merchant/vault/page.tsx`
**Riga:** 131

```typescript
pendingPayout: 0, // TODO: calculate from splits
```

### 7b. Total Sales non fetchato
**File:** `src/app/vault/page.tsx`
**Riga:** 85

```typescript
totalSales: 0, // TODO: fetch from sales
```

**Fix richiesto:** Implementare il calcolo reale dei pending payout e delle vendite totali dalle API.

---

## TASK 8: Error Handling Mancante nelle Pagine Frontend (MEDIO)

**File coinvolti:**
- `src/app/merchant/vault/statement/page.tsx` - fetch a riga 64 senza try-catch
- `src/app/merchant/vault/page.tsx` - API calls multipli senza error display all'utente
- `src/app/vault/page.tsx` - errori solo in console, nessun feedback UI
- `src/app/merchant/vault/sales/page.tsx` - accesso `sale.splits[sale.splits.length - 1]` senza null check
- `src/app/merchant/vault/cases/[id]/page.tsx` - `slot.item.owner.name` puo' essere null

**Problema:** La maggior parte delle pagine Vault cattura gli errori ma li logga solo in console. L'utente non vede mai un messaggio di errore, sembra semplicemente che non funzioni.

**Fix richiesto:** Aggiungere stati di errore visibili all'utente con messaggi chiari.

---

## TASK 9: Filtri Statement Non Funzionanti (MEDIO)

**File:** `src/app/merchant/vault/statement/page.tsx`

**Problema:** Lo state `filters` esiste ma la chiamata API `GET /api/vault/payouts?type=merchant` non invia i filtri. L'utente cambia i filtri ma i dati non cambiano.

**Fix richiesto:** Passare i parametri dei filtri nella query string della fetch.

---

## TASK 10: Scan Page Troppo Grande - Refactoring Necessario (BASSO)

**File:** `src/app/merchant/vault/scan/page.tsx` (~2000+ righe)

**Problema:** File troppo grande con troppa logica, troppi stati, troppe responsabilita'. Difficile da mantenere e debuggare. Molteplici operazioni (scan, assign, move, sell, list online, fulfill) tutte in un unico componente.

**Fix richiesto:** Spezzare in componenti separati:
- `ScanTab` - scan QR slots
- `AssignTab` - assegnazione item a slot
- `SellTab` - vendita fisica
- `FulfillTab` - evasione ordini online
- `ListOnlineTab` - listing online

---

## TASK 11: Type Safety - Cast `as any` Diffusi (BASSO)

**File coinvolti:**
- `src/app/api/vault/cases/route.ts` - `status as any`
- `src/app/api/vault/deposits/[id]/review/route.ts` - `depositStatus as any`
- `src/app/api/vault/merchant/orders/[id]/fulfill/route.ts` - `totals as any`
- `src/app/api/vault/payouts/route.ts` - `type as any`
- `src/app/api/vault/orders/route.ts` - `shippingAddress as any`, `totals as any`
- `src/app/api/vault/deposits/route.ts` - `status as any` (2 volte)
- `src/app/api/vault/merchant/orders/route.ts` - `status as any`
- `src/app/api/vault/merchant/sales/route.ts` - `where: any`
- `src/app/api/vault/items/route.ts` - `where: any`

**Problema:** 10+ cast `as any` nelle API routes. Bypass della type safety di TypeScript.

**Fix richiesto:** Usare i tipi Prisma corretti o type guard.

---

## TASK 12: Audit Log Failures Silenziosi (BASSO)

**File coinvolti:**
- `src/app/api/vault/deposits/[id]/route.ts` - `.catch(console.error)` righe 115, 175
- `src/app/api/vault/deposits/[id]/mark-shipped/route.ts` - `.catch(console.error)` riga 63

**Problema:** Se la creazione dell'audit log fallisce, l'errore viene loggato in console ma l'operazione principale risulta "completata" senza traccia di audit. Per un sistema finanziario questo e' un rischio.

**Fix richiesto:** Wrappare audit log e operazione in una transazione unica, oppure almeno loggare l'errore con piu' contesto e notificare gli admin.

---

## TASK 13: SSR Issues - window.location.origin (BASSO)

**File coinvolti:**
- `src/app/merchant/vault/cases/[id]/qr-print/page.tsx` - righe 169, 337, 362
- `src/app/merchant/vault/statement/page.tsx` - export CSV

**Problema:** `window.location.origin` puo' causare errori in SSR (server-side rendering). Anche se queste pagine sono 'use client', il primo render lato server non ha `window`.

**Fix richiesto:** Usare `typeof window !== 'undefined' ? window.location.origin : ''` oppure `process.env.NEXT_PUBLIC_APP_URL`.

---

## TASK 14: Prisma Schema - Index Mancanti per Performance (BASSO)

**File:** `prisma/schema.prisma`

Index mancanti che impattano le query piu' frequenti:

| Modello | Campo/Composito | Motivazione |
|---------|----------------|-------------|
| VaultItem | `[status, shopIdCurrent]` | Query merchant inventory |
| VaultCase | `[status, shopId]` | Query teche attive |
| VaultCaseSlot | `[caseId, status]` | Query slot liberi |
| VaultSale | `soldAt` | Filtro date vendite |
| VaultOrder | `[status, shopIdFulfillment]` | Query ordini merchant |
| VaultSplit | `eligibleAt` | Query payout eligibility |
| VaultCaseRequest | `[status, createdAt]` | Query richieste pendenti |

---

## TASK 15: Transazioni Atomiche - Race Condition (MEDIO)

**File:** `src/lib/vault/transactions.ts`

**Problema:** `assignItemToSlotAtomic` blocca item e slot con SELECT FOR UPDATE, ma NON blocca il case. Il campo `case.status` viene controllato dopo il lock, ma potrebbe cambiare nel frattempo in un'altra transazione concorrente.

**Fix richiesto:** Aggiungere `SELECT ... FROM "VaultCase" WHERE id = $1 FOR UPDATE` prima del check dello status del case.

---

## TASK 16: QR Token - Rischio Collisione (BASSO)

**File:** `src/lib/vault/qr-generator.ts`

**Problema:** I token QR usano solo 8 byte random (`crypto.randomBytes(8)`). Con 30 slot per teca e centinaia di teche, la probabilita' di collisione e' bassa ma non zero. Non c'e' nemmeno un check di unicita' prima del salvataggio (il campo `qrToken` e' unique in Prisma, quindi causerebbe un errore non gestito).

**Fix richiesto:** Aumentare a 16 byte e/o gestire l'errore di unicita' con retry.

---

## TASK 17: Notifiche - Null Reference in notifyPayoutPaid (BASSO)

**File:** `src/lib/vault/notifications.ts`

**Problema:** In `notifyPayoutPaid`, la query potrebbe non includere i dati necessari per `split`. Il `payeeMap` assume che `payeeId` sia sempre presente ma potrebbe non esserlo per il tipo `PLATFORM`.

---

## RIEPILOGO PRIORITA'

| Priorita' | Task | Descrizione |
|-----------|------|-------------|
| CRITICO | 1 | Bug logico conferma pagamento |
| MEDIO | 2 | Incoerenza canListOnline() |
| MEDIO | 3 | Transizione mancante ASSIGNED_TO_SHOP -> RETURNED |
| MEDIO | 4 | Arrotondamento split inconsistente |
| MEDIO | 5 | canSellPhysically troppo permissivo |
| MEDIO | 7 | TODO non implementati (payout, sales) |
| MEDIO | 8 | Error handling mancante frontend |
| MEDIO | 9 | Filtri statement non funzionanti |
| MEDIO | 15 | Race condition transazioni atomiche |
| BASSO | 6 | Valori hardcoded (IBAN, percentuali, stats) |
| BASSO | 10 | Refactoring scan page |
| BASSO | 11 | Type safety - as any |
| BASSO | 12 | Audit log failures silenziosi |
| BASSO | 13 | SSR issues |
| BASSO | 14 | Index Prisma mancanti |
| BASSO | 16 | QR token collisione |
| BASSO | 17 | Null reference notifiche |
