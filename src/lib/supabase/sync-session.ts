/**
 * Utility to sync session from cookies to localStorage
 * This is needed because createBrowserClient can't read httpOnly cookies
 * @param supabaseClient - Optional; if provided, setSession is called on this instance (same client that has onAuthStateChange)
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export async function syncSessionFromCookies(supabaseClient?: SupabaseClient) {
  try {
    const res = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    })

    if (!res.ok) {
      return null
    }

    const data = await res.json()

    if (data.session) {
      const supabase = supabaseClient ?? (await import('@/lib/supabase/client')).createClient()

      const { error } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      if (error) {
        console.error('[syncSession] Error setting session:', error)
        return null
      }

      return data.session
    }

    return null
  } catch (error) {
    console.error('[syncSession] Error syncing session:', error)
    return null
  }
}

