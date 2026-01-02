import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Successful OAuth login, redirect to dashboard or specified page
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
    
    console.error('OAuth callback error:', error)
  }

  // If something went wrong, redirect to login with error
  return NextResponse.redirect(
    new URL('/login?error=oauth_failed', requestUrl.origin)
  )
}

