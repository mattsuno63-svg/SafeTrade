import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('[API /auth/me] Called, checking cookies...')
    const cookies = request.cookies.getAll()
    console.log('[API /auth/me] Cookies:', cookies.map(c => c.name).join(', '))
    
    const user = await getCurrentUser()
    
    console.log('[API /auth/me] User found:', !!user, user?.id || 'none')

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[API /auth/me] Error getting current user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


