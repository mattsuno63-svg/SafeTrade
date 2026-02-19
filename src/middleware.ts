import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ────────────────────────────────────────────────────────────────
// CONFIG
// ────────────────────────────────────────────────────────────────

/** Page routes that require an authenticated session (redirect to /login) */
const PROTECTED_PAGES = ['/dashboard', '/admin', '/merchant', '/vault']

/** Auth pages — logged-in users get redirected to /dashboard */
const AUTH_PAGES = ['/login', '/signup']

/** API mutation routes exempt from CSRF origin check */
const CSRF_EXEMPT_API = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/callback',
  '/api/webhooks/stripe', // Stripe invia POST senza Origin (verifica tramite firma webhook)
]

/** HTTP methods that mutate state */
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// ────────────────────────────────────────────────────────────────
// SECURITY HEADERS
// ────────────────────────────────────────────────────────────────

function buildSecurityHeaders(isDev: boolean): Record<string, string> {
  const csp = [
    "default-src 'self'",
    // Next.js richiede unsafe-inline per script di hydration; unsafe-eval solo in dev (HMR)
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'",
    // Tailwind/styled-jsx usano inline styles
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Immagini: Supabase storage, Unsplash, Google, PokemonTCG, Cloudinary
    "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://img.freepik.com https://lh3.googleusercontent.com https://images.pokemontcg.io https://res.cloudinary.com",
    // Font
    "font-src 'self' data: https://fonts.gstatic.com",
    // Connect: Supabase REST + Realtime WS
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDev ? ' ws://localhost:* http://localhost:*' : ''}`,
    // Anti-clickjacking (CSP level)
    "frame-ancestors 'none'",
    // Previeni base-tag injection
    "base-uri 'self'",
    // Form action solo verso self
    "form-action 'self'",
    // Blocca plugin (Flash, Java, ecc.)
    "object-src 'none'",
    // In produzione forza HTTPS sulle risorse
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')

  return {
    'Content-Security-Policy': csp,
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'X-XSS-Protection': '1; mode=block',
    // HSTS solo in produzione
    ...(isDev
      ? {}
      : { 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload' }),
  }
}

// ────────────────────────────────────────────────────────────────
// CSRF HELPERS
// ────────────────────────────────────────────────────────────────

function getAllowedOrigins(request: NextRequest): string[] {
  const host = request.headers.get('host') || 'localhost:3000'
  const origins = [
    `https://${host}`,
    `http://${host}`,
  ]
  // Aggiungi APP_URL da env se configurato (utile per Vercel preview deploys)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    try {
      origins.push(new URL(appUrl).origin)
    } catch { /* ignore malformed URL */ }
  }
  return origins
}

/**
 * Valida Origin/Referer sulle richieste mutation verso /api/*.
 * - Se Origin è presente e non matcha → blocca (sicuro cross-origin attack)
 * - Se Origin assente, controlla Referer
 * - Se entrambi assenti → lascia passare (server-to-server, cron, API client)
 *   Gli handler autenticano comunque via Supabase token.
 */
function validateCsrf(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl

  // Solo su mutazioni API
  if (!pathname.startsWith('/api/') || !MUTATION_METHODS.has(request.method)) {
    return null // non serve check
  }

  // Rotte esenti (auth)
  if (CSRF_EXEMPT_API.some((r) => pathname.startsWith(r))) {
    return null
  }

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const allowed = getAllowedOrigins(request)

  if (origin) {
    if (!allowed.includes(origin)) {
      console.warn(`[CSRF] Blocked: origin "${origin}" not in allowed list`)
      return NextResponse.json(
        { error: 'Forbidden: origin not allowed' },
        { status: 403 },
      )
    }
    return null // origin valido
  }

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin
      if (!allowed.includes(refOrigin)) {
        console.warn(`[CSRF] Blocked: referer origin "${refOrigin}" not allowed`)
        return NextResponse.json(
          { error: 'Forbidden: referer not allowed' },
          { status: 403 },
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Forbidden: malformed referer' },
        { status: 403 },
      )
    }
  }

  // Né Origin né Referer → probabilmente server-to-server / cron
  // L'auth negli handler protegge comunque la richiesta
  return null
}

// ────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isDev = process.env.NODE_ENV === 'development'

  // ── 1. CSRF check (prima di tutto, evitiamo lavoro inutile se blocchiamo) ──
  const csrfBlock = validateCsrf(request)
  if (csrfBlock) {
    // Aggiungi security headers anche sulla risposta 403
    const headers = buildSecurityHeaders(isDev)
    for (const [k, v] of Object.entries(headers)) {
      csrfBlock.headers.set(k, v)
    }
    return csrfBlock
  }

  // ── 2. Supabase session refresh ──
  // Crea un server client che legge/scrive cookie dalla request/response.
  // getUser() valida il JWT con Supabase e fa refresh se scaduto.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieEncoding: 'base64url', // DEVE matchare client e server
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Aggiorna cookie sulla request (per i server component downstream)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          // Ricrea la response per propagare i cookie aggiornati
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              // Forza flag di sicurezza sui cookie di sessione
              httpOnly: true,
              secure: !isDev,
              sameSite: 'lax',
            }),
          )
        },
      },
    },
  )

  // Valida sessione (fa refresh token se access_token scaduto)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── 3. Route protection ──

  // Pagine protette → redirect a login se non autenticato
  const isProtectedPage = PROTECTED_PAGES.some((r) => pathname.startsWith(r))
  if (isProtectedPage && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)

    const redirectResponse = NextResponse.redirect(loginUrl)
    // Aggiungi header anche ai redirect
    const headers = buildSecurityHeaders(isDev)
    for (const [k, v] of Object.entries(headers)) {
      redirectResponse.headers.set(k, v)
    }
    return redirectResponse
  }

  // Utente loggato su pagine auth → redirect a dashboard
  if (user && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ── 4. Security headers su TUTTE le risposte ──
  const securityHeaders = buildSecurityHeaders(isDev)
  for (const [k, v] of Object.entries(securityHeaders)) {
    supabaseResponse.headers.set(k, v)
  }

  return supabaseResponse
}

// ────────────────────────────────────────────────────────────────
// MATCHER — tutto tranne static assets
// ────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Matcha TUTTE le rotte eccetto:
     * - _next/static  (file statici webpack)
     * - _next/image   (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - File statici per estensione
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.json|gsap/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|mp4|webm)$).*)',
  ],
}
