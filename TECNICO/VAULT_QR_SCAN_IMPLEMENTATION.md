# SafeTrade Vault - Sistema Scansione QR e Assegnazione Carte

## Overview

Sistema completo per la gestione delle teche Vault con scansione QR e assegnazione automatica delle carte agli slot.

## Funzionalità Implementate

### 1. Autorizzazione Teca (Admin)

**Endpoint**: `POST /api/admin/shops/[id]/authorize-vault-case`

- Admin può autorizzare/revocare l'uso della teca per un negozio
- Quando autorizzato, viene creata automaticamente una teca con 30 slot (S01..S30)
- Ogni slot ha un QR token univoco generato automaticamente
- Solo negozi con `vaultCaseAuthorized = true` possono usare la scansione QR

**Validazioni**:
- Il negozio deve essere `vaultEnabled = true`
- Una teca può essere autorizzata solo per un negozio alla volta
- Prevenzione duplicazioni QR tramite token univoci

### 2. Scansione QR Slot (Merchant)

**Endpoint**: `POST /api/vault/merchant/scan-slot`

**Workflow**:
1. Merchant scansiona QR code dello slot
2. Sistema verifica:
   - QR token valido
   - Slot appartiene alla teca autorizzata del negozio
   - Merchant ha `vaultCaseAuthorized = true`
3. Restituisce:
   - Info slot (codice, stato, carta presente se occupato)
   - Lista carte disponibili per assegnazione (ASSIGNED_TO_SHOP, non in slot)

**Validazioni**:
- Solo merchant autorizzati possono scansionare
- QR token deve essere valido e appartenere alla teca del negozio
- Prevenzione accesso a teche di altri negozi

### 3. Assegnazione Carta a Slot (Merchant)

**Endpoint**: `POST /api/vault/merchant/assign-item-to-slot`

**Workflow**:
1. Merchant seleziona carta dal menu a tendina
2. Sistema verifica:
   - Carta assegnata al negozio (shopIdCurrent)
   - Carta in stato ASSIGNED_TO_SHOP
   - Carta non già in uno slot
   - Slot libero e appartiene alla teca autorizzata
   - Nessuna duplicazione (carta non già in altro slot della stessa teca)
3. Assegna carta allo slot:
   - Item.status → IN_CASE
   - Item.slotId → slotId
   - Item.caseId → caseId
   - Slot.status → OCCUPIED

**Validazioni Critiche**:
- ✅ Item deve essere assegnato al negozio corrente
- ✅ Item deve essere in stato ASSIGNED_TO_SHOP
- ✅ Slot deve essere FREE
- ✅ Slot deve appartenere alla teca autorizzata del negozio
- ✅ Prevenzione duplicazioni (verifica item non già in slot)
- ✅ Prevenzione assegnazione a slot di altri negozi

### 4. Lista Carte Disponibili

**Endpoint**: `GET /api/vault/merchant/available-items`

Restituisce tutte le carte disponibili per assegnazione:
- Stato: ASSIGNED_TO_SHOP
- Non in slot (slotId = null)
- Assegnate al negozio corrente

### 5. Vendita Fisica (con Validazioni)

**Endpoint**: `POST /api/vault/merchant/sales`

**Validazioni Aggiuntive**:
- ✅ Item deve essere IN_CASE (fisicamente nella teca)
- ✅ Item deve essere in uno slot della teca autorizzata
- ✅ Verifica che slot.case.authorizedShopId = shop.id
- ✅ Prevenzione vendita carte non in possesso fisico

### 6. Listing Online (con Validazioni)

**Endpoint**: `POST /api/vault/merchant/items/[id]/list-online`

**Validazioni**:
- ✅ Item deve essere IN_CASE
- ✅ Item deve essere nella teca autorizzata del negozio
- ✅ Prevenzione listing di carte non fisicamente in teca

## Prevenzione Problemi

### Duplicazioni QR
- Ogni slot ha `qrToken` univoco (constraint `@unique`)
- QR token generato con: `VAULT_SLOT_{caseId}_{slotCode}_{random}`
- Parsing validato prima dell'uso

### Vendite Non Autorizzate
- Vendita fisica richiede item IN_CASE
- Verifica che slot appartenga alla teca autorizzata
- Verifica che shop.vaultCaseAuthorized = true
- Audit trail completo per ogni vendita

### Accesso a Teche di Altri Negozi
- Ogni query verifica `authorizedShopId = shop.id`
- QR token contiene caseId, validato contro authorizedShopId
- Nessun merchant può accedere a slot di altre teche

### Gestione Multiple Teche (10, 30, 100+)
- Ogni teca ha ID univoco
- Ogni slot ha QR token univoco globale
- Relazione one-to-one tra Shop e VaultCase (authorized)
- Shop può avere multiple teche assegnate (vaultCases), ma solo una autorizzata

## UI Pages

### Merchant
- `/merchant/vault` - Dashboard principale
- `/merchant/vault/scan` - Scansione QR e assegnazione carte

### Admin
- `/admin/shops` - Gestione negozi con autorizzazione teca

## Prossimi Passi

1. Integrare scanner QR reale (libreria come `react-qr-reader` o `html5-qrcode`)
2. Aggiungere visualizzazione griglia 30 slot nella pagina `/merchant/vault/case`
3. Aggiungere notifiche realtime quando carte vengono assegnate
4. Aggiungere export QR codes per stampa

