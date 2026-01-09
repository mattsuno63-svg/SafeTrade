import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      return NextResponse.json(
        { session: null },
        { status: 200 }
      )
    }

    // Return session with tokens (needed for setSession in browser)
    return NextResponse.json({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
      },
    })
  } catch (error) {
    console.error('[API /auth/session] Error:', error)
    return NextResponse.json(
      { session: null },
      { status: 200 }
    )
  }
}


