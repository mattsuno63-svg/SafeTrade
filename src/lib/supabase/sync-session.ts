/**
 * Utility to sync session from cookies to localStorage
 * This is needed because createBrowserClient can't read httpOnly cookies
 */

export async function syncSessionFromCookies() {
  try {
    // Call an API endpoint that returns the session
    // This will use server-side cookies
    const res = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    })

    if (!res.ok) {
      return null
    }

    const data = await res.json()
    
    if (data.session) {
      // Import client dynamically to avoid circular dependencies
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // Set session in browser client (saves to localStorage)
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

