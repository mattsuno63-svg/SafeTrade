import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[API /auth/logout] Supabase signOut error:', error)
      // Continue anyway to clear cookies
    }

    // Create response
    const response = NextResponse.json({ success: true })

    // CRITICAL: Clear all Supabase auth cookies
    // Supabase uses cookies with names like: sb-<project-ref>-auth-token
    const cookies = request.cookies.getAll()
    const supabaseCookies = cookies.filter(cookie => 
      cookie.name.includes('sb-') || 
      cookie.name.includes('supabase') ||
      cookie.name.includes('auth-token')
    )

    // Clear all Supabase cookies
    supabaseCookies.forEach(cookie => {
      response.cookies.delete(cookie.name)
      // Also try with different paths
      response.cookies.set(cookie.name, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    })

    // Also clear common cookie names
    const commonCookieNames = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase.auth.token',
    ]

    commonCookieNames.forEach(name => {
      response.cookies.delete(name)
      response.cookies.set(name, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    })

    if (process.env.NODE_ENV === 'development') console.log('[API /auth/logout] Cleared cookies:', supabaseCookies.map(c => c.name).join(', '))

    return response
  } catch (error) {
    console.error('[API /auth/logout] Error:', error)
    return handleApiError(error, 'auth-logout')
  }
}


