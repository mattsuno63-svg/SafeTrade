# 📐 Coding Standards - SafeTrade

## Regole Ferree da Seguire

### 1. TypeScript Strict Mode
- ✅ **SEMPRE** usa TypeScript con strict mode
- ✅ **MAI** usare `any` - usa `unknown` o tipi specifici
- ✅ **SEMPRE** definisci tipi per props, state, API responses
- ✅ Usa `@types/` packages per tutte le dipendenze

**Esempio CORRETTO**:
```typescript
interface User {
  id: string
  email: string
  name: string | null
}

const getUser = async (id: string): Promise<User> => {
  // ...
}
```

**Esempio SBAGLIATO**:
```typescript
const getUser = async (id: any): Promise<any> => {
  // ...
}
```

---

### 2. Component Naming
- ✅ **SEMPRE** PascalCase per componenti React
- ✅ **SEMPRE** nomi descrittivi e specifici
- ✅ **MAI** nomi generici come `Component`, `Item`, `Card` (a meno che non siano UI base)

**Esempio CORRETTO**:
```typescript
// ListingCard.tsx
export function ListingCard({ listing }: { listing: Listing }) {
  // ...
}

// UserProfileDropdown.tsx
export function UserProfileDropdown() {
  // ...
}
```

**Esempio SBAGLIATO**:
```typescript
// Card.tsx (troppo generico)
export function Card() {
  // ...
}
```

---

### 3. File Structure
- ✅ **SEMPRE** un componente per file
- ✅ **SEMPRE** export default per page components
- ✅ **SEMPRE** export named per utility components
- ✅ **SEMPRE** co-locare componenti correlati in cartelle

**Struttura CORRETTA**:
```
src/components/
  layout/
    Header.tsx
    Footer.tsx
  marketplace/
    ListingCard.tsx
    ListingGrid.tsx
  ui/
    button.tsx
    card.tsx
```

---

### 4. API Routes
- ✅ **SEMPRE** validazione input con Zod
- ✅ **SEMPRE** error handling completo
- ✅ **SEMPRE** status codes HTTP corretti
- ✅ **SEMPRE** autenticazione verificata (tranne route pubbliche)

**Esempio CORRETTO**:
```typescript
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'

const schema = z.object({
  title: z.string().min(1).max(200),
  price: z.number().positive(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const data = schema.parse(body)
    
    // ... logic
    
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

### 5. Database Queries
- ✅ **SEMPRE** usa Prisma (mai SQL raw, a meno che necessario)
- ✅ **SEMPRE** usa transactions per operazioni multiple
- ✅ **SEMPRE** gestisci errori di constraint
- ✅ **SEMPRE** usa select specifici (non `*`)

**Esempio CORRETTO**:
```typescript
const listing = await prisma.listingP2P.findUnique({
  where: { id },
  select: {
    id: true,
    title: true,
    price: true,
    user: {
      select: {
        id: true,
        name: true,
      },
    },
  },
})
```

---

### 6. Error Handling
- ✅ **SEMPRE** try-catch in async functions
- ✅ **SEMPRE** log errori in development
- ✅ **SEMPRE** messaggi errori user-friendly
- ✅ **MAI** esporre stack traces in produzione

**Esempio CORRETTO**:
```typescript
try {
  // ... operation
} catch (error) {
  console.error('[Component] Error:', error)
  toast({
    title: 'Error',
    description: 'Something went wrong. Please try again.',
    variant: 'destructive',
  })
}
```

---

### 7. Environment Variables
- ✅ **SEMPRE** usa `process.env.NEXT_PUBLIC_*` per variabili client
- ✅ **SEMPRE** valida variabili d'ambiente all'avvio
- ✅ **MAI** committare `.env` file
- ✅ **SEMPRE** documenta variabili necessarie in `.env.example`

---

### 8. Supabase Client
- ✅ **SEMPRE** usa `createClient()` da `@/lib/supabase/client` (client-side)
- ✅ **SEMPRE** usa `createClient()` da `@/lib/supabase/server` (server-side)
- ✅ **SEMPRE** usa `cookieEncoding: 'base64url'` per consistenza
- ✅ **MAI** creare client Supabase direttamente

---

### 9. Styling
- ✅ **SEMPRE** usa Tailwind CSS
- ✅ **SEMPRE** usa componenti UI da `@/components/ui`
- ✅ **SEMPRE** usa classi utility, evita CSS custom
- ✅ **SEMPRE** responsive design (mobile-first)

**Esempio CORRETTO**:
```tsx
<div className="flex flex-col gap-4 p-6 rounded-lg bg-white dark:bg-gray-900">
  <h2 className="text-2xl font-bold">Title</h2>
</div>
```

---

### 10. Testing
- ✅ **SEMPRE** testa API routes manualmente prima di commit
- ✅ **SEMPRE** verifica errori edge cases
- ✅ **SEMPRE** testa su mobile viewport
- ✅ **SEMPRE** verifica autenticazione funziona

---

## 🚫 Cose da NON Fare

1. ❌ **MAI** usare `any` type
2. ❌ **MAI** console.log in produzione (usa logger)
3. ❌ **MAI** hardcode secrets/keys
4. ❌ **MAI** commitare `.env` files
5. ❌ **MAI** usare `eval()` o `dangerouslySetInnerHTML` senza sanitizzazione
6. ❌ **MAI** fare query N+1 (usa `include` in Prisma)
7. ❌ **MAI** ignorare errori TypeScript
8. ❌ **MAI** usare `@ts-ignore` senza commento esplicativo

---

## ✅ Checklist Pre-Commit

Prima di ogni commit, verifica:
- [ ] TypeScript compila senza errori (`npm run build`)
- [ ] Linter passa (`npm run lint`)
- [ ] Tutti i test passano (se presenti)
- [ ] Variabili d'ambiente documentate
- [ ] Error handling completo
- [ ] Responsive design verificato
- [ ] Autenticazione testata

---

## 📝 Commenti e Documentazione

- ✅ **SEMPRE** commenta logica complessa
- ✅ **SEMPRE** documenta API routes con JSDoc
- ✅ **SEMPRE** aggiorna README quando aggiungi features
- ✅ **MAI** commenti ovvi o inutili

**Esempio CORRETTO**:
```typescript
/**
 * Creates a SafeTrade transaction after a proposal is accepted.
 * Automatically selects the first available shop for the listing owner.
 * 
 * @param proposalId - ID of the accepted proposal
 * @returns Created transaction with related data
 */
export async function createSafeTradeTransaction(proposalId: string) {
  // ...
}
```

