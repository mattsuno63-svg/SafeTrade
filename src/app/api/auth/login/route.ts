import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function POST(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // Create Supabase client with proper cookie handling for API routes
    // CRITICAL: Must use base64url encoding to match createBrowserClient
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieEncoding: 'base64url', // CRITICAL: Must match createBrowserClient encoding
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              // Create new response with updated cookies
              response = NextResponse.next({
                request,
              })
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
      }
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('[API /auth/login] Supabase signIn error:', error.message, error.status)
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'No session returned' },
        { status: 500 }
      )
    }

    // CRITICAL: Call setSession to force setAll() to be called
    // This ensures cookies are set correctly in API routes
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
    
    if (setSessionError) {
      return NextResponse.json(
        { error: 'Failed to set session' },
        { status: 500 }
      )
    }
    
    // Get cookies that were set by setAll()
    const cookiesAfterSetSession = response.cookies.getAll()
    
    console.log('[API /auth/login] Cookies set:', cookiesAfterSetSession.map(c => c.name).join(', '))
    
    // Create JSON response
    const jsonResponse = NextResponse.json({
      user: data.user,
      session: data.session,
    })

    // CRITICAL: Copy ALL cookies from response to jsonResponse
    // These cookies were set by setAll() when we called setSession()
    cookiesAfterSetSession.forEach((cookie) => {
      jsonResponse.cookies.set(cookie.name, cookie.value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      console.log(`[API /auth/login] Cookie set in response: ${cookie.name}`)
    })

    console.log('[API /auth/login] Response cookies count:', jsonResponse.cookies.getAll().length)

    return jsonResponse
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API /auth/login] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


