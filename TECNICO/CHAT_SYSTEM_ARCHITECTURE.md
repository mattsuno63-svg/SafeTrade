# 💬 Sistema Chat Interna - Architettura e Sicurezza

**Data**: 2025-01-27  
**Versione**: 1.0  
**Status**: Progettazione

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Architettura Sistema](#architettura-sistema)
3. [Modello Dati](#modello-dati)
4. [Sicurezza](#sicurezza)
5. [Performance e Scalabilità](#performance-e-scalabilità)
6. [Realtime Communication](#realtime-communication)
7. [UI/UX Design](#uiux-design)
8. [Piano di Implementazione](#piano-di-implementazione)

---

## 1. Panoramica

### 1.1 Obiettivo
Implementare un sistema di chat privata tra utenti per permettere comunicazione diretta tra buyer e seller, sostituendo il redirect a `/community` con una chat interna dedicata.

### 1.2 Requisiti Principali
- ✅ Chat privata 1-to-1 tra utenti
- ✅ Integrazione con listing (chat contestuale)
- ✅ Messaggi in tempo reale (Supabase Realtime)
- ✅ Sicurezza: rate limiting, sanitizzazione, validazione
- ✅ Performance: paginazione, cleanup automatico, archiviazione
- ✅ Notifiche push per nuovi messaggi
- ✅ Indicatori "letto/non letto"
- ✅ Supporto per immagini (opzionale, futuro)

### 1.3 Stato Attuale
- ✅ **Database**: Modelli `Conversation` e `Message` già presenti
- ✅ **API Backend**: Endpoint `/api/conversations` e `/api/conversations/[id]/messages` implementati
- ❌ **UI Frontend**: Nessuna pagina di chat dedicata
- ❌ **Realtime**: Non integrato con Supabase Realtime
- ❌ **Sicurezza**: Mancano rate limiting, sanitizzazione XSS, validazione lunghezza
- ❌ **Performance**: Nessun cleanup automatico, paginazione base

---

## 2. Architettura Sistema

### 2.1 Componenti Principali

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Next.js Frontend)                │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Chat List    │  │ Chat Window  │  │ Notifications │    │
│  │ Component    │  │ Component    │  │ Component     │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                    ┌───────▼────────┐                       │
│                    │  Chat Hook     │                       │
│                    │  (useChat)     │                       │
│                    └───────┬────────┘                       │
└────────────────────────────┼────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
         ┌──────────▼──────────┐  ┌─────▼──────────────┐
         │  REST API          │  │  Supabase Realtime │
         │  (Next.js Routes)  │  │  (WebSocket)       │
         └──────────┬──────────┘  └─────┬──────────────┘
                    │                   │
         ┌──────────▼───────────────────▼──────────┐
         │         DATABASE (PostgreSQL)            │
         │  ┌──────────────┐  ┌──────────────┐     │
         │  │ Conversation │  │   Message    │     │
         │  └──────────────┘  └──────────────┘     │
         └─────────────────────────────────────────┘
```

### 2.2 Flusso di Comunicazione

#### **Creazione Conversazione**
1. User A clicca "Contact Seller" su un listing
2. Frontend chiama `POST /api/conversations` con `recipientId` e `listingId`
3. Backend verifica se conversazione esiste già (unique constraint `userAId + userBId`)
4. Se non esiste, crea nuova `Conversation`
5. Se esiste, restituisce conversazione esistente
6. Frontend reindirizza a `/chat/[conversationId]`

#### **Invio Messaggio**
1. User A digita messaggio e invia
2. Frontend chiama `POST /api/conversations/[id]/messages` con `content`
3. Backend valida:
   - Rate limiting (max 30 messaggi/minuto per utente)
   - Lunghezza messaggio (max 2000 caratteri)
   - Sanitizzazione XSS
   - Verifica autorizzazione (user è parte della conversazione)
4. Backend crea `Message` nel database
5. Backend aggiorna `Conversation.updatedAt`
6. Backend crea `Notification` per il destinatario
7. Backend pubblica evento su Supabase Realtime channel
8. Frontend riceve evento realtime e aggiorna UI

#### **Ricezione Messaggio (Realtime)**
1. User B è iscritto al channel `conversation_${conversationId}`
2. Supabase Realtime rileva INSERT su tabella `Message`
3. Evento broadcastato a tutti i subscriber del channel
4. Frontend di User B aggiorna UI con nuovo messaggio
5. Frontend mostra notifica toast (se non è nella chat aperta)

---

## 3. Modello Dati

### 3.1 Schema Database (Esistente)

```prisma
model Conversation {
  id        String   @id @default(cuid())
  userAId   String
  userA     User     @relation("ConversationUserA", ...)
  userBId   String
  userB     User     @relation("ConversationUserB", ...)
  listingId String?  // Optional - conversation about a listing
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  messages Message[]

  @@unique([userAId, userBId])  // Una sola conversazione per coppia utenti
  @@index([userAId])
  @@index([userBId])
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(...)
  senderId       String
  sender         User         @relation("Sender", ...)
  receiverId     String
  receiver       User         @relation("Receiver", ...)
  content        String       // Testo del messaggio (max 2000 caratteri)
  read           Boolean      @default(false)  // Flag "letto"
  createdAt      DateTime     @default(now())

  @@index([conversationId])
  @@index([senderId])
  @@index([receiverId])
  @@index([read])
  @@index([createdAt])  // Per paginazione efficiente
}
```

### 3.2 Modifiche Proposte al Schema

```prisma
model Message {
  // ... campi esistenti ...
  
  // NUOVI CAMPI per performance e sicurezza
  contentLength  Int          @default(0)  // Cache lunghezza per query veloci
  isArchived     Boolean      @default(false)  // Per cleanup automatico
  archivedAt     DateTime?   // Quando archiviato
  editedAt       DateTime?   // Se messaggio modificato (futuro)
  deletedAt      DateTime?   // Soft delete (futuro)
  
  // Per rate limiting tracking
  ipAddress      String?      // IP sender (per sicurezza)
  userAgent      String?      // User agent (per sicurezza)
}
```

**NOTA**: Questi campi sono opzionali e possono essere aggiunti in una migration futura. Per ora, implementiamo la logica senza modificare lo schema.

---

## 4. Sicurezza

### 4.1 Rate Limiting

**Problema**: Un utente malintenzionato potrebbe inviare migliaia di messaggi al secondo, intasando il database e causando DoS.

**Soluzione**: Rate limiting per utente e per conversazione.

```typescript
// Aggiungere a src/lib/rate-limit.ts
export const RATE_LIMITS = {
  // ... esistenti ...
  
  MESSAGE_SEND: {
    maxRequests: 30,  // 30 messaggi
    windowMs: 60 * 1000,  // per minuto
  },
  CONVERSATION_CREATE: {
    maxRequests: 10,  // 10 nuove conversazioni
    windowMs: 60 * 60 * 1000,  // per ora
  },
}
```

**Implementazione**:
- Rate limit per `userId` (globale)
- Rate limit per `conversationId` (per conversazione)
- Rate limit per `IP address` (per prevenire spam da account multipli)

### 4.2 Sanitizzazione XSS

**Problema**: Messaggi non sanitizzati possono contenere script JavaScript dannosi.

**Soluzione**: Sanitizzare tutti i messaggi prima di salvarli nel database.

```typescript
// Installare: npm install dompurify isomorphic-dompurify
import DOMPurify from 'isomorphic-dompurify'

function sanitizeMessage(content: string): string {
  // Rimuove HTML/JavaScript ma mantiene testo normale
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],  // Nessun tag HTML permesso
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,  // Mantiene il testo
  }).trim()
}
```

**Regole**:
- ✅ Testo normale permesso
- ❌ HTML tags bloccati
- ❌ JavaScript bloccato
- ❌ URL non cliccabili (per prevenire phishing)
- ✅ Emoji permessi (Unicode)

### 4.3 Validazione Contenuto

**Regole di Validazione**:
1. **Lunghezza**: Min 1 carattere, Max 2000 caratteri
2. **Caratteri**: Solo caratteri Unicode validi (no control characters)
3. **Spam Detection**: Rileva messaggi identici ripetuti (max 3 identici in 1 minuto)
4. **Parole Proibite**: Lista di parole bloccate (configurabile da admin)

```typescript
function validateMessage(content: string): { valid: boolean; error?: string } {
  // 1. Lunghezza
  if (content.length < 1) {
    return { valid: false, error: 'Message cannot be empty' }
  }
  if (content.length > 2000) {
    return { valid: false, error: 'Message too long (max 2000 characters)' }
  }
  
  // 2. Caratteri validi
  if (!/^[\s\S]*$/.test(content)) {
    return { valid: false, error: 'Invalid characters in message' }
  }
  
  // 3. Spam detection (implementare con cache Redis o in-memory)
  // ... (vedi sezione Performance)
  
  return { valid: true }
}
```

### 4.4 Autorizzazione

**Verifiche Obbligatorie**:
1. ✅ User autenticato (`requireAuth()`)
2. ✅ User è parte della conversazione (`userAId === user.id || userBId === user.id`)
3. ✅ Conversazione esiste e non è bloccata
4. ✅ User non è bannato (verifica `User.role !== 'BANNED'`)

### 4.5 Audit Trail

**Logging Eventi**:
- Creazione conversazione
- Invio messaggio
- Lettura messaggi
- Tentativi di accesso non autorizzati

```typescript
// Aggiungere a src/lib/security/audit.ts
await logSecurityEvent({
  eventType: 'MESSAGE_SENT',
  performedById: user.id,
  resourceId: message.id,
  resourceType: 'MESSAGE',
  metadata: {
    conversationId,
    contentLength: content.length,
    hasSpam: false,  // Se rilevato spam
  },
})
```

---

## 5. Performance e Scalabilità

### 5.1 Problema: Milioni di Messaggi

**Scenario**: Dopo 1 anno con 10.000 utenti attivi, potremmo avere:
- 50.000 conversazioni
- 5.000.000 messaggi (media 100 messaggi/conversazione)
- Query lente, database intasato, sito lento

### 5.2 Strategie di Ottimizzazione

#### **A) Paginazione Efficiente (Cursor-based)**

**Problema**: `OFFSET` diventa lento con milioni di record.

**Soluzione**: Cursor-based pagination usando `createdAt` e `id`.

```typescript
// GET /api/conversations/[id]/messages?cursor=xxx&limit=50
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')  // Timestamp o message ID
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)  // Max 100
  
  const messages = await prisma.message.findMany({
    where: {
      conversationId: id,
      ...(cursor && {
        createdAt: { lt: new Date(cursor) },  // Messaggi più vecchi
      }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      content: true,
      senderId: true,
      receiverId: true,
      read: true,
      createdAt: true,
      sender: { select: { id: true, name: true, avatar: true } },
    },
  })
  
  return NextResponse.json({
    messages: messages.reverse(),  // Chronological order
    nextCursor: messages.length === limit ? messages[messages.length - 1].createdAt.toISOString() : null,
    hasMore: messages.length === limit,
  })
}
```

**Vantaggi**:
- ✅ Query sempre veloci (indice su `createdAt`)
- ✅ Funziona con milioni di messaggi
- ✅ Non usa `OFFSET` (evita skip costoso)

#### **B) Cleanup Automatico Messaggi Vecchi**

**Strategia**: Archiviare messaggi più vecchi di 1 anno.

```typescript
// Script cron: scripts/archive-old-messages.ts
// Eseguire settimanalmente

async function archiveOldMessages() {
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  
  // 1. Conta messaggi da archiviare
  const count = await prisma.message.count({
    where: {
      createdAt: { lt: oneYearAgo },
      isArchived: false,
    },
  })
  
  console.log(`Archiving ${count} old messages...`)
  
  // 2. Archivia in batch (1000 alla volta)
  let archived = 0
  while (archived < count) {
    const result = await prisma.message.updateMany({
      where: {
        createdAt: { lt: oneYearAgo },
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
      take: 1000,  // Batch size
    })
    
    archived += result.count
    console.log(`Archived ${archived}/${count} messages`)
    
    // Pausa per non sovraccaricare DB
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // 3. Opzionale: Sposta messaggi archiviati in tabella separata
  // (per query ancora più veloci)
}
```

**Alternative**:
- **Opzione 1**: Mantenere messaggi archiviati nella stessa tabella (più semplice)
- **Opzione 2**: Spostare in tabella `MessageArchive` (più performante, più complesso)
- **Opzione 3**: Eliminare definitivamente messaggi > 2 anni (più aggressivo)

#### **C) Limitazione Messaggi per Conversazione**

**Regola**: Mantenere solo ultimi 1000 messaggi per conversazione attiva.

```typescript
// Trigger dopo ogni nuovo messaggio (opzionale)
async function cleanupOldMessagesInConversation(conversationId: string) {
  // Conta messaggi totali
  const total = await prisma.message.count({
    where: { conversationId },
  })
  
  if (total > 1000) {
    // Trova il 1000° messaggio più recente
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: { id: true },
    })
    
    const oldestToKeep = messages[messages.length - 1]
    
    // Archivia messaggi più vecchi
    await prisma.message.updateMany({
      where: {
        conversationId,
        createdAt: { lt: oldestToKeep.createdAt },
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    })
  }
}
```

#### **D) Indici Database**

**Indici Esistenti** (verificare):
```sql
CREATE INDEX IF NOT EXISTS "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX IF NOT EXISTS "Message_createdAt_idx" ON "Message"("createdAt");
CREATE INDEX IF NOT EXISTS "Message_read_idx" ON "Message"("read");
```

**Indici Aggiuntivi Consigliati**:
```sql
-- Per query "unread messages count"
CREATE INDEX IF NOT EXISTS "Message_conversationId_read_idx" 
  ON "Message"("conversationId", "read") 
  WHERE "read" = false;

-- Per cleanup automatico
CREATE INDEX IF NOT EXISTS "Message_createdAt_isArchived_idx" 
  ON "Message"("createdAt", "isArchived") 
  WHERE "isArchived" = false;
```

#### **E) Caching**

**Cache Redis** (opzionale, per scale):
- Cache ultimi 50 messaggi per conversazione (TTL: 5 minuti)
- Cache lista conversazioni utente (TTL: 1 minuto)
- Cache contatore messaggi non letti (TTL: 30 secondi)

**Implementazione Base** (senza Redis):
- Usare React Query con `staleTime` appropriato
- Cache lato client per messaggi già caricati

### 5.3 Query Optimization

**Query Ottimizzate**:

```typescript
// ❌ MALE: Carica tutti i messaggi
const messages = await prisma.message.findMany({
  where: { conversationId },
})

// ✅ BENE: Paginazione + select solo campi necessari
const messages = await prisma.message.findMany({
  where: { conversationId },
  orderBy: { createdAt: 'desc' },
  take: 50,
  select: {
    id: true,
    content: true,
    senderId: true,
    createdAt: true,
    read: true,
    sender: {
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    },
  },
})
```

---

## 6. Realtime Communication

### 6.1 Supabase Realtime Setup

**Configurazione Database**:
```sql
-- Abilita Realtime per tabella Message
ALTER PUBLICATION supabase_realtime ADD TABLE "Message";

-- Crea policy RLS (Row Level Security)
CREATE POLICY "Users can see messages in their conversations"
  ON "Message" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Conversation"
      WHERE "Conversation".id = "Message"."conversationId"
      AND ("Conversation"."userAId" = auth.uid() OR "Conversation"."userBId" = auth.uid())
    )
  );
```

### 6.2 Client-Side Subscription

```typescript
// src/hooks/use-chat.ts
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function useChatMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (!conversationId) return
    
    const supabase = createClient()
    
    // 1. Fetch iniziale
    fetchMessages(conversationId).then(setMessages).finally(() => setLoading(false))
    
    // 2. Subscribe a nuovi messaggi
    const channel = supabase
      .channel(`conversation_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          // Aggiungi nuovo messaggio alla lista
          setMessages(prev => [...prev, payload.new as Message])
          
          // Marca come letto se utente corrente è il receiver
          if (payload.new.receiverId === currentUserId) {
            markAsRead(payload.new.id)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Message',
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          // Aggiorna messaggio esistente (es. flag "read")
          setMessages(prev =>
            prev.map(msg =>
              msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
            )
          )
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])
  
  return { messages, loading }
}
```

### 6.3 Fallback Polling

**Se Realtime non disponibile**, usare polling come fallback:

```typescript
// Polling ogni 5 secondi se WebSocket disconnesso
useEffect(() => {
  if (!isRealtimeConnected) {
    const interval = setInterval(() => {
      fetchNewMessages(conversationId, lastMessageId)
    }, 5000)
    return () => clearInterval(interval)
  }
}, [isRealtimeConnected, conversationId, lastMessageId])
```

---

## 7. UI/UX Design

### 7.1 Struttura Pagine

```
/chat                          → Lista conversazioni
/chat/[conversationId]         → Chat window con conversazione specifica
/chat/new?userId=xxx&listingId=yyy  → Crea nuova conversazione
```

### 7.2 Componenti Principali

1. **ChatList** (`src/components/chat/ChatList.tsx`)
   - Lista conversazioni con ultimo messaggio
   - Badge contatore messaggi non letti
   - Ricerca conversazioni

2. **ChatWindow** (`src/components/chat/ChatWindow.tsx`)
   - Header con info altro utente
   - Lista messaggi (virtualizzata per performance)
   - Input messaggio con validazione
   - Indicatori "typing..." (opzionale)

3. **MessageBubble** (`src/components/chat/MessageBubble.tsx`)
   - Messaggio inviato/ricevuto
   - Timestamp
   - Indicatore "letto" (doppio check)

4. **ChatInput** (`src/components/chat/ChatInput.tsx`)
   - Textarea con validazione lunghezza
   - Pulsante invio
   - Emoji picker (opzionale)

### 7.3 Mobile Responsive

- Desktop: Sidebar con lista + chat window
- Mobile: Stack (lista → chat window)
- Touch gestures: Swipe per tornare alla lista

---

## 8. Piano di Implementazione

### Fase 1: Sicurezza e Validazione (PRIORITÀ ALTA)
- [ ] Aggiungere rate limiting per messaggi
- [ ] Implementare sanitizzazione XSS
- [ ] Validazione lunghezza messaggio
- [ ] Spam detection base

### Fase 2: API Enhancement
- [ ] Migliorare paginazione (cursor-based)
- [ ] Aggiungere endpoint per contare messaggi non letti
- [ ] Endpoint per marcare conversazione come letta
- [ ] Endpoint per eliminare conversazione (soft delete)

### Fase 3: Realtime Integration
- [ ] Configurare Supabase Realtime per tabella Message
- [ ] Creare hook `useChatMessages`
- [ ] Implementare fallback polling

### Fase 4: UI Components
- [ ] Creare pagina `/chat` (lista conversazioni)
- [ ] Creare pagina `/chat/[id]` (chat window)
- [ ] Componente ChatList
- [ ] Componente ChatWindow
- [ ] Componente MessageBubble
- [ ] Componente ChatInput

### Fase 5: Integrazione
- [ ] Modificare "Contact Seller" per aprire chat invece di redirect
- [ ] Aggiungere badge contatore messaggi in Header
- [ ] Notifiche toast per nuovi messaggi

### Fase 6: Performance e Cleanup
- [ ] Script cleanup messaggi vecchi
- [ ] Ottimizzazione query con indici
- [ ] Monitoring performance

---

## 9. Metriche e Monitoring

### 9.1 Metriche da Monitorare

- **Performance**:
  - Tempo risposta API messaggi (target: < 200ms)
  - Tempo caricamento chat (target: < 1s)
  - Throughput messaggi/secondo

- **Sicurezza**:
  - Numero rate limit hits
  - Tentativi accesso non autorizzati
  - Messaggi bloccati per spam

- **Scalabilità**:
  - Numero totale messaggi nel database
  - Numero conversazioni attive
  - Storage utilizzato

### 9.2 Alerting

- Alert se rate limit superato > 100 volte/ora
- Alert se query messaggi > 1 secondo
- Alert se storage > 10GB

---

## 10. Considerazioni Future

### 10.1 Funzionalità Avanzate (Fase 2)
- 📎 Allegati immagini (upload a Supabase Storage)
- ✏️ Modifica messaggi (con timestamp `editedAt`)
- 🗑️ Eliminazione messaggi (soft delete)
- 🔍 Ricerca nei messaggi
- 📌 Messaggi importanti (pin)

### 10.2 Scalabilità Estrema
- Migrazione a Redis per rate limiting distribuito
- Message queue (RabbitMQ/Kafka) per invio asincrono
- CDN per asset chat (immagini, emoji)
- Database sharding per conversazioni (se > 1M conversazioni)

---

## 11. Conclusioni

Questo sistema di chat è progettato per:
- ✅ **Sicurezza**: Rate limiting, sanitizzazione, validazione
- ✅ **Performance**: Paginazione efficiente, cleanup automatico, indici ottimizzati
- ✅ **Scalabilità**: Supporta milioni di messaggi senza degradazione
- ✅ **User Experience**: Realtime, notifiche, UI moderna

**Prossimi Passi**: Implementare Fase 1 (Sicurezza) prima di procedere con UI.

---

**Documento creato**: 2025-01-27  
**Ultima modifica**: 2025-01-27

