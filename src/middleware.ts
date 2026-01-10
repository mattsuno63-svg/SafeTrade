import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Minimal middleware - just pass through for now
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only match dashboard routes for auth protection
    '/dashboard/:path*',
  ],
}
