import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS, getRateLimitKey, setRateLimitHeaders } from '@/lib/rate-limit'
import { handleApiError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/resend-verification
 * Resend email verification — rate limited
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    // ── Rate limit per utente ──
    const rateLimitKey = getRateLimitKey(user.id, 'RESEND_VERIFICATION')
    const rateResult = await checkRateLimit(rateLimitKey, RATE_LIMITS.RESEND_VERIFICATION)

    if (!rateResult.allowed) {
      const res = NextResponse.json(
        { error: 'Troppe richieste. Riprova più tardi.' },
        { status: 429 },
      )
      setRateLimitHeaders(res.headers, rateResult)
      return res
    }

    const supabase = await createClient()

    // Check if email is already verified
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (supabaseUser?.email_confirmed_at) {
      return NextResponse.json(
        { error: 'Email già verificata' },
        { status: 400 },
      )
    }

    // Resend verification email
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    })

    if (error) {
      console.error('[resend-verification] Supabase error:', error.message)
      return NextResponse.json(
        { error: 'Impossibile inviare l\'email di verifica' },
        { status: 500 },
      )
    }

    // Risposta GENERICA — non confermare se l'email esiste o meno
    const res = NextResponse.json({
      success: true,
      message: 'Se l\'indirizzo è valido, riceverai un\'email di verifica.',
    })
    setRateLimitHeaders(res.headers, rateResult)
    return res
  } catch (error: unknown) {
    return handleApiError(error, '/auth/resend-verification')
  }
}
