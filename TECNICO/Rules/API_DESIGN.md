# 🔌 API Design Rules - SafeTrade

## Regole Ferree per API Routes

### 1. RESTful Conventions
- ✅ **SEMPRE** usa verbi HTTP corretti:
  - `GET` - Lettura dati
  - `POST` - Creazione risorsa
  - `PATCH` - Aggiornamento parziale
  - `DELETE` - Eliminazione risorsa
- ✅ **SEMPRE** nomi route descrittivi e consistenti

**Esempio CORRETTO**:
```
GET    /api/listings           - Lista tutti i listings
GET    /api/listings/[id]      - Dettaglio listing
POST   /api/listings           - Crea nuovo listing
PATCH  /api/listings/[id]      - Aggiorna listing
DELETE /api/listings/[id]      - Elimina listing
```

---

### 2. Request/Response Format
- ✅ **SEMPRE** JSON per request/response
- ✅ **SEMPRE** Content-Type: `application/json`
- ✅ **SEMPRE** struttura response consistente

**Formato CORRETTO**:
```typescript
// Success Response
{
  "data": { ... },
  "message": "Success" // opzionale
}

// Error Response
{
  "error": "Error message",
  "details": { ... } // opzionale, per validation errors
}
```

---

### 3. Status Codes
- ✅ **SEMPRE** usa status codes HTTP corretti:
  - `200` - Success (GET, PATCH)
  - `201` - Created (POST)
  - `204` - No Content (DELETE)
  - `400` - Bad Request (validation errors)
  - `401` - Unauthorized (not authenticated)
  - `403` - Forbidden (not authorized)
  - `404` - Not Found
  - `500` - Internal Server Error

**Esempio CORRETTO**:
```typescript
// Success
return NextResponse.json({ data }, { status: 200 })

// Created
return NextResponse.json({ data }, { status: 201 })

// Validation Error
return NextResponse.json(
  { error: 'Invalid input', details: errors },
  { status: 400 }
)

// Unauthorized
return NextResponse.json(
  { error: 'Unauthorized' },
  { status: 401 }
)
```

---

### 4. Input Validation
- ✅ **SEMPRE** valida input con Zod
- ✅ **SEMPRE** ritorna errori di validazione chiari
- ✅ **SEMPRE** sanitizza input (prevent XSS, SQL injection)

**Esempio CORRETTO**:
```typescript
import { z } from 'zod'

const createListingSchema = z.object({
  title: z.string().min(1).max(200),
  price: z.number().positive(),
  condition: z.enum(['MINT', 'NEAR_MINT', 'PLAYED']),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createListingSchema.parse(body)
    // ... use validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
  }
}
```

---

### 5. Authentication & Authorization
- ✅ **SEMPRE** verifica autenticazione (tranne route pubbliche)
- ✅ **SEMPRE** verifica autorizzazione (user può modificare solo sue risorse)
- ✅ **SEMPRE** usa `requireAuth()` helper

**Esempio CORRETTO**:
```typescript
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth()
  const { id } = params
  
  // Verify ownership
  const listing = await prisma.listingP2P.findUnique({
    where: { id },
  })
  
  if (listing?.userId !== user.id) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }
  
  // ... update listing
}
```

---

### 6. Error Handling
- ✅ **SEMPRE** try-catch in tutte le route
- ✅ **SEMPRE** log errori in development
- ✅ **SEMPRE** messaggi errori user-friendly
- ✅ **MAI** esporre stack traces o dettagli interni

**Esempio CORRETTO**:
```typescript
export async function POST(request: NextRequest) {
  try {
    // ... logic
  } catch (error) {
    console.error('[API /listings] Error:', error)
    
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

### 7. Pagination
- ✅ **SEMPRE** usa pagination per liste grandi
- ✅ **SEMPRE** parametri: `page`, `limit` (o `cursor`)
- ✅ **SEMPRE** ritorna metadata: `total`, `page`, `hasMore`

**Esempio CORRETTO**:
```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit
  
  const [listings, total] = await Promise.all([
    prisma.listingP2P.findMany({
      skip,
      take: limit,
    }),
    prisma.listingP2P.count(),
  ])
  
  return NextResponse.json({
    data: listings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  })
}
```

---

### 8. Query Parameters
- ✅ **SEMPRE** usa query params per filtri, search, sort
- ✅ **SEMPRE** documenta parametri disponibili
- ✅ **SEMPRE** valida parametri

**Esempio CORRETTO**:
```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const game = searchParams.get('game')
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const sort = searchParams.get('sort') || 'created_at'
  
  // Validate and build query
  const where: any = {}
  if (game) where.game = game
  if (minPrice) where.price = { gte: parseFloat(minPrice) }
  if (maxPrice) where.price = { ...where.price, lte: parseFloat(maxPrice) }
  
  // ... query
}
```

---

### 9. Rate Limiting (Futuro)
- ⏳ Implementare rate limiting per prevenire abuse
- ⏳ Limiti diversi per route pubbliche vs autenticate

---

## 🚫 Cose da NON Fare

1. ❌ **MAI** esporre errori interni (database, stack traces)
2. ❌ **MAI** ritornare password o dati sensibili
3. ❌ **MAI** fare query N+1 (usa `include` in Prisma)
4. ❌ **MAI** validare solo client-side (sempre server-side)
5. ❌ **MAI** usare GET per operazioni che modificano dati
6. ❌ **MAI** ignorare errori di autenticazione

---

## ✅ Checklist API Route

Prima di considerare completa una API route:
- [ ] Input validation con Zod
- [ ] Authentication verificata
- [ ] Authorization verificata (se necessario)
- [ ] Error handling completo
- [ ] Status codes corretti
- [ ] Response format consistente
- [ ] Testata manualmente
- [ ] Documentata (JSDoc o commenti)

