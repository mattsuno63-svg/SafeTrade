import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Allow only same-origin paths for redirect (prevent open redirect). */
function safeRedirectPath(next: string | null, origin: string): string {
  const path = (next ?? '/dashboard').trim()
  if (!path.startsWith('/') || path.startsWith('//')) return '/dashboard'
  try {
    const u = new URL(path, origin)
    if (u.origin !== origin) return '/dashboard'
    return u.pathname + u.search
  } catch {
    return '/dashboard'
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const path = safeRedirectPath(next, requestUrl.origin)
      return NextResponse.redirect(new URL(path, requestUrl.origin))
    }

    console.error('OAuth callback error:', error)
  }

  // If something went wrong, redirect to login with error
  return NextResponse.redirect(
    new URL('/login?error=oauth_failed', requestUrl.origin)
  )
}

