import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'
import { checkRateLimit, RATE_LIMITS, getClientIp, getRateLimitKeyByIp, setRateLimitHeaders } from '@/lib/rate-limit'
import { logSecurityEvent } from '@/lib/security/audit'

export const dynamic = 'force-dynamic'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function POST(request: NextRequest) {
  let response = NextResponse.next({ request })
  const ip = getClientIp(request)

  try {
    // ── Rate limit per IP ──
    const rateLimitKey = getRateLimitKeyByIp(ip, 'LOGIN')
    const rateResult = await checkRateLimit(rateLimitKey, RATE_LIMITS.LOGIN)

    if (!rateResult.allowed) {
      await logSecurityEvent({
        eventType: 'RATE_LIMIT_EXCEEDED',
        endpoint: '/api/auth/login',
        method: 'POST',
        request,
        wasBlocked: true,
        reason: `Rate limit exceeded: ${RATE_LIMITS.LOGIN.maxRequests} attempts per ${RATE_LIMITS.LOGIN.windowMs / 60000} min`,
        severity: 'HIGH',
      })

      const res = NextResponse.json(
        { error: 'Troppi tentativi. Riprova tra qualche minuto.' },
        { status: 429 },
      )
      setRateLimitHeaders(res.headers, rateResult)
      return res
    }

    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieEncoding: 'base64url',
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response = NextResponse.next({ request })
              response.cookies.set(name, value, {
                ...options,
                httpOnly: options?.httpOnly ?? true,
                secure: options?.secure ?? (process.env.NODE_ENV === 'production'),
                sameSite: options?.sameSite ?? 'lax',
                path: options?.path ?? '/',
              })
            })
          },
        },
      },
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Messaggio GENERICO — non rivelare se l'email esiste o meno
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 },
      )
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'Errore durante il login' },
        { status: 500 },
      )
    }

    // Set session cookies
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    if (setSessionError) {
      return NextResponse.json(
        { error: 'Errore durante il login' },
        { status: 500 },
      )
    }

    const cookiesAfterSetSession = response.cookies.getAll()

    const jsonResponse = NextResponse.json({
      user: data.user,
      session: data.session,
    })

    // Copy cookies
    cookiesAfterSetSession.forEach((cookie) => {
      jsonResponse.cookies.set(cookie.name, cookie.value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    })

    setRateLimitHeaders(jsonResponse.headers, rateResult)
    return jsonResponse
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi' },
        { status: 400 },
      )
    }

    console.error('[API /auth/login] Error:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 },
    )
  }
}
