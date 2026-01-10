import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    // 1. Update Supabase session (refresh cookies)
    // This helps keep the user logged in across tabs/pages
    const supabaseResponse = await updateSession(request)

    // If updateSession returned a redirect (e.g. to /login), return it immediately
    if (supabaseResponse.headers.get('location')) {
      return supabaseResponse
    }

    const hostname = request.headers.get('host') || ''

    // Check if it's a subdomain request (e.g., nomenegozio.safetrade.com)
    // In development, it might be localhost:3001, so we check for subdomain pattern
    const subdomain = hostname.split('.')[0]

    // Skip if it's the main domain, localhost, or Vercel domain
    if (
      hostname.includes('localhost') ||
      hostname.includes('127.0.0.1') ||
      hostname.includes('vercel.app') ||
      hostname === 'safetrade.com' ||
      hostname === 'www.safetrade.com' ||
      subdomain === 'www' ||
      subdomain === 'safetrade' ||
      subdomain === 'safe-trade'
    ) {
      return supabaseResponse
    }

    // If it's a subdomain, redirect to the shop page
    // Format: nomenegozio.safetrade.com -> /shops/nomenegozio
    const url = request.nextUrl.clone()
    url.pathname = `/shops/${subdomain}`

    const rewriteResponse = NextResponse.rewrite(url)

    // CRITICAL: Copy cookies from supabaseResponse to the new rewrite response
    // otherwise the session refresh is lost!
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      rewriteResponse.cookies.set(cookie.name, cookie.value, cookie)
    })

    return rewriteResponse
  } catch (error) {
    // If middleware fails, still allow the request to proceed
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
